import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
"""
test_phase1.py
==============
Phase 1 evaluation tests.

Tests:
  - Temporal split correctness (chronological ordering, no future leakage)
  - Leakage protection documentation
  - Uplift metric calculations (Qini, AUUC, Uplift@k, Policy Value)
  - Deterministic evaluation (same seeds → same results)

Run:
    python ml/test_phase1.py
    # or
    python -m pytest ml/test_phase1.py -v
"""

import sys
import json
import math
import random
import numpy as np
import pandas as pd
from pathlib import Path

ML_DIR = Path(__file__).parent
sys.path.insert(0, str(ML_DIR))

from experiment_config import CONFIG
from evaluation.temporal_split import make_temporal_splits, _parse_week, describe_splits
from evaluation.metrics import (
    qini_curve,
    qini_coefficient,
    uplift_curve,
    auuc,
    uplift_at_k,
    policy_value,
    compute_all_metrics,
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


# ─────────────────────────────────────────────────────────────────────────────
# Fixture: synthetic campaign history
# ─────────────────────────────────────────────────────────────────────────────
def make_synthetic_history(n_records: int = 5000, n_weeks: int = 52, seed: int = 42) -> pd.DataFrame:
    """Small synthetic campaign history for fast unit tests."""
    rng = np.random.default_rng(seed)
    weeks = [f"2025-W{w:02d}" for w in range(1, n_weeks + 1)]
    records = []
    for i in range(n_records):
        cid = f"CUST_{(i % 500) + 1:05d}"  # 500 unique customers
        wk  = weeks[rng.integers(0, n_weeks)]
        was_treated = int(rng.random() < 0.7)
        converted   = int(rng.random() < (0.35 if was_treated else 0.27))
        records.append({
            "record_id":             f"REC_{i:06d}",
            "campaign_id":           f"CAMP_{(i % 80) + 1:04d}",
            "campaign_type":         rng.choice(["recharge", "merchant", "p2p", "bill"]),
            "offer_value_bdt":       int(rng.choice([10, 20, 30, 50])),
            "customer_id":           cid,
            "was_treated":           was_treated,
            "converted":             converted,
            "campaign_week":         wk,
            "days_since_prev_campaign": int(rng.integers(0, 90)),
            "fatigue_level":         int(rng.integers(0, 5)),
            "segment":               rng.choice(["high_value", "mid", "low", "dormant"]),
        })
    return pd.DataFrame(records)


# ─────────────────────────────────────────────────────────────────────────────
# Test 1: Week parsing
# ─────────────────────────────────────────────────────────────────────────────
def test_week_parsing():
    print("\n[1] Week parsing")
    check("parse '2025-W01'", _parse_week("2025-W01") == 1)
    check("parse '2025-W52'", _parse_week("2025-W52") == 52)
    check("parse '2025-W07'", _parse_week("2025-W07") == 7)
    try:
        _parse_week("bad")
        check("raises on bad input", False)
    except ValueError:
        check("raises ValueError on bad input", True)


# ─────────────────────────────────────────────────────────────────────────────
# Test 2: Temporal split correctness
# ─────────────────────────────────────────────────────────────────────────────
def test_temporal_split():
    print("\n[2] Temporal split correctness")
    hist = make_synthetic_history(n_records=5000, seed=42)
    train_df, val_df, test_df = make_temporal_splits(hist, CONFIG, strict_customer_split=False)

    import re
    def get_week(df):
        return df["campaign_week"].apply(
            lambda w: int(re.match(r"\d{4}-W(\d+)", w).group(1))
        )

    train_weeks = get_week(train_df)
    val_weeks   = get_week(val_df)
    test_weeks  = get_week(test_df)

    train_max = int(train_weeks.max()) if len(train_df) else 0
    val_min   = int(val_weeks.min())   if len(val_df)   else 0
    val_max   = int(val_weeks.max())   if len(val_df)   else 0
    test_min  = int(test_weeks.min())  if len(test_df)  else 0

    cfg_train = CONFIG["split"]["train"]
    cfg_val   = CONFIG["split"]["validation"]
    cfg_test  = CONFIG["split"]["test"]

    check("train max week <= config train_max",
          train_max <= cfg_train["week_max"],
          f"train_max={train_max}, config={cfg_train['week_max']}")
    check("val min week >= config val_min",
          val_min >= cfg_val["week_min"],
          f"val_min={val_min}, config={cfg_val['week_min']}")
    check("val max week <= config val_max",
          val_max <= cfg_val["week_max"],
          f"val_max={val_max}, config={cfg_val['week_max']}")
    check("test min week >= config test_min",
          test_min >= cfg_test["week_min"],
          f"test_min={test_min}, config={cfg_test['week_min']}")
    check("no overlap: train weeks < val weeks",
          train_max < val_min,
          f"train_max={train_max}, val_min={val_min}")
    check("no overlap: val weeks < test weeks",
          val_max < test_min,
          f"val_max={val_max}, test_min={test_min}")
    check("splits are non-empty",
          len(train_df) > 0 and len(val_df) > 0 and len(test_df) > 0,
          f"train={len(train_df)}, val={len(val_df)}, test={len(test_df)}")
    check("train + val + test = total records",
          len(train_df) + len(val_df) + len(test_df) == len(hist),
          f"{len(train_df)} + {len(val_df)} + {len(test_df)} = {len(hist)}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 3: Leakage protection — train weeks strictly before test weeks
# ─────────────────────────────────────────────────────────────────────────────
def test_leakage_protection():
    print("\n[3] Leakage protection")
    hist = make_synthetic_history(n_records=5000, seed=42)
    train_df, val_df, test_df = make_temporal_splits(hist, CONFIG, strict_customer_split=False)

    import re
    def max_week(df):
        if len(df) == 0:
            return 0
        return max(int(re.match(r"\d{4}-W(\d+)", w).group(1)) for w in df["campaign_week"])
    def min_week(df):
        if len(df) == 0:
            return 99
        return min(int(re.match(r"\d{4}-W(\d+)", w).group(1)) for w in df["campaign_week"])

    check("no train record has week in test window",
          max_week(train_df) < CONFIG["split"]["test"]["week_min"])
    check("no train record has week in val window",
          max_week(train_df) < CONFIG["split"]["validation"]["week_min"])
    check("no val record has week in test window",
          max_week(val_df) < CONFIG["split"]["test"]["week_min"])
    check("test records start at configured min",
          min_week(test_df) >= CONFIG["split"]["test"]["week_min"])


# ─────────────────────────────────────────────────────────────────────────────
# Test 4: Uplift metrics — perfect model
# ─────────────────────────────────────────────────────────────────────────────
def test_perfect_model():
    print("\n[4] Uplift metrics — perfect model (known ITE as predictor)")
    rng = np.random.default_rng(42)
    n   = 2000
    ite = rng.uniform(-0.1, 0.4, size=n)             # true uplift
    treatment = rng.binomial(1, 0.7, size=n)
    # Outcomes generated from true ITE
    base_prob = 0.25
    conv_prob = np.where(treatment == 1,
                         np.clip(base_prob + ite, 0, 1),
                         base_prob)
    y = rng.binomial(1, conv_prob)

    # Perfect predictor: use true ITE
    metrics_perfect = compute_all_metrics(y, treatment, ite)
    # Random predictor: use random scores
    random_pred = rng.uniform(-0.1, 0.4, size=n)
    metrics_random = compute_all_metrics(y, treatment, random_pred)

    check("Qini coefficient > 0 for perfect model",
          metrics_perfect["qini_coefficient"] > 0,
          f"Qini={metrics_perfect['qini_coefficient']:.4f}")
    check("AUUC > 0 for perfect model",
          metrics_perfect["auuc"] > 0,
          f"AUUC={metrics_perfect['auuc']:.4f}")
    check("Perfect model Qini > random model Qini",
          metrics_perfect["qini_coefficient"] > metrics_random["qini_coefficient"],
          f"perfect={metrics_perfect['qini_coefficient']:.4f}, random={metrics_random['qini_coefficient']:.4f}")
    check("Perfect model AUUC > random model AUUC",
          metrics_perfect["auuc"] > metrics_random["auuc"],
          f"perfect={metrics_perfect['auuc']:.4f}, random={metrics_random['auuc']:.4f}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 5: Qini curve properties
# ─────────────────────────────────────────────────────────────────────────────
def test_qini_curve():
    print("\n[5] Qini curve properties")
    rng = np.random.default_rng(7)
    n = 1000
    treatment = rng.binomial(1, 0.7, n)
    uplift_pred = rng.uniform(-0.1, 0.4, n)
    y = rng.binomial(1, 0.3, n)

    props, qini_vals, random_line = qini_curve(y, treatment, uplift_pred, n_bins=100)

    check("curve starts at (0, 0)",
          props[0] == 0.0 and qini_vals[0] == 0.0,
          f"props[0]={props[0]}, qini[0]={qini_vals[0]}")
    check("curve ends at proportion 1.0",
          abs(props[-1] - 1.0) < 1e-6,
          f"props[-1]={props[-1]}")
    check("proportions are monotonically increasing",
          bool(np.all(np.diff(props) >= 0)))
    check("random line starts at 0 and is linear",
          random_line[0] == 0.0 and np.allclose(np.diff(random_line), np.diff(random_line)[0], atol=1e-6))
    check("output arrays have same length",
          len(props) == len(qini_vals) == len(random_line))


# ─────────────────────────────────────────────────────────────────────────────
# Test 6: Uplift@k%
# ─────────────────────────────────────────────────────────────────────────────
def test_uplift_at_k():
    print("\n[6] Uplift@k%")
    rng = np.random.default_rng(11)
    n   = 2000
    # Create strong signal: high predicted uplift → high actual uplift
    true_ite = rng.uniform(-0.05, 0.30, n)
    treatment = rng.binomial(1, 0.7, n)
    y = rng.binomial(1, np.clip(0.25 + true_ite * treatment, 0, 1))

    u10 = uplift_at_k(y, treatment, true_ite, k=0.10)
    u20 = uplift_at_k(y, treatment, true_ite, k=0.20)
    u50 = uplift_at_k(y, treatment, true_ite, k=0.50)
    u100 = uplift_at_k(y, treatment, true_ite, k=1.00)

    check("uplift@10 is a finite float", isinstance(u10, float) and not math.isnan(u10),
          f"uplift@10={u10:.4f}")
    check("uplift@20 is a finite float", isinstance(u20, float) and not math.isnan(u20),
          f"uplift@20={u20:.4f}")
    # With true ITE as predictor, top 10% should have higher uplift than top 100%
    check("uplift@10 > uplift@100 (top 10% is better than targeting all)",
          u10 >= u100,
          f"u10={u10:.4f}, u100={u100:.4f}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 7: Policy value
# ─────────────────────────────────────────────────────────────────────────────
def test_policy_value():
    print("\n[7] Policy value")
    rng = np.random.default_rng(13)
    n   = 2000
    true_ite = rng.uniform(-0.05, 0.30, n)
    treatment = rng.binomial(1, 0.7, n)
    y = rng.binomial(1, np.clip(0.25 + true_ite * treatment, 0, 1))

    pv = policy_value(y, treatment, true_ite, targeting_fraction=0.50)

    check("policy_value dict has required keys",
          all(k in pv for k in ["model_treated_conv_rate", "random_treated_conv_rate", "policy_value",
                                "n_model_selected", "n_model_treated"]))
    check("n_model_selected ≈ 50% of n",
          abs(pv["n_model_selected"] - n // 2) <= 1,
          f"selected={pv['n_model_selected']}, expected≈{n//2}")
    check("model_treated_conv_rate is in [0,1]",
          0.0 <= pv["model_treated_conv_rate"] <= 1.0,
          f"rate={pv['model_treated_conv_rate']:.4f}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 8: Deterministic evaluation (same seeds → same results)
# ─────────────────────────────────────────────────────────────────────────────
def test_determinism():
    print("\n[8] Determinism — same seeds produce same results")

    def run_once(seed):
        rng = np.random.default_rng(seed)
        n   = 1000
        treatment   = rng.binomial(1, 0.7, n)
        uplift_pred = rng.uniform(-0.1, 0.4, n)
        y           = rng.binomial(1, np.clip(0.25 + uplift_pred * treatment, 0, 1))
        return compute_all_metrics(y, treatment, uplift_pred)

    r1 = run_once(42)
    r2 = run_once(42)
    r3 = run_once(99)  # different seed → different result

    check("identical seeds → identical Qini",
          r1["qini_coefficient"] == r2["qini_coefficient"],
          f"run1={r1['qini_coefficient']}, run2={r2['qini_coefficient']}")
    check("identical seeds → identical AUUC",
          r1["auuc"] == r2["auuc"],
          f"run1={r1['auuc']}, run2={r2['auuc']}")
    check("identical seeds → identical uplift@10",
          r1["uplift_at_10"] == r2["uplift_at_10"])
    check("different seeds → different Qini",
          r1["qini_coefficient"] != r3["qini_coefficient"],
          f"seed42={r1['qini_coefficient']}, seed99={r3['qini_coefficient']}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 9: AUUC correctness
# ─────────────────────────────────────────────────────────────────────────────
def test_auuc():
    print("\n[9] AUUC correctness")
    rng = np.random.default_rng(17)
    n   = 1000
    treatment = rng.binomial(1, 0.7, n)
    y         = rng.binomial(1, 0.3, n)

    # Random predictor → AUUC ≈ 0
    random_pred = rng.uniform(-0.1, 0.4, n)
    auuc_random = auuc(y, treatment, random_pred)

    # True ITE predictor → AUUC > 0
    true_ite = rng.uniform(-0.05, 0.3, n)
    y_ite = rng.binomial(1, np.clip(0.25 + true_ite * treatment, 0, 1))
    auuc_ite = auuc(y_ite, treatment, true_ite)

    check("AUUC is finite",
          not math.isnan(auuc_random) and not math.isinf(auuc_random),
          f"AUUC={auuc_random:.6f}")
    check("AUUC with true ITE > random AUUC",
          auuc_ite > auuc_random,
          f"ite={auuc_ite:.4f}, random={auuc_random:.4f}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 10: Config completeness
# ─────────────────────────────────────────────────────────────────────────────
def test_config():
    print("\n[10] Experiment configuration completeness")

    required_keys = ["dataset_seed", "model_seed", "split", "treatment_col",
                     "outcome_col", "customer_features", "history_features",
                     "campaign_features", "model", "campaign_types"]

    for k in required_keys:
        check(f"CONFIG has key '{k}'", k in CONFIG)

    split_keys = ["train", "validation", "test", "train_label", "validation_label", "test_label"]
    for k in split_keys:
        check(f"CONFIG['split'] has key '{k}'", k in CONFIG["split"])

    # Verify split is chronological
    t  = CONFIG["split"]["train"]
    v  = CONFIG["split"]["validation"]
    te = CONFIG["split"]["test"]
    check("train_max < val_min (no overlap)",  t["week_max"] < v["week_min"])
    check("val_max < test_min (no overlap)",   v["week_max"] < te["week_min"])
    check("seeds are both 42 (deterministic)", CONFIG["dataset_seed"] == 42 and CONFIG["model_seed"] == 42)


# ─────────────────────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("Phase 1 — Causal Evaluation Tests")
    print("=" * 60)

    test_week_parsing()
    test_temporal_split()
    test_leakage_protection()
    test_perfect_model()
    test_qini_curve()
    test_uplift_at_k()
    test_policy_value()
    test_determinism()
    test_auuc()
    test_config()

    print("\n" + "=" * 60)
    passed = sum(1 for _, ok in results if ok)
    total  = len(results)
    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print("OK All Phase 1 tests passed.")
    else:
        print("ERR Some tests failed. See details above.")
        failed = [(n, ok) for n, ok in results if not ok]
        for name, _ in failed:
            print(f"  FAILED: {name}")
        sys.exit(1)

    return passed == total


if __name__ == "__main__":
    main()
