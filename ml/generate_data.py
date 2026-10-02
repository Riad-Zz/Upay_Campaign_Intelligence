"""
generate_data.py
================
Generates synthetic customer and campaign history data for Upay Campaign Intelligence.

Design goals:
  - Realistic behavioral distributions for an MFS customer base
  - Heterogeneous treatment effects that the model must learn from observable features
  - Campaign fatigue encoded in history
  - Ground-truth causal variables are NEVER written to customers.json
  - The ML model can only recover uplift from observable behavioral features

Run:
  python generate_data.py
Outputs:
  ../data/customers.json
  ../data/campaign_history.json
"""

import json
import math
import random
import numpy as np
import pandas as pd
from pathlib import Path

# ── Reproducibility ──────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ── Paths ─────────────────────────────────────────────────────────────────────
OUT_DIR = Path(__file__).parent.parent / "data"
OUT_DIR.mkdir(exist_ok=True)

# ── Constants ─────────────────────────────────────────────────────────────────
N_CUSTOMERS = 10_000
N_CAMPAIGNS  = 80          # 80 historical campaigns over ~52 weeks
CAMPAIGN_TYPES = ["recharge", "merchant", "p2p", "bill"]
OFFER_VALUES   = [10, 20, 30, 50]
TREATMENT_RATIO = 0.70    # 70% treated, 30% control per campaign


# ─────────────────────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────────────────────
def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-float(np.clip(x, -30, 30))))


def clip01(x):
    return float(np.clip(x, 0.0, 1.0))


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Generate customer population
# ─────────────────────────────────────────────────────────────────────────────
def generate_customers(n: int) -> pd.DataFrame:
    rows = []

    # Segment proportions
    segment_probs = [0.12, 0.39, 0.27, 0.22]  # high_value, mid, low, dormant
    segments = np.random.choice(["high_value", "mid", "low", "dormant"],
                                 size=n, p=segment_probs)

    for i in range(n):
        seg = segments[i]
        cid = f"CUST_{i+1:05d}"

        # ── Tenure ───────────────────────────────────────────────────────────
        if seg == "high_value":
            tenure = int(np.random.normal(42, 10))
        elif seg == "mid":
            tenure = int(np.random.normal(24, 12))
        elif seg == "low":
            tenure = int(np.random.normal(14, 8))
        else:  # dormant
            tenure = int(np.random.normal(18, 14))
        tenure = max(1, min(60, tenure))

        # ── Transaction frequency ─────────────────────────────────────────────
        if seg == "high_value":
            txn_count = float(np.random.normal(28, 8))
        elif seg == "mid":
            txn_count = float(np.random.normal(14, 6))
        elif seg == "low":
            txn_count = float(np.random.normal(5, 3))
        else:
            txn_count = float(np.random.normal(1, 1))
        txn_count = max(0.5, txn_count)

        # ── Monthly GMV ───────────────────────────────────────────────────────
        if seg == "high_value":
            gmv = float(np.random.lognormal(9.4, 0.5))    # ~12,000 BDT median
        elif seg == "mid":
            gmv = float(np.random.lognormal(8.0, 0.5))    # ~3,000 BDT median
        elif seg == "low":
            gmv = float(np.random.lognormal(6.9, 0.5))    # ~1,000 BDT median
        else:
            gmv = float(np.random.lognormal(6.2, 0.6))    # ~500 BDT median
        gmv = round(max(100, min(80000, gmv)), 2)

        # ── Recency ───────────────────────────────────────────────────────────
        if seg == "dormant":
            days_since_last_txn = int(np.random.randint(30, 90))
        elif seg == "high_value":
            days_since_last_txn = int(np.random.randint(0, 7))
        elif seg == "mid":
            days_since_last_txn = int(np.random.randint(0, 21))
        else:
            days_since_last_txn = int(np.random.randint(7, 45))

        # ── Preferred category (drives heterogeneous treatment effects) ───────
        # Weights differ by segment
        if seg == "high_value":
            cat_weights = [0.30, 0.40, 0.20, 0.10]  # merchant heavy
        elif seg == "mid":
            cat_weights = [0.40, 0.25, 0.25, 0.10]  # recharge heavy
        elif seg == "low":
            cat_weights = [0.50, 0.15, 0.25, 0.10]  # recharge dominant
        else:
            cat_weights = [0.35, 0.20, 0.30, 0.15]  # mixed
        preferred_category = np.random.choice(CAMPAIGN_TYPES, p=cat_weights)

        # ── Category affinity rates ───────────────────────────────────────────
        # Primary category gets a high affinity; others get lower
        def affinity(cat):
            base = 0.6 if cat == preferred_category else 0.15
            return clip01(base + np.random.normal(0, 0.12))

        recharge_txn_rate = affinity("recharge")
        merchant_txn_rate = affinity("merchant")
        p2p_txn_rate      = affinity("p2p")
        bill_txn_rate     = affinity("bill")

        # Friday behavior (higher for lifestyle / recharge users)
        friday_base = 0.35 if preferred_category in ("recharge", "p2p") else 0.20
        friday_txn_rate = clip01(friday_base + np.random.normal(0, 0.12))

        # ── Historical campaign exposure ──────────────────────────────────────
        if seg == "high_value":
            camp_recv = int(np.random.poisson(2.5))
        elif seg == "mid":
            camp_recv = int(np.random.poisson(1.8))
        else:
            camp_recv = int(np.random.poisson(0.8))
        camp_recv = min(camp_recv, 8)

        # Response rate varies by segment
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

        days_since_prev_camp = int(np.random.randint(0, 90)) if camp_recv > 0 else 90

        # ── Dormancy flag ─────────────────────────────────────────────────────
        is_dormant = days_since_last_txn >= 30

        # ── Ground-truth baseline conversion probability ──────────────────────
        # (INTERNAL: used only for simulating outcomes below)
        # Model must recover this from observable features.
        baseline_logit = (
            -1.8
            + 0.025  * tenure
            + 0.040  * txn_count
            - 0.030  * days_since_last_txn
            + 0.8    * (seg == "high_value")
            + 0.3    * (seg == "mid")
            - 0.3    * (seg == "low")
            - 0.9    * (seg == "dormant")
            + 0.4    * (camp_resp / max(camp_recv, 1))   # responsiveness
            + np.random.normal(0, 0.25)
        )
        baseline_prob = sigmoid(baseline_logit)

        # ── Ground-truth treatment effects per campaign type ──────────────────
        # (INTERNAL: model must infer from observable features)
        # Key: treatment effect is CORRELATED with category affinity features
        def treatment_effect(cat):
            affinity_map = {
                "recharge": recharge_txn_rate,
                "merchant": merchant_txn_rate,
                "p2p":      p2p_txn_rate,
                "bill":     bill_txn_rate,
            }
            aff = affinity_map[cat]
            logit = (
                -1.6
                + 1.8  * aff                             # affinity drives response
                + 0.6  * friday_txn_rate * (cat == "recharge")  # Friday × recharge
                + 0.4  * (days_since_last_txn > 14)      # dormant can be reactivated
                - 0.5  * (camp_recv >= 3)                # fatigue reduces effect
                - 0.8  * baseline_prob                   # sure-things have low uplift
                + np.random.normal(0, 0.2)
            )
            raw_effect = sigmoid(logit) * 0.45           # cap at 0.45
            # Some customers (do-not-disturb) get negative treatment effect
            if aff < 0.08 and np.random.random() < 0.15:
                raw_effect = -abs(np.random.normal(0.05, 0.03))
            return float(raw_effect)

        te_recharge = treatment_effect("recharge")
        te_merchant = treatment_effect("merchant")
        te_p2p      = treatment_effect("p2p")
        te_bill     = treatment_effect("bill")

        rows.append({
            "customer_id": cid,
            "segment": seg,
            "tenure_months": tenure,
            "avg_monthly_txn_count": round(txn_count, 1),
            "avg_monthly_gmv_bdt": gmv,
            "preferred_category": preferred_category,
            "days_since_last_txn": days_since_last_txn,
            "campaign_received_last_90d": camp_recv,
            "campaign_responded_last_90d": camp_resp,
            "friday_txn_rate": round(friday_txn_rate, 4),
            "recharge_txn_rate": round(recharge_txn_rate, 4),
            "merchant_txn_rate": round(merchant_txn_rate, 4),
            "p2p_txn_rate": round(p2p_txn_rate, 4),
            "bill_txn_rate": round(bill_txn_rate, 4),
            "is_dormant": bool(is_dormant),
            "days_since_prev_campaign": days_since_prev_camp,
            # Internal — stripped before writing customers.json
            "_baseline_prob": baseline_prob,
            "_te_recharge": te_recharge,
            "_te_merchant": te_merchant,
            "_te_p2p": te_p2p,
            "_te_bill": te_bill,
        })

    df = pd.DataFrame(rows)
    print(f"[generate_data] Generated {len(df)} customers")
    print(df["segment"].value_counts().to_string())
    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Generate campaign history
# ─────────────────────────────────────────────────────────────────────────────
def generate_campaign_history(customers_df: pd.DataFrame) -> pd.DataFrame:
    cid_list = customers_df["customer_id"].tolist()
    cust_map = customers_df.set_index("customer_id").to_dict("index")

    records = []
    record_id = 0

    # Generate 80 historical campaigns over ~52 weeks
    weeks = [f"2025-W{w:02d}" for w in range(1, 53)]

    for camp_idx in range(N_CAMPAIGNS):
        camp_id    = f"CAMP_{camp_idx+1:04d}"
        camp_type  = CAMPAIGN_TYPES[camp_idx % len(CAMPAIGN_TYPES)]
        offer_val  = OFFER_VALUES[camp_idx % len(OFFER_VALUES)]
        camp_week  = weeks[camp_idx % len(weeks)]

        # Sample ~30-60% of customers per campaign (not everyone is targeted)
        n_eligible = int(np.random.uniform(0.3, 0.6) * N_CUSTOMERS)
        eligible_ids = np.random.choice(cid_list, size=n_eligible, replace=False)

        for cid in eligible_ids:
            c = cust_map[cid]
            was_treated = int(np.random.random() < TREATMENT_RATIO)

            # Fatigue at time of this historical campaign
            hist_fatigue = min(c["campaign_received_last_90d"], 5)

            # Offer size multiplier on treatment effect
            offer_mult = {10: 0.6, 20: 0.8, 30: 1.0, 50: 1.3}[offer_val]

            # Ground-truth treatment effect for this campaign type
            te_key = f"_te_{camp_type}"
            te_raw = c.get(te_key, 0.1)
            te = te_raw * offer_mult * max(0.1, 1.0 - 0.2 * hist_fatigue)
            te = float(np.clip(te, -0.15, 0.5))

            # Conversion probability
            if was_treated:
                convert_prob = float(np.clip(c["_baseline_prob"] + te, 0.01, 0.99))
            else:
                convert_prob = float(np.clip(c["_baseline_prob"], 0.01, 0.99))

            converted = int(np.random.random() < convert_prob)

            days_since_prev = int(np.random.randint(0, 90)) if camp_idx > 0 else 90

            records.append({
                "record_id": f"REC_{record_id:07d}",
                "campaign_id": camp_id,
                "campaign_type": camp_type,
                "offer_value_bdt": offer_val,
                "customer_id": cid,
                "was_treated": was_treated,
                "converted": converted,
                "campaign_week": camp_week,
                "days_since_prev_campaign": days_since_prev,
                "fatigue_level": hist_fatigue,
                "segment": c["segment"],
            })
            record_id += 1

    df = pd.DataFrame(records)
    print(f"[generate_data] Generated {len(df)} campaign history records")
    print(f"  Treatment rate: {df['was_treated'].mean():.1%}")
    print(f"  Overall conversion rate: {df['converted'].mean():.1%}")
    print(f"  Treated conversion: {df[df.was_treated==1]['converted'].mean():.1%}")
    print(f"  Control conversion:  {df[df.was_treated==0]['converted'].mean():.1%}")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Write outputs
# ─────────────────────────────────────────────────────────────────────────────
def write_outputs(customers_df: pd.DataFrame, history_df: pd.DataFrame):
    # Strip internal ground-truth fields before writing customers.json
    internal_cols = [c for c in customers_df.columns if c.startswith("_")]
    customers_clean = customers_df.drop(columns=internal_cols)

    customers_records = customers_clean.to_dict(orient="records")
    with open(OUT_DIR / "customers.json", "w") as f:
        json.dump(customers_records, f, indent=2, default=str)
    print(f"[generate_data] Written {len(customers_records)} customers -> data/customers.json")

    history_records = history_df.to_dict(orient="records")
    with open(OUT_DIR / "campaign_history.json", "w") as f:
        json.dump(history_records, f, indent=2, default=str)
    print(f"[generate_data] Written {len(history_records)} history records -> data/campaign_history.json")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("Upay Campaign Intelligence — Synthetic Data Generator")
    print("=" * 60)

    customers_df = generate_customers(N_CUSTOMERS)
    history_df   = generate_campaign_history(customers_df)
    write_outputs(customers_df, history_df)

    print("\nDone. Data generation complete.")
    print(f"   customers.json        -> {N_CUSTOMERS:,} rows")
    print(f"   campaign_history.json -> {len(history_df):,} rows")
