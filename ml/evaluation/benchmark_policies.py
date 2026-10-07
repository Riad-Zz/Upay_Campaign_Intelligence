"""
benchmark_policies.py
=====================
Phase 2 — Benchmark Against Conventional Marketing.

Compares four customer targeting strategies under identical constraints:
  1. Policy A — Random Targeting
  2. Policy B — Propensity Targeting
  3. Policy C — Fixed Incentive (Volume/Activity) Targeting
  4. Policy D — Uplift Targeting

CONTROLLED BENCHMARK DESIGN
---------------------------
- Same held-out test population: Weeks 48–52 (no training leakage)
- Same eligible customer pool: after fatigue suppression & dormancy filtering
- Same campaign budget: e.g. ৳50,000 BDT
- Same fixed incentive: e.g. ৳30 BDT per targeted customer
- Same target count: K = floor(budget / fixed_incentive) = 1,666 customers
- Same cost and GMV assumptions

The only differentiator is the customer prioritization/ranking strategy.

OUTPUTS
-------
  data/policy_benchmark.json
"""

import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import json
import math
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

# Path setup
ML_DIR   = Path(__file__).parent.parent
ROOT_DIR = ML_DIR.parent
DATA_DIR = ROOT_DIR / "data"

sys.path.insert(0, str(ML_DIR))
sys.path.insert(0, str(ML_DIR / "evaluation"))

from experiment_config import CONFIG
from evaluation.temporal_split import make_temporal_splits
from evaluation.evaluate_uplift import (
    build_feature_matrix,
    train_s_learner,
    recover_ground_truth_ite,
    ALL_FEATURES,
)

MODEL_CACHE_PATH = DATA_DIR / "s_learner_eval_model.joblib"
BENCHMARK_REPORT_PATH = DATA_DIR / "policy_benchmark.json"

# MDR platform commission fraction
MDR = 0.015


# ─────────────────────────────────────────────────────────────────────────────
# 1. Model Loading / Training
# ─────────────────────────────────────────────────────────────────────────────
def get_evaluation_model(train_df: pd.DataFrame, force_retrain: bool = False):
    """Load cached S-Learner or fit deterministically on train split."""
    if MODEL_CACHE_PATH.exists() and not force_retrain:
        try:
            model = joblib.load(MODEL_CACHE_PATH)
            return model
        except Exception:
            pass

    print("[benchmark] Training S-Learner on train split...")
    model = train_s_learner(train_df)
    try:
        joblib.dump(model, MODEL_CACHE_PATH)
    except Exception:
        pass
    return model


# ─────────────────────────────────────────────────────────────────────────────
# 2. Eligibility & Fatigue Rules
# ─────────────────────────────────────────────────────────────────────────────
def evaluate_customer_fatigue(row: pd.Series) -> Tuple[bool, Optional[str]]:
    """
    Standard fatigue suppression rules matching backend fatigueService.js:
      - Hard cap: >= 3 campaigns received in last 90d
      - Unresponsive: >= 2 campaigns received with 0 responses
      - Spacing: < 7 days since previous campaign and received > 0
    """
    recv = int(row.get("campaign_received_last_90d", 0))
    resp = int(row.get("campaign_responded_last_90d", 0))
    days = int(row.get("days_since_prev_campaign", 90))

    if recv >= 3:
        return True, "hard_cap"
    if recv >= 2 and resp == 0:
        return True, "unresponsive"
    if days < 7 and recv > 0:
        return True, "spacing"
    return False, None


def get_eligible_test_cohort(
    customers_df: pd.DataFrame,
    test_hist_df: pd.DataFrame,
) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """
    Extract eligible unique customers from the held-out test period (Weeks 48–52).
    Applies dormancy and fatigue suppression rules identically across all policies.
    """
    test_cust_ids = set(test_hist_df["customer_id"].unique())
    test_custs = customers_df[customers_df["customer_id"].isin(test_cust_ids)].copy()

    total_test_custs = len(test_custs)

    # Exclude dormant customers
    non_dormant = test_custs[~test_custs["is_dormant"]].copy()
    dormant_count = total_test_custs - len(non_dormant)

    # Filter by fatigue
    fatigue_results = non_dormant.apply(evaluate_customer_fatigue, axis=1)
    non_dormant["is_fatigued"] = [r[0] for r in fatigue_results]
    non_dormant["fatigue_reason"] = [r[1] for r in fatigue_results]

    eligible = non_dormant[~non_dormant["is_fatigued"]].copy()
    fatigued_count = int(non_dormant["is_fatigued"].sum())

    stats = {
        "total_test_customers": total_test_custs,
        "dormant_suppressed": dormant_count,
        "fatigue_suppressed": fatigued_count,
        "eligible_customers": len(eligible),
    }

    return eligible, stats


# ─────────────────────────────────────────────────────────────────────────────
# 3. Customer Scoring on Target Campaign
# ─────────────────────────────────────────────────────────────────────────────
def score_eligible_customers(
    eligible_df: pd.DataFrame,
    model,
    campaign_type: str = "recharge",
    offer_value_bdt: float = 30.0,
) -> pd.DataFrame:
    """
    Compute propensity, baseline probability, and predicted uplift for
    eligible customers under the specified campaign type and fixed incentive.
    """
    camp_type_enc = CONFIG["campaign_types"].index(campaign_type)

    eval_rows = eligible_df.copy()
    eval_rows["campaign_type_enc"] = camp_type_enc
    eval_rows["offer_value_bdt"]    = float(offer_value_bdt)
    eval_rows["was_treated"]        = 1.0
    eval_rows["fatigue_level"]      = eval_rows["campaign_received_last_90d"].clip(0, 5)

    X = eval_rows[ALL_FEATURES].values.astype(float)
    t_idx = ALL_FEATURES.index("was_treated")

    X_t1 = X.copy()
    X_t1[:, t_idx] = 1.0

    X_t0 = X.copy()
    X_t0[:, t_idx] = 0.0

    p_t1 = model.predict_proba(X_t1)[:, 1]
    p_t0 = model.predict_proba(X_t0)[:, 1]

    scored = eligible_df.copy()
    scored["pred_treatment_prob"] = p_t1
    scored["pred_control_prob"]   = p_t0
    scored["pred_uplift"]         = p_t1 - p_t0
    scored["avg_txn_value_bdt"]   = (
        scored["avg_monthly_gmv_bdt"] / scored["avg_monthly_txn_count"].clip(lower=1)
    )

    return scored


# ─────────────────────────────────────────────────────────────────────────────
# 4. Policy Implementations
# ─────────────────────────────────────────────────────────────────────────────
def run_random_policy(scored_df: pd.DataFrame, k: int, seed: int = 42) -> pd.DataFrame:
    """Policy A: Random targeting with deterministic seed."""
    rng = np.random.default_rng(seed)
    selected_idx = rng.choice(len(scored_df), size=min(k, len(scored_df)), replace=False)
    return scored_df.iloc[selected_idx].copy()


def run_propensity_policy(scored_df: pd.DataFrame, k: int) -> pd.DataFrame:
    """Policy B: Conventional propensity targeting (rank by P(Y=1|X, T=1) desc)."""
    return scored_df.sort_values(by="pred_treatment_prob", ascending=False).iloc[:k].copy()


def run_fixed_incentive_policy(scored_df: pd.DataFrame, k: int) -> pd.DataFrame:
    """
    Policy C: Conventional volume/activity heuristic targeting.
    Ranks customers by historical monthly GMV / account volume descending.
    """
    return scored_df.sort_values(by="avg_monthly_gmv_bdt", ascending=False).iloc[:k].copy()


def run_uplift_policy(scored_df: pd.DataFrame, k: int) -> pd.DataFrame:
    """Policy D: Uplift targeting (rank by predicted incremental treatment effect desc)."""
    return scored_df.sort_values(by="pred_uplift", ascending=False).iloc[:k].copy()


# ─────────────────────────────────────────────────────────────────────────────
# 5. Policy Metric Computation
# ─────────────────────────────────────────────────────────────────────────────
def evaluate_policy_cohort(
    targeted_df: pd.DataFrame,
    eligible_count: int,
    campaign_budget: float,
    fixed_incentive: float,
    policy_name: str,
    description: str,
    ranking_criterion: str,
    fatigue_suppressed_count: int,
) -> Dict[str, Any]:
    """Calculate comprehensive business, causal, and waste metrics for a policy cohort."""
    k = len(targeted_df)
    campaign_cost = k * fixed_incentive
    budget_remaining = campaign_budget - campaign_cost

    # Predictions
    mean_treatment_prob = float(targeted_df["pred_treatment_prob"].mean())
    mean_control_prob   = float(targeted_df["pred_control_prob"].mean())
    mean_uplift         = float(targeted_df["pred_uplift"].mean())
    pred_incr_txns      = float(targeted_df["pred_uplift"].sum())

    # Synthetic ground-truth ITE (if available)
    has_ite = "true_ite" in targeted_df.columns
    mean_true_ite  = float(targeted_df["true_ite"].mean()) if has_ite else None
    true_incr_txns = float(targeted_df["true_ite"].sum())  if has_ite else None

    # Financials
    avg_txn_val = float(targeted_df["avg_txn_value_bdt"].mean())
    incr_gmv    = pred_incr_txns * avg_txn_val
    net_revenue = incr_gmv * MDR
    net_value   = incr_gmv - campaign_cost
    gmv_mult    = (incr_gmv / campaign_cost) if campaign_cost > 0 else 0.0
    cost_per_txn= (campaign_cost / pred_incr_txns) if pred_incr_txns > 0 else 0.0

    # Sure-Thing Waste: high baseline (>65%) and low uplift (<3%)
    sure_things = targeted_df[
        (targeted_df["pred_control_prob"] > 0.65) & (targeted_df["pred_uplift"] < 0.03)
    ]
    sure_thing_count = len(sure_things)
    sure_thing_spend = sure_thing_count * fixed_incentive
    sure_thing_pct   = (sure_thing_count / k * 100.0) if k > 0 else 0.0

    # Incentive Waste: non-positive or negligible uplift (<= 0 or < 0.03)
    zero_or_neg = targeted_df[targeted_df["pred_uplift"] <= 0]
    negligible  = targeted_df[targeted_df["pred_uplift"] < 0.03]
    waste_count = len(negligible)
    waste_spend = waste_count * fixed_incentive
    waste_pct   = (waste_count / k * 100.0) if k > 0 else 0.0
    dnd_count   = len(targeted_df[targeted_df["pred_uplift"] < 0])

    # Fatigue exposure among targets
    fatigue_risk = len(targeted_df[targeted_df["campaign_received_last_90d"] == 2])
    high_freq    = len(targeted_df[targeted_df["avg_monthly_txn_count"] > 20])

    return {
        "policy_name":               policy_name,
        "description":               description,
        "ranking_criterion":         ranking_criterion,
        "eligible_customers":        eligible_count,
        "targeted_customers":        k,
        "targeting_rate":            round(k / eligible_count, 4) if eligible_count > 0 else 0.0,
        "fixed_incentive_bdt":       fixed_incentive,
        "incentive_cost_bdt":        round(campaign_cost, 2),
        "campaign_budget_bdt":       campaign_budget,
        "budget_utilized_bdt":       round(campaign_cost, 2),
        "budget_remaining_bdt":      round(budget_remaining, 2),

        # Probabilities & Causal Lift
        "mean_treatment_probability": round(mean_treatment_prob, 4),
        "mean_baseline_probability":  round(mean_control_prob, 4),
        "mean_predicted_uplift":      round(mean_uplift, 4),
        "incremental_transactions":   round(pred_incr_txns, 1),
        "mean_ground_truth_ite":      round(mean_true_ite, 4) if mean_true_ite is not None else None,
        "ground_truth_incremental_txns": round(true_incr_txns, 1) if true_incr_txns is not None else None,

        # Financial Business Metrics
        "avg_transaction_value_bdt":  round(avg_txn_val, 2),
        "incremental_gmv_bdt":        round(incr_gmv, 2),
        "net_incremental_revenue_bdt": round(net_revenue, 2),
        "net_incremental_value_bdt":  round(net_value, 2),
        "gmv_multiplier":             round(gmv_mult, 2),
        "cost_per_incremental_txn_bdt": round(cost_per_txn, 2),

        # Organic Conversion & Waste
        "sure_thing_targets":         sure_thing_count,
        "sure_thing_spend_bdt":       round(sure_thing_spend, 2),
        "sure_thing_percentage":      round(sure_thing_pct, 2),
        "incentive_waste_targets":    waste_count,
        "incentive_waste_spend_bdt":  round(waste_spend, 2),
        "incentive_waste_percentage": round(waste_pct, 2),
        "do_not_disturb_targets":     dnd_count,

        # Fatigue & Exposure
        "fatigue_risk_targets":       fatigue_risk,
        "high_frequency_targets":     high_freq,
        "fatigue_suppressed_customers": fatigue_suppressed_count,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. Policy Comparisons
# ─────────────────────────────────────────────────────────────────────────────
def compute_comparisons(policies: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Compute relative performance lifts of Uplift targeting over baselines."""
    uplift = policies["uplift"]

    def _compare(base_key: str) -> Dict[str, Any]:
        base = policies[base_key]
        u_txns = uplift["incremental_transactions"]
        b_txns = base["incremental_transactions"]
        u_gmv  = uplift["incremental_gmv_bdt"]
        b_gmv  = base["incremental_gmv_bdt"]
        u_cpt  = uplift["cost_per_incremental_txn_bdt"]
        b_cpt  = base["cost_per_incremental_txn_bdt"]

        txn_lift = round(((u_txns - b_txns) / b_txns * 100.0), 2) if b_txns > 0 else 0.0
        gmv_lift = round(((u_gmv - b_gmv) / b_gmv * 100.0), 2) if b_gmv > 0 else 0.0
        eff_lift = round(((b_cpt - u_cpt) / b_cpt * 100.0), 2) if b_cpt > 0 else 0.0

        st_reduction = round(base["sure_thing_spend_bdt"] - uplift["sure_thing_spend_bdt"], 2)
        waste_reduction = round(base["incentive_waste_spend_bdt"] - uplift["incentive_waste_spend_bdt"], 2)

        u_true = uplift["ground_truth_incremental_txns"]
        b_true = base["ground_truth_incremental_txns"]
        true_lift = (
            round(((u_true - b_true) / b_true * 100.0), 2)
            if (u_true and b_true and b_true > 0) else None
        )

        return {
            "incremental_transaction_lift_pct": txn_lift,
            "ground_truth_transaction_lift_pct": true_lift,
            "incremental_gmv_lift_pct":          gmv_lift,
            "cost_efficiency_improvement_pct":   eff_lift,
            "sure_thing_spend_reduction_bdt":    st_reduction,
            "sure_thing_percentage_diff":        round(uplift["sure_thing_percentage"] - base["sure_thing_percentage"], 2),
            "incentive_waste_reduction_bdt":     waste_reduction,
        }

    return {
        "uplift_vs_propensity":      _compare("propensity"),
        "uplift_vs_random":          _compare("random"),
        "uplift_vs_fixed_incentive": _compare("fixed_incentive"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 7. Main Benchmark Orchestrator
# ─────────────────────────────────────────────────────────────────────────────
def run_benchmark(
    campaign_budget: float = 50000.0,
    fixed_incentive: float = 30.0,
    campaign_type: str = "recharge",
    random_seed: int = 42,
    model_seed: int = 42,
    force_retrain: bool = False,
    output_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Run the complete Phase 2 conventional marketing benchmark."""
    print("=" * 65)
    print("Upay Campaign Intelligence — Phase 2 Policy Benchmark")
    print("=" * 65)
    print(f"Campaign Type:     {campaign_type.capitalize()}")
    print(f"Campaign Budget:   BDT {campaign_budget:,.2f}")
    print(f"Fixed Incentive:   BDT {fixed_incentive:,.2f} per targeted customer")
    print(f"Target Count:      {math.floor(campaign_budget / fixed_incentive):,} customers")
    print(f"Random Seed:       {random_seed}")
    print(f"Model Seed:        {model_seed}")
    print()

    # Load data
    with open(DATA_DIR / "customers.json") as f:
        customers = pd.DataFrame(json.load(f))
    with open(DATA_DIR / "campaign_history.json") as f:
        history = pd.DataFrame(json.load(f))

    # Split: Train (Weeks 1-39), Val (40-47), Test (48-52)
    train_hist, val_hist, test_hist = make_temporal_splits(
        history, config=CONFIG, strict_customer_split=False
    )
    train_df = build_feature_matrix(train_hist, customers)

    # Get model (from cache or train)
    model = get_evaluation_model(train_df, force_retrain=force_retrain)

    # Extract held-out test eligible cohort
    eligible_df, elig_stats = get_eligible_test_cohort(customers, test_hist)
    print(f"[benchmark] Test period unique customers: {elig_stats['total_test_customers']:,}")
    print(f"            - Dormant suppressed:         {elig_stats['dormant_suppressed']:,}")
    print(f"            - Fatigue suppressed:         {elig_stats['fatigue_suppressed']:,}")
    print(f"            = Common eligible population: {elig_stats['eligible_customers']:,}")

    # Score eligible population
    scored_df = score_eligible_customers(
        eligible_df, model, campaign_type=campaign_type, offer_value_bdt=fixed_incentive
    )

    # Attach synthetic ground truth ITE
    try:
        ite_df = recover_ground_truth_ite(customers)
        te_col = f"_te_{campaign_type}"
        scored_df = scored_df.merge(
            ite_df[["customer_id", te_col]], on="customer_id", how="left"
        )
        scored_df["true_ite"] = scored_df[te_col]
    except Exception as e:
        print(f"[benchmark] Warning: ground-truth ITE recovery skipped: {e}")

    k = math.floor(campaign_budget / fixed_incentive)

    # Run policies
    print(f"\n[benchmark] Running 4 policies on common eligible pool (K={k})...")
    pol_random = run_random_policy(scored_df, k, seed=random_seed)
    pol_prop   = run_propensity_policy(scored_df, k)
    pol_fixed  = run_fixed_incentive_policy(scored_df, k)
    pol_uplift = run_uplift_policy(scored_df, k)

    fatigue_supp_count = elig_stats["fatigue_suppressed"]

    # Evaluate policies
    policies_eval = {
        "random": evaluate_policy_cohort(
            pol_random, len(eligible_df), campaign_budget, fixed_incentive,
            policy_name="Random Targeting",
            description="Uniform random selection of eligible customers",
            ranking_criterion="random_uniform",
            fatigue_suppressed_count=fatigue_supp_count,
        ),
        "propensity": evaluate_policy_cohort(
            pol_prop, len(eligible_df), campaign_budget, fixed_incentive,
            policy_name="Propensity Targeting",
            description="Prioritizes customers most likely to convert under treatment",
            ranking_criterion="pred_treatment_prob_desc",
            fatigue_suppressed_count=fatigue_supp_count,
        ),
        "fixed_incentive": evaluate_policy_cohort(
            pol_fixed, len(eligible_df), campaign_budget, fixed_incentive,
            policy_name="Fixed Incentive (Activity Heuristic)",
            description="Traditional marketing rule: rewards highest-spending customers with flat incentive",
            ranking_criterion="avg_monthly_gmv_bdt_desc",
            fatigue_suppressed_count=fatigue_supp_count,
        ),
        "uplift": evaluate_policy_cohort(
            pol_uplift, len(eligible_df), campaign_budget, fixed_incentive,
            policy_name="Uplift Targeting",
            description="Prioritizes persuadable customers with highest incremental treatment effect",
            ranking_criterion="pred_uplift_desc",
            fatigue_suppressed_count=fatigue_supp_count,
        ),
    }

    # Comparisons
    comparisons = compute_comparisons(policies_eval)

    # Print summary table
    print("\n" + "=" * 80)
    print(f"{'Metric':<32} {'Random':>11} {'Propensity':>12} {'Fixed Inc':>11} {'Uplift':>11}")
    print("-" * 80)
    metrics_display = [
        ("Targeted Customers", "targeted_customers", "{:>11,d}"),
        ("Incentive Cost (BDT)", "incentive_cost_bdt", "{:>11,.0f}"),
        ("Conversion Prob (T=1)", "mean_treatment_probability", "{:>11.2%}"),
        ("Baseline Prob (T=0)", "mean_baseline_probability", "{:>11.2%}"),
        ("Mean Predicted Uplift", "mean_predicted_uplift", "{:>11.4f}"),
        ("Incr. Transactions", "incremental_transactions", "{:>11.1f}"),
        ("True Incr. Txns (ITE)", "ground_truth_incremental_txns", "{:>11.1f}"),
        ("Incr. GMV (BDT)", "incremental_gmv_bdt", "{:>11,.0f}"),
        ("Net Incr. Value (BDT)", "net_incremental_value_bdt", "{:>11,.0f}"),
        ("GMV Multiplier", "gmv_multiplier", "{:>11.2f}"),
        ("Cost / Incr. Txn (BDT)", "cost_per_incremental_txn_bdt", "{:>11.1f}"),
        ("Sure-Thing Targets", "sure_thing_targets", "{:>11,d}"),
        ("Sure-Thing Spend (BDT)", "sure_thing_spend_bdt", "{:>11,.0f}"),
        ("Sure-Thing %", "sure_thing_percentage", "{:>11.1f}%"),
        ("Fatigue Risk Targets", "fatigue_risk_targets", "{:>11,d}"),
    ]

    for label, key, fmt in metrics_display:
        r_val = fmt.format(policies_eval["random"][key])
        p_val = fmt.format(policies_eval["propensity"][key])
        f_val = fmt.format(policies_eval["fixed_incentive"][key])
        u_val = fmt.format(policies_eval["uplift"][key])
        print(f"{label:<32} {r_val} {p_val} {f_val} {u_val}")
    print("=" * 80)

    # Print Uplift vs Propensity headline
    uvp = comparisons["uplift_vs_propensity"]
    print("\n[KEY TAKEAWAY] Uplift vs. Conventional Propensity Targeting:")
    print(f"  * Incremental Transactions : {policies_eval['uplift']['incremental_transactions']:.1f} vs {policies_eval['propensity']['incremental_transactions']:.1f} ({uvp['incremental_transaction_lift_pct']:+.1f}% lift)")
    print(f"  * Ground-Truth True Lift   : {policies_eval['uplift']['ground_truth_incremental_txns']:.1f} vs {policies_eval['propensity']['ground_truth_incremental_txns']:.1f} ({uvp['ground_truth_transaction_lift_pct']:+.1f}% lift)")
    print(f"  * Incremental GMV          : BDT {policies_eval['uplift']['incremental_gmv_bdt']:,.0f} vs BDT {policies_eval['propensity']['incremental_gmv_bdt']:,.0f} ({uvp['incremental_gmv_lift_pct']:+.1f}% lift)")
    print(f"  * Cost per Incr. Txn       : BDT {policies_eval['uplift']['cost_per_incremental_txn_bdt']:.1f} vs BDT {policies_eval['propensity']['cost_per_incremental_txn_bdt']:.1f} ({uvp['cost_efficiency_improvement_pct']:+.1f}% more cost-efficient)")
    print(f"  * Sure-Thing Spend Wasted  : BDT {policies_eval['uplift']['sure_thing_spend_bdt']:,.0f} (0.0%) vs BDT {policies_eval['propensity']['sure_thing_spend_bdt']:,.0f} ({policies_eval['propensity']['sure_thing_percentage']:.1f}%) -- saved BDT {uvp['sure_thing_spend_reduction_bdt']:,.0f}")

    report = {
        "experiment": {
            "random_seed":       random_seed,
            "model_seed":        model_seed,
            "test_period":       CONFIG["split"]["test_label"],
            "campaign_type":     campaign_type,
            "campaign_budget":   campaign_budget,
            "fixed_incentive":   fixed_incentive,
            "max_targets":       k,
            "eligible_customers": elig_stats["eligible_customers"],
            "dormant_suppressed": elig_stats["dormant_suppressed"],
            "fatigue_suppressed": elig_stats["fatigue_suppressed"],
            "total_test_customers": elig_stats["total_test_customers"],
            "description": (
                "Controlled benchmark evaluating 4 targeting policies under identical budget, "
                "fixed incentive, and fatigue constraints on the held-out test cohort."
            ),
        },
        "policies": policies_eval,
        "comparison": comparisons,
    }

    out_file = output_path or BENCHMARK_REPORT_PATH
    with open(out_file, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[benchmark] Benchmark report written to: {out_file}")

    return report


if __name__ == "__main__":
    run_benchmark()
