"""
train_model.py
==============
S-Learner uplift model for Upay Campaign Intelligence.

Reads:
  ../data/customers.json
  ../data/campaign_history.json

Writes:
  ../data/uplift_scores.json   — per-customer uplift score for each campaign type
  ../data/model_meta.json      — feature importances, score distributions, per-customer explanations

Pipeline:
  1. Load campaign history
  2. Build feature matrix (customer features + campaign_type + was_treated)
  3. Train LightGBM binary classifier (converted ~ features)
  4. For each customer × campaign type: score T=1 and T=0, compute uplift
  5. Compute per-customer SHAP top-3 feature drivers
  6. Export JSON artifacts

Run:
  python train_model.py   (after generate_data.py)
"""

import json
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import roc_auc_score, log_loss

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent.parent / "data"

# ── Constants ─────────────────────────────────────────────────────────────────
SEED = 42
CAMPAIGN_TYPES = ["recharge", "merchant", "p2p", "bill"]
CATEGORY_ENCODING = {t: i for i, t in enumerate(CAMPAIGN_TYPES)}

# Customer features fed to the model (NO ground-truth leakage)
CUSTOMER_FEATURES = [
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
]

# Features that come from campaign history records (not customer profile)
HISTORY_FEATURES = [
    "days_since_prev_campaign",
    "fatigue_level",
]

# Campaign features
CAMPAIGN_FEATURES = [
    "campaign_type_enc",  # encoded campaign type
    "offer_value_bdt",
    "was_treated",
]

ALL_FEATURES = CUSTOMER_FEATURES + HISTORY_FEATURES + CAMPAIGN_FEATURES

FEATURE_LABELS = {
    "tenure_months": "Account Tenure",
    "avg_monthly_txn_count": "Monthly Txn Count",
    "avg_monthly_gmv_bdt": "Monthly GMV (BDT)",
    "days_since_last_txn": "Days Since Last Txn",
    "campaign_received_last_90d": "Campaigns Received (90d)",
    "campaign_responded_last_90d": "Campaigns Responded (90d)",
    "friday_txn_rate": "Friday Activity Rate",
    "recharge_txn_rate": "Recharge Affinity",
    "merchant_txn_rate": "Merchant Affinity",
    "p2p_txn_rate": "P2P Affinity",
    "bill_txn_rate": "Bill Payment Affinity",
    "days_since_prev_campaign": "Days Since Last Campaign",
    "fatigue_level": "Fatigue Level",
    "campaign_type_enc": "Campaign Type",
    "offer_value_bdt": "Offer Value",
    "was_treated": "Treatment",
}


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Load data
# ─────────────────────────────────────────────────────────────────────────────
def load_data():
    print("[train_model] Loading data...")
    with open(DATA_DIR / "customers.json") as f:
        customers = pd.DataFrame(json.load(f))

    with open(DATA_DIR / "campaign_history.json") as f:
        history = pd.DataFrame(json.load(f))

    print(f"  Customers: {len(customers):,}")
    print(f"  History records: {len(history):,}")
    return customers, history


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Build training matrix
# ─────────────────────────────────────────────────────────────────────────────
def build_train_matrix(customers: pd.DataFrame, history: pd.DataFrame) -> pd.DataFrame:
    # Merge customer features into history
    cust_cols = CUSTOMER_FEATURES + ["customer_id"]
    merged = history.merge(
        customers[cust_cols],
        on="customer_id", how="left"
    )

    # Ensure history-side numeric features are present
    for col in HISTORY_FEATURES:
        if col not in merged.columns:
            merged[col] = 0
        merged[col] = pd.to_numeric(merged[col], errors="coerce").fillna(0)

    # Encode campaign type
    merged["campaign_type_enc"] = merged["campaign_type"].map(CATEGORY_ENCODING)

    # Ensure numeric types
    for col in CUSTOMER_FEATURES:
        merged[col] = pd.to_numeric(merged[col], errors="coerce").fillna(0)

    merged["offer_value_bdt"]  = merged["offer_value_bdt"].astype(float)
    merged["was_treated"]      = merged["was_treated"].astype(float)
    merged["converted"]        = merged["converted"].astype(int)

    # Drop any rows with NaN features
    train_df = merged.dropna(subset=ALL_FEATURES + ["converted"]).copy()
    print(f"[train_model] Training rows: {len(train_df):,}")
    return train_df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Train S-Learner
# ─────────────────────────────────────────────────────────────────────────────
def train_model(train_df: pd.DataFrame):
    X = train_df[ALL_FEATURES].values
    y = train_df["converted"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )

    print("[train_model] Training S-Learner (GradientBoostingClassifier)...")
    # Use GradientBoostingClassifier — good probability calibration out of the box
    base = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_leaf=20,
        random_state=SEED,
    )
    base.fit(X_train, y_train)

    # Evaluate
    y_pred_proba = base.predict_proba(X_test)[:, 1]
    auc  = roc_auc_score(y_test, y_pred_proba)
    loss = log_loss(y_test, y_pred_proba)
    print(f"  AUC: {auc:.4f}  |  Log-loss: {loss:.4f}")

    return base


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Score all customers × all campaign types
# ─────────────────────────────────────────────────────────────────────────────
def score_customers(model, customers: pd.DataFrame) -> dict:
    """
    For each customer × campaign type:
      uplift = P(convert|T=1) - P(convert|T=0)
    Pre-compute for a fixed representative offer value (BDT 30).
    Offer-value adjustment is applied at runtime by the Node engine.
    """
    print("[train_model] Scoring all customers x campaign types...")

    OFFER_VALUE_FOR_SCORING = 30.0  # representative value

    # Build a base feature row for each customer
    cust_features = customers[CUSTOMER_FEATURES].copy()
    for col in CUSTOMER_FEATURES:
        cust_features[col] = pd.to_numeric(cust_features[col], errors="coerce").fillna(0)

    # Add history-side features with representative defaults for scoring
    # days_since_prev_campaign: use customer's own field (set at generation time)
    # fatigue_level: use campaign_received_last_90d as proxy
    cust_features["days_since_prev_campaign"] = pd.to_numeric(
        customers["days_since_prev_campaign"] if "days_since_prev_campaign" in customers.columns
        else 30, errors="coerce"
    ).fillna(30)
    cust_features["fatigue_level"] = pd.to_numeric(
        customers["campaign_received_last_90d"], errors="coerce"
    ).fillna(0).clip(0, 5)

    scores = {}

    for camp_type in CAMPAIGN_TYPES:
        camp_enc = float(CATEGORY_ENCODING[camp_type])
        n = len(customers)

        # Treated rows
        X_t1 = cust_features.values.copy().astype(float)
        camp_cols_t1 = np.full((n, 3), [camp_enc, OFFER_VALUE_FOR_SCORING, 1.0])
        X_t1 = np.hstack([X_t1, camp_cols_t1])

        # Control rows
        X_t0 = cust_features.values.copy().astype(float)
        camp_cols_t0 = np.full((n, 3), [camp_enc, OFFER_VALUE_FOR_SCORING, 0.0])
        X_t0 = np.hstack([X_t0, camp_cols_t0])

        p_t1 = model.predict_proba(X_t1)[:, 1]
        p_t0 = model.predict_proba(X_t0)[:, 1]
        uplift = p_t1 - p_t0

        for i, cid in enumerate(customers["customer_id"]):
            if cid not in scores:
                scores[cid] = {}
            scores[cid][camp_type] = {
                "uplift": round(float(uplift[i]), 5),
                "treatment_prob": round(float(p_t1[i]), 5),
                "control_prob":   round(float(p_t0[i]), 5),
            }

    print(f"[train_model] Scored {len(scores):,} customers")

    # Print uplift distribution stats
    for ct in CAMPAIGN_TYPES:
        vals = [scores[cid][ct]["uplift"] for cid in scores]
        print(f"  {ct:10s}  mean={np.mean(vals):.4f}  std={np.std(vals):.4f}  "
              f"p25={np.percentile(vals,25):.4f}  p75={np.percentile(vals,75):.4f}")

    return scores


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Compute per-customer explanations (top-3 SHAP-proxy feature drivers)
# ─────────────────────────────────────────────────────────────────────────────
def compute_explanations(model, customers: pd.DataFrame, scores: dict) -> dict:
    """
    Approximate SHAP: use feature importances from the model combined with
    customer feature values to generate a simple directional explanation.
    True SHAP for 10K × 4 types would be very slow — use importance × value proxy.
    """
    print("[train_model] Computing per-customer explanations...")

    importances = model.feature_importances_  # length = len(ALL_FEATURES)
    # Normalize
    importances = importances / importances.sum()

    # Feature direction: positive means higher value → more likely to convert/respond
    # Negative features: days_since_last_txn, campaign_received_last_90d, fatigue_level
    NEGATIVE_DIRECTION = {
        "days_since_last_txn",
        "campaign_received_last_90d",
        "fatigue_level",
    }

    # For each customer × campaign type, pick top-3 driving features
    # We use importance as proxy for impact magnitude
    explanations = {}

    # Pre-normalize customer feature values
    cust_arr = customers[CUSTOMER_FEATURES].copy()
    for col in CUSTOMER_FEATURES:
        cust_arr[col] = pd.to_numeric(cust_arr[col], errors="coerce").fillna(0)

    # Normalize each customer feature to [0,1] range (for display)
    feat_min = cust_arr.min()
    feat_max = cust_arr.max()
    cust_norm = (cust_arr - feat_min) / (feat_max - feat_min + 1e-9)

    for i, row in customers.iterrows():
        cid = row["customer_id"]
        cust_drivers = []

        for fi, feat in enumerate(CUSTOMER_FEATURES):
            raw_val = float(cust_arr.loc[i, feat])
            norm_val = float(cust_norm.loc[i, feat])
            direction = "negative" if feat in NEGATIVE_DIRECTION else "positive"
            impact_score = importances[fi] * (norm_val if direction == "positive" else (1 - norm_val))

            cust_drivers.append({
                "feature": feat,
                "label": FEATURE_LABELS[feat],
                "raw_value": round(raw_val, 4),
                "importance": round(float(importances[fi]), 5),
                "impact_score": round(float(impact_score), 6),
                "direction": direction,
            })

        # Sort by impact score descending, take top 5
        cust_drivers.sort(key=lambda x: x["impact_score"], reverse=True)
        top_drivers = cust_drivers[:5]

        # Label impact level
        for d in top_drivers:
            if d["importance"] > 0.10:
                d["impact"] = "high"
            elif d["importance"] > 0.05:
                d["impact"] = "medium"
            else:
                d["impact"] = "low"

        explanations[cid] = top_drivers

    print(f"[train_model] Explanations computed for {len(explanations):,} customers")
    return explanations


# ─────────────────────────────────────────────────────────────────────────────
# STEP 6: Build model meta (feature importances + score distributions)
# ─────────────────────────────────────────────────────────────────────────────
def build_model_meta(model, scores: dict) -> dict:
    importances = model.feature_importances_
    total = importances.sum()
    # Only include customer features (exclude campaign/treatment features from display)
    feat_imp = []
    for fi, feat in enumerate(CUSTOMER_FEATURES):
        feat_imp.append({
            "feature": feat,
            "label": FEATURE_LABELS[feat],
            "importance": round(float(importances[fi] / total), 5),
        })
    feat_imp.sort(key=lambda x: x["importance"], reverse=True)

    # Uplift distribution per campaign type (for dashboard histogram)
    dist = {}
    bins = [-0.15, -0.05, 0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50]
    for ct in CAMPAIGN_TYPES:
        vals = [scores[cid][ct]["uplift"] for cid in scores]
        counts, _ = np.histogram(vals, bins=bins)
        dist[ct] = {
            "bins": bins,
            "counts": counts.tolist(),
            "mean": round(float(np.mean(vals)), 5),
            "std":  round(float(np.std(vals)), 5),
            "p25":  round(float(np.percentile(vals, 25)), 5),
            "p75":  round(float(np.percentile(vals, 75)), 5),
        }

    return {
        "model_type": "S-Learner (GradientBoostingClassifier)",
        "n_estimators": 200,
        "feature_importances": feat_imp,
        "uplift_distributions": dist,
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 7: Write outputs
# ─────────────────────────────────────────────────────────────────────────────
def write_outputs(scores: dict, explanations: dict, model_meta: dict):
    # uplift_scores.json: {customer_id: {campaign_type: {uplift, treatment_prob, control_prob}}}
    with open(DATA_DIR / "uplift_scores.json", "w") as f:
        json.dump(scores, f, separators=(",", ":"))  # compact for size
    print(f"[train_model] Written uplift_scores.json")

    # model_meta.json: feature importances + distributions + explanations
    model_meta["customer_explanations"] = explanations
    with open(DATA_DIR / "model_meta.json", "w") as f:
        json.dump(model_meta, f, indent=2, default=str)
    print(f"[train_model] Written model_meta.json")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("Upay Campaign Intelligence — ML Training Pipeline")
    print("=" * 60)

    customers, history = load_data()
    train_df = build_train_matrix(customers, history)
    model    = train_model(train_df)
    scores   = score_customers(model, customers)
    exps     = compute_explanations(model, customers, scores)
    meta     = build_model_meta(model, scores)
    write_outputs(scores, exps, meta)

    print("\nML pipeline complete.")
    print("   uplift_scores.json  -- pre-computed uplift for all customers x campaign types")
    print("   model_meta.json     -- feature importances + per-customer explanations")
