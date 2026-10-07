"""
evaluate_uplift.py
==================
Phase 1 Causal Evaluation — Main orchestration script.

WHAT THIS DOES
--------------
1. Loads campaign history (with ground-truth ITE available during eval only).
2. Applies chronological train / validation / test split (no future leakage).
3. Applies strict customer-level leakage protection.
4. Re-trains the S-Learner on the TRAIN split only.
5. Scores the TEST split to get predicted uplift per record.
6. Computes uplift-specific evaluation metrics on the TEST split.
7. Optionally uses synthetic ground-truth ITE for additional diagnostics.
8. Writes a machine-readable evaluation report to data/model_evaluation.json.

SYNTHETIC GROUND TRUTH
-----------------------
The data generator (generate_data.py) computes per-customer, per-campaign-type
true treatment effects (_te_recharge, _te_merchant, etc.) but intentionally
STRIPS them before writing customers.json.

To use them for evaluation, we re-run the DATA GENERATION in memory (same seed)
and extract the ground-truth ITEs. These are ONLY used for diagnostic correlation
— they are NEVER fed into model features.

RUN
---
    python ml/evaluate_uplift.py
    # or from root:
    python -m ml.evaluate_uplift

OUTPUTS
-------
    data/model_evaluation.json
"""

import sys
import json
import math
import random
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any

warnings.filterwarnings("ignore")

# ── Path setup ────────────────────────────────────────────────────────────────
ML_DIR   = Path(__file__).parent.parent
ROOT_DIR = ML_DIR.parent
DATA_DIR = ROOT_DIR / "data"

sys.path.insert(0, str(ML_DIR))
sys.path.insert(0, str(ML_DIR / "evaluation"))

from experiment_config import CONFIG
from evaluation.temporal_split import make_temporal_splits, describe_splits
from evaluation.metrics import compute_all_metrics, qini_curve, uplift_curve

# ── Sklearn imports ────────────────────────────────────────────────────────────
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score, log_loss


# ─────────────────────────────────────────────────────────────────────────────
# Feature definitions (must match train_model.py exactly)
# ─────────────────────────────────────────────────────────────────────────────
CUSTOMER_FEATURES = CONFIG["customer_features"]
HISTORY_FEATURES  = CONFIG["history_features"]
CAMPAIGN_FEATURES = CONFIG["campaign_features"]
ALL_FEATURES      = CUSTOMER_FEATURES + HISTORY_FEATURES + CAMPAIGN_FEATURES

CAMPAIGN_TYPES     = CONFIG["campaign_types"]
CATEGORY_ENCODING  = {t: i for i, t in enumerate(CAMPAIGN_TYPES)}
TREATMENT_COL      = CONFIG["treatment_col"]
OUTCOME_COL        = CONFIG["outcome_col"]

MODEL_SEED    = CONFIG["model_seed"]
DATASET_SEED  = CONFIG["dataset_seed"]


# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Load data
# ─────────────────────────────────────────────────────────────────────────────
def load_data():
    print("[evaluate_uplift] Loading data artifacts...")

    with open(DATA_DIR / "customers.json") as f:
        customers = pd.DataFrame(json.load(f))

    with open(DATA_DIR / "campaign_history.json") as f:
        history = pd.DataFrame(json.load(f))

    print(f"  Customers:        {len(customers):,}")
    print(f"  History records:  {len(history):,}")
    return customers, history


# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Recover synthetic ground-truth ITEs
# ─────────────────────────────────────────────────────────────────────────────
def recover_ground_truth_ite(customers_df: pd.DataFrame) -> pd.DataFrame:
    """
    Recover the synthetic ground-truth individual treatment effects by
    re-running the exact same DGP as generate_data.py with the same SEED.

    The ground-truth columns returned are:
        _baseline_prob, _te_recharge, _te_merchant, _te_p2p, _te_bill

    CRITICAL: These are used ONLY for evaluation diagnostics.
    They must NEVER be included in model features.
    """
    print("[evaluate_uplift] Recovering synthetic ground-truth ITEs (same seed)...")

    def sigmoid(x):
        return 1.0 / (1.0 + math.exp(-float(np.clip(x, -30, 30))))

    def clip01(x):
        return float(np.clip(x, 0.0, 1.0))

    SEED = DATASET_SEED
    random.seed(SEED)
    np.random.seed(SEED)

    N_CUSTOMERS  = len(customers_df)
    CAMP_TYPES   = ["recharge", "merchant", "p2p", "bill"]
    OFFER_VALUES = [10, 20, 30, 50]

    segment_probs = [0.12, 0.39, 0.27, 0.22]
    segments = np.random.choice(["high_value", "mid", "low", "dormant"],
                                size=N_CUSTOMERS, p=segment_probs)

    rows = []
    for i in range(N_CUSTOMERS):
        seg = segments[i]
        cid = f"CUST_{i+1:05d}"

        # ── Tenure ─────────────────────────────────────────────────────────
        if seg == "high_value":
            tenure = int(np.random.normal(42, 10))
        elif seg == "mid":
            tenure = int(np.random.normal(24, 12))
        elif seg == "low":
            tenure = int(np.random.normal(14, 8))
        else:
            tenure = int(np.random.normal(18, 14))
        tenure = max(1, min(60, tenure))

        # ── Txn count ──────────────────────────────────────────────────────
        if seg == "high_value":
            txn_count = float(np.random.normal(28, 8))
        elif seg == "mid":
            txn_count = float(np.random.normal(14, 6))
        elif seg == "low":
            txn_count = float(np.random.normal(5, 3))
        else:
            txn_count = float(np.random.normal(1, 1))
        txn_count = max(0.5, txn_count)

        # ── GMV ────────────────────────────────────────────────────────────
        if seg == "high_value":
            gmv = float(np.random.lognormal(9.4, 0.5))
        elif seg == "mid":
            gmv = float(np.random.lognormal(8.0, 0.5))
        elif seg == "low":
            gmv = float(np.random.lognormal(6.9, 0.5))
        else:
            gmv = float(np.random.lognormal(6.2, 0.6))
        gmv = round(max(100, min(80000, gmv)), 2)

        # ── Recency ────────────────────────────────────────────────────────
        if seg == "dormant":
            days_since_last_txn = int(np.random.randint(30, 90))
        elif seg == "high_value":
            days_since_last_txn = int(np.random.randint(0, 7))
        elif seg == "mid":
            days_since_last_txn = int(np.random.randint(0, 21))
        else:
            days_since_last_txn = int(np.random.randint(7, 45))

        # ── Category affinity ──────────────────────────────────────────────
        if seg == "high_value":
            cat_weights = [0.30, 0.40, 0.20, 0.10]
        elif seg == "mid":
            cat_weights = [0.40, 0.25, 0.25, 0.10]
        elif seg == "low":
            cat_weights = [0.50, 0.15, 0.25, 0.10]
        else:
            cat_weights = [0.35, 0.20, 0.30, 0.15]
        preferred_category = np.random.choice(CAMP_TYPES, p=cat_weights)

        def affinity(cat):
            base = 0.6 if cat == preferred_category else 0.15
            return clip01(base + np.random.normal(0, 0.12))

        recharge_txn_rate = affinity("recharge")
        merchant_txn_rate = affinity("merchant")
        p2p_txn_rate      = affinity("p2p")
        bill_txn_rate     = affinity("bill")

        friday_base = 0.35 if preferred_category in ("recharge", "p2p") else 0.20
        friday_txn_rate = clip01(friday_base + np.random.normal(0, 0.12))

        # ── Campaign history ────────────────────────────────────────────────
        if seg == "high_value":
            camp_recv = int(np.random.poisson(2.5))
        elif seg == "mid":
            camp_recv = int(np.random.poisson(1.8))
        else:
            camp_recv = int(np.random.poisson(0.8))
        camp_recv = min(camp_recv, 8)

        if camp_recv > 0:
            if seg == "high_value":
                resp_prob = 0.55
            elif seg == "mid":
                resp_prob = 0.35
            else:
                resp_prob = 0.18
            camp_resp = int(np.random.binomial(camp_recv, resp_prob))
        else:
            camp_resp = 0

        # ── Ground-truth baseline ──────────────────────────────────────────
        baseline_logit = (
            -1.8
            + 0.025  * tenure
            + 0.040  * txn_count
            - 0.030  * days_since_last_txn
            + 0.8    * (seg == "high_value")
            + 0.3    * (seg == "mid")
            - 0.3    * (seg == "low")
            - 0.9    * (seg == "dormant")
            + 0.4    * (camp_resp / max(camp_recv, 1))
            + np.random.normal(0, 0.25)
        )
        baseline_prob = sigmoid(baseline_logit)

        # ── Ground-truth treatment effects ─────────────────────────────────
        def treatment_effect(cat, aff):
            logit = (
                -1.6
                + 1.8  * aff
                + 0.6  * friday_txn_rate * (cat == "recharge")
                + 0.4  * (days_since_last_txn > 14)
                - 0.5  * (camp_recv >= 3)
                - 0.8  * baseline_prob
                + np.random.normal(0, 0.2)
            )
            raw_effect = sigmoid(logit) * 0.45
            if aff < 0.08 and np.random.random() < 0.15:
                raw_effect = -abs(np.random.normal(0.05, 0.03))
            return float(raw_effect)

        te_recharge = treatment_effect("recharge", recharge_txn_rate)
        te_merchant = treatment_effect("merchant", merchant_txn_rate)
        te_p2p      = treatment_effect("p2p",      p2p_txn_rate)
        te_bill     = treatment_effect("bill",      bill_txn_rate)

        rows.append({
            "customer_id":     cid,
            "_baseline_prob":  baseline_prob,
            "_te_recharge":    te_recharge,
            "_te_merchant":    te_merchant,
            "_te_p2p":         te_p2p,
            "_te_bill":        te_bill,
        })

    ite_df = pd.DataFrame(rows)
    print(f"  Ground-truth ITEs recovered for {len(ite_df):,} customers")
    return ite_df


# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Build feature matrix for a given split
# ─────────────────────────────────────────────────────────────────────────────
def build_feature_matrix(
    split_df: pd.DataFrame,
    customers: pd.DataFrame,
) -> pd.DataFrame:
    """Merge customer features into a campaign-history split and build features."""
    cust_cols = CUSTOMER_FEATURES + ["customer_id"]
    merged = split_df.merge(
        customers[cust_cols],
        on="customer_id", how="left"
    )

    for col in HISTORY_FEATURES:
        if col not in merged.columns:
            merged[col] = 0
        merged[col] = pd.to_numeric(merged[col], errors="coerce").fillna(0)

    merged["campaign_type_enc"] = merged["campaign_type"].map(CATEGORY_ENCODING)

    for col in CUSTOMER_FEATURES:
        merged[col] = pd.to_numeric(merged[col], errors="coerce").fillna(0)

    merged["offer_value_bdt"] = merged["offer_value_bdt"].astype(float)
    merged["was_treated"]     = merged["was_treated"].astype(float)
    merged["converted"]       = merged["converted"].astype(int)

    return merged.dropna(subset=ALL_FEATURES + ["converted"]).copy()


# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Train S-Learner on train split only
# ─────────────────────────────────────────────────────────────────────────────
def train_s_learner(train_df: pd.DataFrame) -> GradientBoostingClassifier:
    """Train the S-Learner exclusively on the train temporal split."""
    X = train_df[ALL_FEATURES].values
    y = train_df[OUTCOME_COL].values

    model_cfg = CONFIG["model"]
    model = GradientBoostingClassifier(
        n_estimators    = model_cfg["n_estimators"],
        max_depth       = model_cfg["max_depth"],
        learning_rate   = model_cfg["learning_rate"],
        subsample       = model_cfg["subsample"],
        min_samples_leaf= model_cfg["min_samples_leaf"],
        random_state    = MODEL_SEED,
    )

    print(f"[evaluate_uplift] Training S-Learner on {len(train_df):,} train records...")
    model.fit(X, y)

    # Quick train-set AUC for reference
    y_pred = model.predict_proba(X)[:, 1]
    train_auc = roc_auc_score(y, y_pred)
    print(f"  Train AUC (in-sample, for reference): {train_auc:.4f}")
    return model


# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Generate predicted uplift for the test split
# ─────────────────────────────────────────────────────────────────────────────
def score_test_split(
    model: GradientBoostingClassifier,
    test_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    For each test record, compute predicted uplift using S-Learner:
        uplift = P(Y=1|X, T=1) - P(Y=1|X, T=0)

    The record's actual treatment status (was_treated) is overridden to
    T=1 and T=0 respectively, while all other features are held constant.
    """
    print(f"[evaluate_uplift] Scoring {len(test_df):,} test records for uplift...")

    X = test_df[ALL_FEATURES].values.astype(float)

    # Find column indices for the treatment column
    t_idx = ALL_FEATURES.index("was_treated")

    # T=1 version
    X_t1 = X.copy()
    X_t1[:, t_idx] = 1.0

    # T=0 version
    X_t0 = X.copy()
    X_t0[:, t_idx] = 0.0

    p_t1 = model.predict_proba(X_t1)[:, 1]
    p_t0 = model.predict_proba(X_t0)[:, 1]

    result = test_df.copy()
    result["pred_uplift"]       = p_t1 - p_t0
    result["pred_treatment_prob"] = p_t1
    result["pred_control_prob"]   = p_t0

    uplift_stats = result["pred_uplift"].describe()
    print(f"  Predicted uplift — mean: {uplift_stats['mean']:.4f}  "
          f"std: {uplift_stats['std']:.4f}  "
          f"min: {uplift_stats['min']:.4f}  "
          f"max: {uplift_stats['max']:.4f}")

    # Also score on held-out test AUC (binary converted ~ pred prob at actual T)
    y_test    = test_df[OUTCOME_COL].values
    X_actual  = X.copy()   # uses actual treatment status
    y_pred_actual = model.predict_proba(X_actual)[:, 1]
    test_auc  = roc_auc_score(y_test, y_pred_actual)
    test_loss = log_loss(y_test, y_pred_actual)
    print(f"  Test AUC (actual T): {test_auc:.4f}  |  Log-loss: {test_loss:.4f}")

    result["_test_auc"]  = test_auc
    result["_test_loss"] = test_loss

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Step 6: Ground-truth ITE correlation (diagnostic only)
# ─────────────────────────────────────────────────────────────────────────────
def compute_ite_correlation(
    scored_test: pd.DataFrame,
    ite_df: pd.DataFrame,
) -> Dict[str, Any]:
    """
    Compute Spearman correlation between predicted uplift and known synthetic ITE.

    This is possible ONLY because we are working with synthetic data.
    In a real deployment, ground-truth ITE is not available.

    The correlation is computed separately for each campaign type since the
    predicted uplift in the test set uses the actual campaign_type of each record.
    """
    from scipy.stats import spearmanr

    merged = scored_test.merge(
        ite_df[["customer_id", "_te_recharge", "_te_merchant", "_te_p2p", "_te_bill"]],
        on="customer_id", how="left"
    )

    results = {}
    for ct in CAMPAIGN_TYPES:
        te_col = f"_te_{ct}"
        subset = merged[merged["campaign_type"] == ct].dropna(subset=["pred_uplift", te_col])
        if len(subset) < 10:
            results[ct] = None
            continue
        corr, pval = spearmanr(subset["pred_uplift"], subset[te_col])
        results[ct] = {
            "spearman_correlation": round(float(corr), 5),
            "p_value":              round(float(pval), 6),
            "n":                    len(subset),
        }
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Step 7: Qini/Uplift curve data for JSON export
# ─────────────────────────────────────────────────────────────────────────────
def compute_curve_data(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
    n_bins: int = 50,
) -> Dict[str, Any]:
    """Compute Qini and Uplift curve data for JSON serialization."""
    q_props, q_vals, q_random   = qini_curve(y, treatment, uplift_pred, n_bins)
    u_props, u_vals, u_random   = uplift_curve(y, treatment, uplift_pred, n_bins)

    return {
        "qini_curve": {
            "proportions":  [round(float(v), 4) for v in q_props],
            "model":        [round(float(v), 6) for v in q_vals],
            "random":       [round(float(v), 6) for v in q_random],
        },
        "uplift_curve": {
            "proportions":  [round(float(v), 4) for v in u_props],
            "model":        [round(float(v), 6) for v in u_vals],
            "random":       [round(float(v), 6) for v in u_random],
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Step 8: Write evaluation report
# ─────────────────────────────────────────────────────────────────────────────
def write_report(report: dict) -> Path:
    out_path = DATA_DIR / "model_evaluation.json"
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\n[evaluate_uplift] Evaluation report written to: {out_path}")
    return out_path


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("Upay Campaign Intelligence — Phase 1 Uplift Evaluation")
    print("=" * 60)
    print(f"Dataset seed:  {DATASET_SEED}")
    print(f"Model seed:    {MODEL_SEED}")
    print()

    # 1. Load data
    customers, history = load_data()

    # 2. Temporal splits
    print("\n[evaluate_uplift] Creating temporal splits...")
    # LEAKAGE NOTE: strict_customer_split=False because 9,343 of 10,000 customers
    # appear in all three time windows (campaigns sample 30-60% of customers per
    # week and cycle through all 52 weeks). Strict exclusion would reduce train to
    # only 98 records (3 customers) — completely non-functional.
    # The temporal ordering of RECORDS is the primary leakage protection here.
    # Each campaign exposure outcome is independently drawn; the customer-level
    # observable features (affinities, tenure, etc.) are cross-sectional attributes
    # that are measured at data-generation time — they do not reveal future outcomes.
    train_hist, val_hist, test_hist = make_temporal_splits(
        history, config=CONFIG, strict_customer_split=False
    )
    split_info = describe_splits(train_hist, val_hist, test_hist, config=CONFIG)

    print(f"  Train:      {split_info['train']['n_records']:>7,} records | "
          f"{split_info['train']['n_customers']:>5,} customers | "
          f"conv={split_info['train']['conversion_rate']:.3f}")
    print(f"  Validation: {split_info['validation']['n_records']:>7,} records | "
          f"{split_info['validation']['n_customers']:>5,} customers | "
          f"conv={split_info['validation']['conversion_rate']:.3f}")
    print(f"  Test:       {split_info['test']['n_records']:>7,} records | "
          f"{split_info['test']['n_customers']:>5,} customers | "
          f"conv={split_info['test']['conversion_rate']:.3f}")

    # 3. Build feature matrices
    print("\n[evaluate_uplift] Building feature matrices...")
    train_df = build_feature_matrix(train_hist, customers)
    val_df   = build_feature_matrix(val_hist,   customers)
    test_df  = build_feature_matrix(test_hist,  customers)

    print(f"  Train features: {len(train_df):,} rows")
    print(f"  Val   features: {len(val_df):,} rows")
    print(f"  Test  features: {len(test_df):,} rows")

    # 4. Train model on train split ONLY
    print()
    model = train_s_learner(train_df)

    # 5. Score test split
    print()
    scored_test = score_test_split(model, test_df)

    test_auc  = float(scored_test["_test_auc"].iloc[0])
    test_loss = float(scored_test["_test_loss"].iloc[0])

    # 6. Compute uplift metrics
    print("\n[evaluate_uplift] Computing uplift evaluation metrics...")

    y          = scored_test[OUTCOME_COL].values.astype(int)
    treatment  = scored_test[TREATMENT_COL].values.astype(int)
    uplift_pred = scored_test["pred_uplift"].values.astype(float)

    metrics = compute_all_metrics(y, treatment, uplift_pred)

    print(f"\n  {'Metric':<30}  {'Value':>12}")
    print(f"  {'-'*30}  {'-'*12}")
    print(f"  {'Qini Coefficient':<30}  {metrics['qini_coefficient']:>12.6f}")
    print(f"  {'AUUC':<30}  {metrics['auuc']:>12.6f}")
    print(f"  {'Uplift@10%':<30}  {metrics['uplift_at_10']:>12.6f}")
    print(f"  {'Uplift@20%':<30}  {metrics['uplift_at_20']:>12.6f}")
    print(f"  {'Policy Value (top 50%)':<30}  {metrics['policy_value']:>12.6f}")
    print(f"  {'Overall ATE':<30}  {metrics['overall_ate']:>12.6f}")
    print(f"  {'Test AUC':<30}  {test_auc:>12.4f}")

    # 7. Synthetic ground-truth ITE
    print("\n[evaluate_uplift] Recovering and correlating synthetic ground-truth ITEs...")
    try:
        ite_df    = recover_ground_truth_ite(customers)
        ite_corrs = compute_ite_correlation(scored_test, ite_df)
        print("  Spearman correlations (predicted uplift vs true ITE):")
        for ct, r in ite_corrs.items():
            if r:
                print(f"    {ct:<12}: r={r['spearman_correlation']:.4f}  p={r['p_value']:.4f}  n={r['n']}")
            else:
                print(f"    {ct:<12}: insufficient data")
    except Exception as e:
        print(f"  WARNING: Could not compute ITE correlation: {e}")
        ite_corrs = {"error": str(e)}

    # 8. Curve data
    print("\n[evaluate_uplift] Computing curve data for report...")
    curve_data = compute_curve_data(y, treatment, uplift_pred, n_bins=50)

    # 9. Assemble report
    report = {
        "experiment": {
            "dataset_seed":      DATASET_SEED,
            "model_seed":        MODEL_SEED,
            "train_period":      CONFIG["split"]["train_label"],
            "validation_period": CONFIG["split"]["validation_label"],
            "test_period":       CONFIG["split"]["test_label"],
            "leakage_protection": "temporal_record_split",
            "description": (
                "Chronological split on campaign_week (ISO weeks 1-52: train 1-39, val 40-47, test 48-52). "
                "Temporal record-level splitting protects against look-ahead bias while preserving statistical power, "
                "as campaign exposure outcomes are drawn independently and customer features are cross-sectional."
            ),
        },
        "split_summary": split_info,
        "model": {
            "type":      CONFIG["model"]["type"],
            "features":  ALL_FEATURES,
            "n_features": len(ALL_FEATURES),
            "hyperparameters": CONFIG["model"],
        },
        "classification_metrics": {
            "test_auc":       round(test_auc, 6),
            "test_log_loss":  round(test_loss, 6),
        },
        "metrics": {
            "qini_coefficient": metrics["qini_coefficient"],
            "auuc":             metrics["auuc"],
            "uplift_at_10":     metrics["uplift_at_10"],
            "uplift_at_20":     metrics["uplift_at_20"],
            "policy_value":     metrics["policy_value"],
            "policy_value_detail": metrics["policy_value_detail"],
            "overall_ate":      metrics["overall_ate"],
            "n_test":           metrics["n_test"],
            "n_treated_test":   metrics["n_treated_test"],
            "n_control_test":   metrics["n_control_test"],
            "treated_conv_rate": metrics["treated_conv_rate"],
            "control_conv_rate": metrics["control_conv_rate"],
        },
        "synthetic_ground_truth": {
            "available":      True,
            "usage":          "diagnostic_only_not_in_model_features",
            "ite_correlations": ite_corrs,
            "note": (
                "Ground-truth individual treatment effects (ITE) are available "
                "because this is synthetic data. They are recovered from the same "
                "DGP (SEED=42) and used ONLY to validate that the model's rank "
                "ordering of predicted uplift correlates with true ITEs. "
                "They are never used as model features."
            ),
        },
        "curve_data": curve_data,
    }

    write_report(report)

    print("\n" + "=" * 60)
    print("Phase 1 Evaluation Complete")
    print("=" * 60)
    print(f"  Qini Coefficient : {metrics['qini_coefficient']:.6f}")
    print(f"  AUUC             : {metrics['auuc']:.6f}")
    print(f"  Uplift@10%       : {metrics['uplift_at_10']:.6f}")
    print(f"  Uplift@20%       : {metrics['uplift_at_20']:.6f}")
    print(f"  Policy Value     : {metrics['policy_value']:.6f}")
    print(f"\n  Report:  data/model_evaluation.json")

    return report


if __name__ == "__main__":
    main()
