"""
experiment_config.py
====================
Centralized, deterministic experiment configuration for Phase 1 causal evaluation.

This single source of truth governs:
  - Random seeds (data generation, model training)
  - Temporal split boundaries
  - Feature lists (must match train_model.py exactly)
  - Treatment / outcome column names
  - Model hyperparameters

USAGE
-----
    from experiment_config import CONFIG

Any downstream script (evaluate_uplift.py, metrics.py, tests) must import
CONFIG from here rather than hard-coding values.

REPRODUCIBILITY
---------------
Same CONFIG + same generate_data.py + same train_model.py  ⇒  identical results.
"""

CONFIG = {
    # ── Seeds ────────────────────────────────────────────────────────────────
    "dataset_seed": 42,   # seed used in generate_data.py (SEED = 42)
    "model_seed":   42,   # seed used for GradientBoostingClassifier

    # ── Temporal split ───────────────────────────────────────────────────────
    # The synthetic dataset contains campaign_week in ISO week format:
    #   "2025-W01" … "2025-W52"
    # 80 campaigns cycle over 52 weeks (mod 52).
    #
    # Split rationale (chronological — no future leakage):
    #   Train      : weeks  1-39  (≈75% of calendar)
    #   Validation : weeks 40-47  (≈15%)
    #   Test       : weeks 48-52  (≈10%)
    "split": {
        "train":      {"week_min": 1,  "week_max": 39},
        "validation": {"week_min": 40, "week_max": 47},
        "test":       {"week_min": 48, "week_max": 52},
        # Human-readable descriptions stored for reporting
        "train_label":      "2025-W01 – 2025-W39",
        "validation_label": "2025-W40 – 2025-W47",
        "test_label":       "2025-W48 – 2025-W52",
    },

    # ── Treatment / outcome ──────────────────────────────────────────────────
    "treatment_col": "was_treated",
    "outcome_col":   "converted",

    # ── Feature lists ────────────────────────────────────────────────────────
    # Must match the ALL_FEATURES definition in train_model.py exactly.
    "customer_features": [
        "tenure_months",
        "avg_monthly_txn_count",
        "avg_monthly_gmv_bdt",
        "days_since_last_txn",
        "campaign_received_last_90d",
        "campaign_responded_last_90d",
        "friday_txn_rate",
        "recharge_txn_rate",
        "merchant_txn_rate",
        "p2p_txn_rate",
        "bill_txn_rate",
    ],
    "history_features": [
        "days_since_prev_campaign",
        "fatigue_level",
    ],
    "campaign_features": [
        "campaign_type_enc",
        "offer_value_bdt",
        "was_treated",
    ],

    # ── Model ────────────────────────────────────────────────────────────────
    "model": {
        "type":             "S-Learner (GradientBoostingClassifier)",
        "n_estimators":     200,
        "max_depth":        4,
        "learning_rate":    0.05,
        "subsample":        0.8,
        "min_samples_leaf": 20,
    },

    # ── Campaign types ───────────────────────────────────────────────────────
    "campaign_types": ["recharge", "merchant", "p2p", "bill"],
    "offer_value_for_scoring": 30.0,  # representative value used in score_customers()
}
