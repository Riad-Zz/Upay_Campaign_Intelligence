"""
temporal_split.py
=================
Leakage-safe chronological train / validation / test split for campaign history.

DESIGN
------
The synthetic dataset assigns each campaign history record a campaign_week field
in ISO week format ("2025-Wnn", n in [1, 52]).

Weeks are extracted as integers from that string so that records can be
partitioned in strict chronological order:
    Train      : weeks  1 – 39   (2025-W01 to 2025-W39)
    Validation : weeks 40 – 47   (2025-W40 to 2025-W47)
    Test       : weeks 48 – 52   (2025-W48 to 2025-W52)

CUSTOMER-LEVEL LEAKAGE ANALYSIS
---------------------------------
The dataset contains *multiple records per customer* (one per campaign × customer
exposure). Customers can appear in multiple weeks.

Leakage risk: if a customer appears in both train and test, their observable
features (e.g. recharge_txn_rate) are the same cross-sectionally and come from
their customer profile (not their campaign outcome). The outcome (converted) is
sampled independently per campaign exposure based on their baseline probability
and treatment effect — it is NOT a single global outcome stored in the customer
record.

Therefore:
  - The same customer CAN appear in both train and test without leaking the
    outcome, because the outcomes are independent draws per campaign week.
  - However, to be conservative and scientifically rigorous, we implement a
    STRICT customer-level temporal split: a customer is assigned to the LATEST
    split stratum that contains any of their records.
  - This means: if a customer has ANY record in the test window, ALL of their
    records are removed from train/validation to prevent any possibility of the
    model seeing the same customer's profile during training and then evaluating
    on that same customer's outcomes in test.

USAGE
-----
    from evaluation.temporal_split import make_temporal_splits
    train_df, val_df, test_df = make_temporal_splits(history_df, config=CONFIG)
"""

import re
import pandas as pd
from typing import Tuple, Optional, Dict, Any


def _parse_week(week_str: str) -> int:
    """
    Extract ISO week number from a string like '2025-W07'.
    Returns the integer week number (1-52).
    """
    m = re.match(r"\d{4}-W(\d+)", str(week_str))
    if not m:
        raise ValueError(f"Cannot parse campaign_week: {week_str!r}")
    return int(m.group(1))


def make_temporal_splits(
    history_df: pd.DataFrame,
    config: Dict[str, Any],
    week_col: str = "campaign_week",
    customer_col: str = "customer_id",
    strict_customer_split: bool = False,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Produce chronological train / validation / test DataFrames from campaign history.

    Parameters
    ----------
    history_df : pd.DataFrame
        Full campaign history as loaded from campaign_history.json.
    config : dict
        Must contain config["split"] with keys:
          train      → {week_min, week_max}
          validation → {week_min, week_max}
          test       → {week_min, week_max}
    week_col : str
        Column name that holds the ISO week string ("campaign_week").
    customer_col : str
        Column name for customer identifier.
    strict_customer_split : bool
        If True (default), apply customer-level leakage protection:
        any customer with records in the test window is entirely excluded
        from train/validation. Any customer with records in the validation
        window is entirely excluded from train.

    Returns
    -------
    train_df, val_df, test_df : pd.DataFrame
    """
    split_cfg = config["split"]
    train_cfg = split_cfg["train"]
    val_cfg   = split_cfg["validation"]
    test_cfg  = split_cfg["test"]

    df = history_df.copy()

    # Parse week numbers
    df["_week_num"] = df[week_col].apply(_parse_week)

    # Initial temporal masks
    train_mask = (df["_week_num"] >= train_cfg["week_min"]) & (df["_week_num"] <= train_cfg["week_max"])
    val_mask   = (df["_week_num"] >= val_cfg["week_min"])   & (df["_week_num"] <= val_cfg["week_max"])
    test_mask  = (df["_week_num"] >= test_cfg["week_min"])  & (df["_week_num"] <= test_cfg["week_max"])

    if strict_customer_split:
        # Identify customers who appear in test — exclude them from train/val
        test_customers = set(df.loc[test_mask, customer_col].unique())
        # Identify customers who appear in validation — exclude them from train
        val_customers  = set(df.loc[val_mask, customer_col].unique())

        # Re-apply masks with customer exclusion
        train_df = df[train_mask & ~df[customer_col].isin(test_customers) & ~df[customer_col].isin(val_customers)].copy()
        val_df   = df[val_mask  & ~df[customer_col].isin(test_customers)].copy()
        test_df  = df[test_mask].copy()
    else:
        train_df = df[train_mask].copy()
        val_df   = df[val_mask].copy()
        test_df  = df[test_mask].copy()

    # Drop the helper column
    for d in (train_df, val_df, test_df):
        d.drop(columns=["_week_num"], inplace=True, errors="ignore")

    return train_df, val_df, test_df


def describe_splits(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Return a summary dictionary describing the three splits.
    Used in the evaluation report.
    """
    def _split_stats(df: pd.DataFrame, label: str) -> dict:
        return {
            "label":         label,
            "n_records":     len(df),
            "n_customers":   df["customer_id"].nunique() if "customer_id" in df.columns else None,
            "treatment_rate": round(df["was_treated"].mean(), 4)  if "was_treated" in df.columns else None,
            "conversion_rate": round(df["converted"].mean(), 4)   if "converted"   in df.columns else None,
        }

    split_cfg = config["split"]
    return {
        "train":      _split_stats(train_df, split_cfg["train_label"]),
        "validation": _split_stats(val_df,   split_cfg["validation_label"]),
        "test":       _split_stats(test_df,  split_cfg["test_label"]),
        "leakage_protection": "strict_customer_split",
    }
