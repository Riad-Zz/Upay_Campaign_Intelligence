"""
metrics.py
==========
Uplift-specific evaluation metrics for Phase 1 causal evaluation.

Implements:
  - Qini curve
  - Qini coefficient
  - AUUC (Area Under the Uplift Curve)
  - Uplift@k% (incremental effect when targeting top-k% by predicted uplift)
  - Policy value (expected incremental outcome under uplift-model policy vs random)

SCIENTIFIC NOTES
----------------
These metrics evaluate whether the model correctly RANKS customers by their
incremental treatment effect — not whether it predicts absolute probabilities.

The S-Learner provides an *estimate* of the conditional average treatment effect
(CATE). We cannot claim true causal identification from a single observational
dataset. However, we CAN evaluate whether the rank order of predicted uplift is
informative by using Qini / AUUC.

QINI CURVE
----------
Algorithm (Radcliffe & Surry, 2011):
  1. Rank all TEST-set customers by predicted uplift descending.
  2. For each percentile threshold φ:
       Treated(φ)  = treated customers in top φ%
       Control(φ)  = control customers in top φ%
       Incr(φ)     = outcomes_treated(φ) / N_treated(φ)
                   - outcomes_control(φ) / N_control(φ)   [if control > 0]
       Qini(φ)     = Incr(φ) × N_treated(φ) / N_total
  3. Plot Qini(φ) vs φ.

QINI COEFFICIENT
----------------
  Q = (AUC_model - AUC_random) / AUC_random
where areas are computed numerically using the trapezoidal rule.

AUUC
----
  AUUC = AUC of the uplift curve (treated_rate - control_rate vs targeting %)
A perfect model has AUUC > 0; random targeting has AUUC ≈ 0.

UPLIFT@k%
---------
  Uplift@k% = [conv_treated / n_treated - conv_control / n_control]
              for the top-k% of customers ranked by predicted uplift.

POLICY VALUE
------------
  PV = E[Y | T=1, top-k% selected] × prev_treated_rate
     - E[Y | T=0, bottom (100-k%) not selected] × …
  Simplified: mean(converted) for model-selected vs mean(converted) for unselected,
  restricted to the test set, using the observed outcomes (not counterfactuals).
  We compare:
    - Model policy (target top-50% uplift customers)
    - Random policy (randomly target 50%)
  Policy value = model_treated_conv_rate - random_treated_conv_rate
"""

import numpy as np
import pandas as pd
from typing import Dict, Tuple, List


# ─────────────────────────────────────────────────────────────────────────────
# Core helpers
# ─────────────────────────────────────────────────────────────────────────────

def _validate_inputs(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
) -> None:
    assert len(y) == len(treatment) == len(uplift_pred), \
        "y, treatment, uplift_pred must have the same length"
    assert set(np.unique(treatment)).issubset({0, 1}), \
        "treatment must be binary (0 or 1)"
    assert set(np.unique(y)).issubset({0, 1}), \
        "y must be binary (0 or 1)"


def _sort_by_uplift(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Sort arrays by predicted uplift descending."""
    idx = np.argsort(-uplift_pred)
    return y[idx], treatment[idx], uplift_pred[idx]


# ─────────────────────────────────────────────────────────────────────────────
# Qini curve
# ─────────────────────────────────────────────────────────────────────────────

def qini_curve(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
    n_bins: int = 100,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute the Qini curve.

    Parameters
    ----------
    y           : binary outcome array (0/1)
    treatment   : binary treatment array (0=control, 1=treated)
    uplift_pred : predicted uplift scores (continuous)
    n_bins      : number of points on the curve

    Returns
    -------
    proportions : array of targeting fractions (0…1)
    qini_values : Qini statistic at each fraction
    random_line : linear baseline (Qini for random targeting)
    """
    _validate_inputs(y, treatment, uplift_pred)
    y, treatment, uplift_pred = _sort_by_uplift(y, treatment, uplift_pred)

    n = len(y)
    n_treated_total = treatment.sum()
    n_control_total = (1 - treatment).sum()

    if n_treated_total == 0 or n_control_total == 0:
        raise ValueError("Need both treated and control units in the evaluation set.")

    # Cutpoints: 0%, 1%, 2%, … , 100% of the ranked population
    cutpoints = np.linspace(0, n, n_bins + 1, dtype=int)

    proportions  = []
    qini_values  = []

    for k in cutpoints:
        if k == 0:
            proportions.append(0.0)
            qini_values.append(0.0)
            continue

        top_y  = y[:k]
        top_t  = treatment[:k]

        nt = top_t.sum()
        nc = (1 - top_t).sum()

        if nt == 0 or nc == 0:
            # Only one group represented — skip this point
            proportions.append(k / n)
            qini_values.append(qini_values[-1] if qini_values else 0.0)
            continue

        conv_t = top_y[top_t == 1].sum()
        conv_c = top_y[top_t == 0].sum()

        # Qini statistic at this cutpoint:
        # (incremental converted treated) - (expected incremental from random)
        # = conv_t - conv_c * (nt / nc)
        qini = conv_t - conv_c * (nt / nc)

        proportions.append(k / n)
        qini_values.append(qini)

    proportions = np.array(proportions)
    qini_values = np.array(qini_values)

    # Random-targeting baseline: a straight line from (0,0) to (1, total_qini_at_random)
    # Under random targeting, qini_at_1.0 = conv_treated - conv_control * (n_treated/n_control)
    # which equals the overall ATE × n_treated
    total_conv_t = y[treatment == 1].sum()
    total_conv_c = y[treatment == 0].sum()
    qini_at_full = total_conv_t - total_conv_c * (n_treated_total / n_control_total)
    random_line  = proportions * qini_at_full

    return proportions, qini_values, random_line


# ─────────────────────────────────────────────────────────────────────────────
# Qini coefficient
# ─────────────────────────────────────────────────────────────────────────────

def qini_coefficient(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
    n_bins: int = 100,
) -> float:
    """
    Qini coefficient = (AUC_model - AUC_random) / N_treated_total

    Normalized by N_treated so it's comparable across datasets of different sizes.

    A positive value means the model ranks better than random.
    A value near 0 means the model is no better than random.
    A negative value means the model is WORSE than random targeting.

    Returns
    -------
    float : Qini coefficient
    """
    proportions, qini_values, random_line = qini_curve(y, treatment, uplift_pred, n_bins)

    auc_model  = np.trapezoid(qini_values, proportions)
    auc_random = np.trapezoid(random_line,  proportions)

    n_treated = treatment.sum()
    if n_treated == 0:
        return 0.0

    q = (auc_model - auc_random) / n_treated
    return float(q)


# ─────────────────────────────────────────────────────────────────────────────
# AUUC (Area Under the Uplift Curve)
# ─────────────────────────────────────────────────────────────────────────────

def uplift_curve(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
    n_bins: int = 100,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute the uplift curve.

    For each targeting fraction φ:
        uplift(φ) = treated_conv_rate(φ) - control_conv_rate(φ)
    where treated_conv_rate(φ) and control_conv_rate(φ) are computed over
    the top φ% of ranked customers.

    Returns
    -------
    proportions    : targeting fractions (0…1)
    uplift_values  : incremental uplift at each fraction
    random_line    : constant horizontal line at overall ATE (random baseline)
    """
    _validate_inputs(y, treatment, uplift_pred)
    y, treatment, uplift_pred = _sort_by_uplift(y, treatment, uplift_pred)

    n = len(y)
    cutpoints = np.linspace(0, n, n_bins + 1, dtype=int)

    proportions   = []
    uplift_values = []

    for k in cutpoints:
        if k == 0:
            proportions.append(0.0)
            uplift_values.append(0.0)
            continue

        top_y = y[:k]
        top_t = treatment[:k]

        nt = top_t.sum()
        nc = (1 - top_t).sum()

        if nt == 0 or nc == 0:
            proportions.append(k / n)
            uplift_values.append(uplift_values[-1] if uplift_values else 0.0)
            continue

        tr  = top_y[top_t == 1].mean()
        cr  = top_y[top_t == 0].mean()
        proportions.append(k / n)
        uplift_values.append(float(tr - cr))

    proportions   = np.array(proportions)
    uplift_values = np.array(uplift_values)

    # Random baseline: overall ATE
    n_treated_total = treatment.sum()
    n_control_total = (1 - treatment).sum()
    ate = (y[treatment == 1].sum() / n_treated_total) - (y[treatment == 0].sum() / n_control_total)
    random_line = np.full_like(proportions, ate)

    return proportions, uplift_values, random_line


def auuc(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
    n_bins: int = 100,
) -> float:
    """
    AUUC = Area Under the Uplift Curve, minus the random-baseline area.

    AUUC > 0 → model better than random targeting
    AUUC ≈ 0 → model indistinguishable from random
    AUUC < 0 → model worse than random

    Returns
    -------
    float : AUUC
    """
    proportions, uplift_values, random_line = uplift_curve(y, treatment, uplift_pred, n_bins)

    auc_model  = np.trapezoid(uplift_values, proportions)
    auc_random = np.trapezoid(random_line,   proportions)

    return float(auc_model - auc_random)


# ─────────────────────────────────────────────────────────────────────────────
# Uplift@k%
# ─────────────────────────────────────────────────────────────────────────────

def uplift_at_k(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
    k: float = 0.10,
) -> float:
    """
    Uplift at top-k% of ranked customers.

    Computes the incremental conversion rate (treated_rate - control_rate)
    within the top-k% of customers ranked by predicted uplift.

    Parameters
    ----------
    k : float
        Fraction between 0 and 1 (e.g. 0.10 for top 10%).

    Returns
    -------
    float : incremental conversion rate at top-k%
            NaN if there are no treated or control units in the top-k%.
    """
    _validate_inputs(y, treatment, uplift_pred)
    y, treatment, uplift_pred = _sort_by_uplift(y, treatment, uplift_pred)

    n = len(y)
    cutoff = max(1, int(np.ceil(k * n)))

    top_y = y[:cutoff]
    top_t = treatment[:cutoff]

    nt = top_t.sum()
    nc = (1 - top_t).sum()

    if nt == 0 or nc == 0:
        return float("nan")

    tr = top_y[top_t == 1].mean()
    cr = top_y[top_t == 0].mean()
    return float(tr - cr)


# ─────────────────────────────────────────────────────────────────────────────
# Policy value
# ─────────────────────────────────────────────────────────────────────────────

def policy_value(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
    targeting_fraction: float = 0.50,
) -> Dict[str, float]:
    """
    Compare the outcome of an uplift-model policy vs a random policy.

    The model policy selects the top `targeting_fraction` of customers
    by predicted uplift and treats them.

    The random policy randomly selects the same fraction.

    Because we only have OBSERVED outcomes (not counterfactuals), we
    evaluate both policies on the TREATED sub-group of the test set:
      - Among customers selected by model policy who were ACTUALLY treated,
        what was the observed conversion rate?
      - Compare to the overall treated conversion rate (random baseline).

    This is a simplified but honest policy evaluation using observational data.
    It does NOT claim counterfactual validity.

    Parameters
    ----------
    targeting_fraction : float
        Fraction of customers to target (e.g. 0.50 = top 50%).

    Returns
    -------
    dict with keys:
        model_treated_conv_rate   : conversion rate of treated units in model selection
        random_treated_conv_rate  : overall treated conversion rate (random baseline)
        policy_value              : difference (model - random)
        n_model_selected          : number of customers selected by model
        n_model_treated           : number of treated units in model selection
    """
    _validate_inputs(y, treatment, uplift_pred)
    y_sorted, t_sorted, _ = _sort_by_uplift(y, treatment, uplift_pred)

    n = len(y_sorted)
    cutoff = max(1, int(np.ceil(targeting_fraction * n)))

    top_y = y_sorted[:cutoff]
    top_t = t_sorted[:cutoff]

    # Model policy: treated customers within model's selection
    model_treated_mask = (top_t == 1)
    n_model_treated = model_treated_mask.sum()
    model_treated_conv_rate = (
        float(top_y[model_treated_mask].mean()) if n_model_treated > 0 else float("nan")
    )

    # Random baseline: overall treated conversion rate across entire test set
    n_treated_total = treatment.sum()
    random_treated_conv_rate = (
        float(y[treatment == 1].mean()) if n_treated_total > 0 else float("nan")
    )

    pv = (
        model_treated_conv_rate - random_treated_conv_rate
        if not (np.isnan(model_treated_conv_rate) or np.isnan(random_treated_conv_rate))
        else float("nan")
    )

    return {
        "model_treated_conv_rate":  round(model_treated_conv_rate, 6) if not np.isnan(model_treated_conv_rate) else None,
        "random_treated_conv_rate": round(random_treated_conv_rate, 6),
        "policy_value":             round(pv, 6) if not np.isnan(pv) else None,
        "n_model_selected":         int(cutoff),
        "n_model_treated":          int(n_model_treated),
        "targeting_fraction":       targeting_fraction,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Bundle all metrics
# ─────────────────────────────────────────────────────────────────────────────

def compute_all_metrics(
    y: np.ndarray,
    treatment: np.ndarray,
    uplift_pred: np.ndarray,
    n_bins: int = 100,
) -> Dict[str, float]:
    """
    Compute all Phase 1 uplift evaluation metrics in one call.

    Returns
    -------
    dict with keys:
        qini_coefficient
        auuc
        uplift_at_10
        uplift_at_20
        policy_value       (at 50% targeting)
        overall_ate        (observed ATE for reference)
        n_test             total test records
        n_treated_test     treated in test
        n_control_test     control in test
        treated_conv_rate  overall treated conversion rate
        control_conv_rate  overall control conversion rate
    """
    _validate_inputs(y, treatment, uplift_pred)

    n_total   = len(y)
    n_treated = int(treatment.sum())
    n_control = int((1 - treatment).sum())

    treated_conv = float(y[treatment == 1].mean()) if n_treated > 0 else 0.0
    control_conv = float(y[treatment == 0].mean()) if n_control > 0 else 0.0
    ate          = treated_conv - control_conv

    qini_coef = qini_coefficient(y, treatment, uplift_pred, n_bins)
    auuc_val  = auuc(y, treatment, uplift_pred, n_bins)
    u10       = uplift_at_k(y, treatment, uplift_pred, k=0.10)
    u20       = uplift_at_k(y, treatment, uplift_pred, k=0.20)
    pv        = policy_value(y, treatment, uplift_pred, targeting_fraction=0.50)

    return {
        "qini_coefficient":      round(qini_coef, 6),
        "auuc":                  round(auuc_val, 6),
        "uplift_at_10":          round(u10, 6) if not np.isnan(u10) else None,
        "uplift_at_20":          round(u20, 6) if not np.isnan(u20) else None,
        "policy_value":          pv["policy_value"],
        "policy_value_detail":   pv,
        "overall_ate":           round(ate, 6),
        "n_test":                n_total,
        "n_treated_test":        n_treated,
        "n_control_test":        n_control,
        "treated_conv_rate":     round(treated_conv, 6),
        "control_conv_rate":     round(control_conv, 6),
    }
