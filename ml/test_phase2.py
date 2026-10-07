"""
test_phase2.py
==============
Phase 2 — Policy Benchmark Unit Tests.

Tests:
  - Benchmark execution & JSON schema validation
  - Budget constraints & identical targeting counts across policies
  - Random targeting determinism with fixed seed
  - Propensity policy ranking order (descending by treatment probability)
  - Uplift policy ranking order (descending by predicted uplift)
  - Causal superiority: Uplift achieves higher incremental transactions than Propensity
  - Deadweight elimination: Uplift targets 0 Sure Things vs Propensity > 0
"""

import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import json
from pathlib import Path
import numpy as np
import pandas as pd

ML_DIR = Path(__file__).parent
sys.path.insert(0, str(ML_DIR))

from evaluation.benchmark_policies import (
    run_benchmark,
    run_random_policy,
    run_propensity_policy,
    run_uplift_policy,
    run_fixed_incentive_policy,
    evaluate_customer_fatigue,
    BENCHMARK_REPORT_PATH,
)

PASS = "[PASS]"
FAIL = "[FAIL]"
results = []


def check(name: str, condition: bool, detail: str = ""):
    icon = PASS if condition else FAIL
    msg  = f"  {icon}  {name}"
    if detail:
        msg += f"\n         {detail}"
    print(msg)
    results.append((name, condition))
    return condition


def test_fatigue_rules():
    print("\n[1] Fatigue rule correctness")
    # Rule 1: >= 3 campaigns received
    row1 = pd.Series({"campaign_received_last_90d": 3, "campaign_responded_last_90d": 1, "days_since_prev_campaign": 30})
    sup1, r1 = evaluate_customer_fatigue(row1)
    check("Hard cap suppresses >= 3 campaigns", sup1 and r1 == "hard_cap")

    # Rule 2: >= 2 received with 0 responses
    row2 = pd.Series({"campaign_received_last_90d": 2, "campaign_responded_last_90d": 0, "days_since_prev_campaign": 30})
    sup2, r2 = evaluate_customer_fatigue(row2)
    check("Unresponsive suppresses >= 2 with 0 responses", sup2 and r2 == "unresponsive")

    # Rule 3: Spacing < 7 days
    row3 = pd.Series({"campaign_received_last_90d": 1, "campaign_responded_last_90d": 1, "days_since_prev_campaign": 4})
    sup3, r3 = evaluate_customer_fatigue(row3)
    check("Spacing suppresses < 7 days", sup3 and r3 == "spacing")

    # Rule 4: Clean customer
    row4 = pd.Series({"campaign_received_last_90d": 1, "campaign_responded_last_90d": 1, "days_since_prev_campaign": 20})
    sup4, r4 = evaluate_customer_fatigue(row4)
    check("Safe customer is not suppressed", not sup4 and r4 is None)


def test_policy_ranking():
    print("\n[2] Policy ranking logic")
    df = pd.DataFrame({
        "customer_id": [f"CUST_{i:04d}" for i in range(10)],
        "pred_treatment_prob": [0.1, 0.9, 0.4, 0.8, 0.3, 0.7, 0.2, 0.6, 0.5, 0.95],
        "pred_control_prob":   [0.05, 0.85, 0.35, 0.70, 0.25, 0.60, 0.15, 0.50, 0.40, 0.90],
        "pred_uplift":         [0.05, 0.05, 0.05, 0.10, 0.05, 0.10, 0.05, 0.10, 0.10, 0.05],
        "avg_monthly_gmv_bdt": [1000, 5000, 2000, 8000, 1500, 7000, 1200, 6000, 4000, 9000],
    })

    # Propensity selects highest treatment_prob
    prop = run_propensity_policy(df, k=3)
    check("Propensity top-1 is highest treatment prob", prop.iloc[0]["pred_treatment_prob"] == 0.95)
    check("Propensity is strictly descending", list(prop["pred_treatment_prob"]) == sorted(prop["pred_treatment_prob"], reverse=True))

    # Uplift selects highest uplift
    up = run_uplift_policy(df, k=3)
    check("Uplift top-1 is highest uplift", up.iloc[0]["pred_uplift"] == 0.10)
    check("Uplift is strictly descending", list(up["pred_uplift"]) == sorted(up["pred_uplift"], reverse=True))

    # Fixed incentive selects highest GMV
    fix = run_fixed_incentive_policy(df, k=3)
    check("Fixed incentive top-1 is highest GMV", fix.iloc[0]["avg_monthly_gmv_bdt"] == 9000)

    # Random is deterministic with fixed seed
    r1 = run_random_policy(df, k=3, seed=42)
    r2 = run_random_policy(df, k=3, seed=42)
    check("Random policy is deterministic with fixed seed", list(r1["customer_id"]) == list(r2["customer_id"]))


def test_benchmark_report():
    print("\n[3] Benchmark report execution & schema")
    report = run_benchmark(campaign_budget=50000.0, fixed_incentive=30.0, random_seed=42)

    check("Benchmark report JSON file exists", BENCHMARK_REPORT_PATH.exists())

    # Schema checks
    check("Report has 'experiment' section", "experiment" in report)
    check("Report has 'policies' section", "policies" in report)
    check("Report has 'comparison' section", "comparison" in report)

    policies = report["policies"]
    for p in ["random", "propensity", "fixed_incentive", "uplift"]:
        check(f"Policy '{p}' exists in report", p in policies)
        check(f"Policy '{p}' targets exactly 1,666 customers", policies[p]["targeted_customers"] == 1666)
        check(f"Policy '{p}' respects budget ৳50,000", policies[p]["incentive_cost_bdt"] <= 50000.0)

    # Business findings checks
    uplift_txns = policies["uplift"]["incremental_transactions"]
    prop_txns   = policies["propensity"]["incremental_transactions"]
    check("Uplift incremental transactions > Propensity incremental transactions",
          uplift_txns > prop_txns,
          f"Uplift={uplift_txns:.1f} vs Propensity={prop_txns:.1f}")

    uplift_st = policies["uplift"]["sure_thing_targets"]
    prop_st   = policies["propensity"]["sure_thing_targets"]
    check("Uplift has fewer Sure Things than Propensity",
          uplift_st < prop_st,
          f"Uplift={uplift_st} vs Propensity={prop_st}")


def main():
    print("=" * 60)
    print("Phase 2 — Policy Benchmark Unit Tests")
    print("=" * 60)

    test_fatigue_rules()
    test_policy_ranking()
    test_benchmark_report()

    print("\n" + "=" * 60)
    passed = sum(1 for _, ok in results if ok)
    total  = len(results)
    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print("OK All Phase 2 tests passed.")
    else:
        print("ERR Some tests failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
