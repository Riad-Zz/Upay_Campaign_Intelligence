"""
generate_policy_comparison.py
==============================
Generates data/policy_comparison.json for the lightweight targeting
strategy comparison in the UI.

Extracts metrics for:
  - Random Targeting
  - Propensity Targeting (Conventional Marketing)
  - Uplift Targeting (Causal ML)

Under the fixed representative scenario:
  Campaign: Recharge
  Budget: BDT 50,000
  Incentive: BDT 30
  Target Count: 1,666
  Seed: 42
"""

import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import json
from pathlib import Path

# Path setup
ML_DIR = Path(__file__).parent.parent
ROOT_DIR = ML_DIR.parent
DATA_DIR = ROOT_DIR / "data"

sys.path.insert(0, str(ML_DIR))
sys.path.insert(0, str(ML_DIR / "evaluation"))

from benchmark_policies import run_benchmark, BENCHMARK_REPORT_PATH

COMPARISON_JSON_PATH = DATA_DIR / "policy_comparison.json"


def generate_comparison() -> dict:
    """Generate or extract the policy comparison dictionary."""
    if not BENCHMARK_REPORT_PATH.exists():
        print("[generate_policy_comparison] Running benchmark to calculate metrics...")
        benchmark_data = run_benchmark(campaign_budget=50000.0, fixed_incentive=30.0, random_seed=42)
    else:
        print("[generate_policy_comparison] Loading benchmark metrics from", BENCHMARK_REPORT_PATH)
        with open(BENCHMARK_REPORT_PATH, "r", encoding="utf-8") as f:
            benchmark_data = json.load(f)

    exp = benchmark_data.get("experiment", {})
    policies = benchmark_data.get("policies", {})

    random_pol = policies.get("random", {})
    prop_pol = policies.get("propensity", {})
    uplift_pol = policies.get("uplift", {})

    comparison = {
        "scenario": {
            "campaign": "Recharge",
            "budget": exp.get("campaign_budget", 50000.0),
            "incentive": exp.get("fixed_incentive", 30.0),
            "target_count": exp.get("max_targets", 1666),
            "eligible_customers": exp.get("eligible_customers", 3893),
            "random_seed": exp.get("random_seed", 42)
        },
        "strategies": {
            "random": {
                "targeted": random_pol.get("targeted_customers", 1666),
                "avg_uplift": round(random_pol.get("mean_predicted_uplift", 0.0), 4),
                "incremental_transactions": round(random_pol.get("incremental_transactions", 0.0), 1),
                "incremental_gmv": round(random_pol.get("incremental_gmv_bdt", 0.0), 1),
                "sure_things": random_pol.get("sure_thing_targets", 0),
                "sure_thing_percentage": round(random_pol.get("sure_thing_percentage", 0.0), 1),
                "wasteful_targets": random_pol.get("incentive_waste_targets", 0),
                "cost_per_incremental_txn": round(random_pol.get("cost_per_incremental_txn_bdt", 0.0), 1),
                "conversion_prob_treatment": round(random_pol.get("mean_treatment_probability", 0.0) * 100, 1),
                "baseline_prob_control": round(random_pol.get("mean_baseline_probability", 0.0) * 100, 1)
            },
            "propensity": {
                "targeted": prop_pol.get("targeted_customers", 1666),
                "avg_uplift": round(prop_pol.get("mean_predicted_uplift", 0.0), 4),
                "incremental_transactions": round(prop_pol.get("incremental_transactions", 0.0), 1),
                "incremental_gmv": round(prop_pol.get("incremental_gmv_bdt", 0.0), 1),
                "sure_things": prop_pol.get("sure_thing_targets", 0),
                "sure_thing_percentage": round(prop_pol.get("sure_thing_percentage", 0.0), 1),
                "wasteful_targets": prop_pol.get("incentive_waste_targets", 0),
                "cost_per_incremental_txn": round(prop_pol.get("cost_per_incremental_txn_bdt", 0.0), 1),
                "conversion_prob_treatment": round(prop_pol.get("mean_treatment_probability", 0.0) * 100, 1),
                "baseline_prob_control": round(prop_pol.get("mean_baseline_probability", 0.0) * 100, 1)
            },
            "uplift": {
                "targeted": uplift_pol.get("targeted_customers", 1666),
                "avg_uplift": round(uplift_pol.get("mean_predicted_uplift", 0.0), 4),
                "incremental_transactions": round(uplift_pol.get("incremental_transactions", 0.0), 1),
                "incremental_gmv": round(uplift_pol.get("incremental_gmv_bdt", 0.0), 1),
                "sure_things": uplift_pol.get("sure_thing_targets", 0),
                "sure_thing_percentage": round(uplift_pol.get("sure_thing_percentage", 0.0), 1),
                "wasteful_targets": uplift_pol.get("incentive_waste_targets", 0),
                "cost_per_incremental_txn": round(uplift_pol.get("cost_per_incremental_txn_bdt", 0.0), 1),
                "conversion_prob_treatment": round(uplift_pol.get("mean_treatment_probability", 0.0) * 100, 1),
                "baseline_prob_control": round(uplift_pol.get("mean_baseline_probability", 0.0) * 100, 1)
            }
        },
        "comparison": {
            "uplift_vs_propensity_txn_lift_pct": round(
                ((uplift_pol.get("incremental_transactions", 0.0) - prop_pol.get("incremental_transactions", 1.0))
                 / max(prop_pol.get("incremental_transactions", 1.0), 0.001)) * 100, 1
            ),
            "uplift_vs_propensity_gmv_lift_pct": round(
                ((uplift_pol.get("incremental_gmv_bdt", 0.0) - prop_pol.get("incremental_gmv_bdt", 1.0))
                 / max(prop_pol.get("incremental_gmv_bdt", 1.0), 0.001)) * 100, 1
            ),
            "sure_thing_spend_saved_bdt": round(
                prop_pol.get("sure_thing_spend_bdt", 0.0) - uplift_pol.get("sure_thing_spend_bdt", 0.0), 1
            ),
            "cost_efficiency_improvement_pct": round(
                ((prop_pol.get("cost_per_incremental_txn_bdt", 1.0) - uplift_pol.get("cost_per_incremental_txn_bdt", 1.0))
                 / max(prop_pol.get("cost_per_incremental_txn_bdt", 1.0), 0.001)) * 100, 1
            )
        }
    }

    with open(COMPARISON_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2)

    print(f"[generate_policy_comparison] Successfully saved to: {COMPARISON_JSON_PATH}")
    return comparison


if __name__ == "__main__":
    result = generate_comparison()
    print("Random txns:", result["strategies"]["random"]["incremental_transactions"])
    print("Propensity txns:", result["strategies"]["propensity"]["incremental_transactions"])
    print("Uplift txns:", result["strategies"]["uplift"]["incremental_transactions"])
    print("Uplift vs Propensity txn lift:", result["comparison"]["uplift_vs_propensity_txn_lift_pct"], "%")
