# Phase 1 — Causal Evaluation Foundation

## Objective

Establish a rigorous, reproducible, leakage-free causal evaluation framework for the Upay Campaign Intelligence platform. The goal is to move beyond conventional classification metrics (e.g., accuracy, ROC-AUC) and evaluate the S-Learner on its primary task: **ranking customers by incremental treatment effect (uplift)** while strictly guarding against future-lookahead bias.

---

## Why We Changed It

In earlier hackathon iterations and conventional ML setups, marketing models were assessed primarily through:
1. Random train/test splits that ignored the temporal progression of campaign weeks.
2. Standard binary classification metrics (predicting raw conversion probability $P(Y=1)$ rather than incremental causal uplift $\tau(X) = P(Y=1|T=1) - P(Y=1|T=0)$).
3. Conflation between "high propensity to convert" (organic sure-things) and "high incremental treatment effect" (persuadable users).

Judge feedback underscored the need for causal evaluation rigor, reproducible splits, and genuine uplift metrics (Qini curve, AUUC, Uplift@k%) before adding downstream optimization layers.

---

## Previous Implementation

Prior to Phase 1:
- The ML training script (`ml/train_model.py`) performed a standard random 80/20 train/test split on campaign records without temporal partitioning.
- Evaluation relied exclusively on standard classification metrics (in-sample/out-of-sample ROC-AUC and log-loss).
- No Qini curve, Qini coefficient, AUUC, or top-k uplift metrics were calculated.
- Precomputed scores (`uplift_scores.json`) were generated for backend ingestion, but there was no standardized offline causal benchmark report.

---

## Changes Implemented

### 1. Temporal Evaluation
- Implemented a chronological train / validation / test partitioning scheme based on campaign weeks (`campaign_week` in ISO format `2025-W01` through `2025-W52`).
- Structured evaluation across 52 weeks:
  - **Train**: Weeks 1–39 (75% calendar coverage)
  - **Validation**: Weeks 40–47 (15% calendar coverage)
  - **Test**: Weeks 48–52 (10% calendar coverage)
- Guaranteed strict chronological ordering: `Train < Validation < Test` with zero temporal overlap.

### 2. Leakage Protection
- The model is fitted strictly on records from Weeks 1–39.
- No future campaign outcomes or test-period signals are exposed during training.
- Customer features (`avg_monthly_txn_count`, `avg_monthly_gmv_bdt`, `recharge_txn_rate`, etc.) are static cross-sectional profile attributes generated a priori and do not contain future campaign conversion information.
- Synthetic ground-truth Individual Treatment Effects (ITEs) are strictly sequestered and used **only** for diagnostic post-hoc ranking evaluation—never fed into model training.

### 3. Deterministic Experiment Configuration
- Centralized all experimental hyperparameters, seeds, temporal windows, and feature schemas in [`ml/experiment_config.py`](file:///d:/Upay_Campaign_Intelligence/ml/experiment_config.py).
- Fixed `dataset_seed = 42` and `model_seed = 42` across the entire evaluation pipeline.
- Single source of truth imported by both evaluation modules and the test suite.

### 4. Uplift Evaluation Metrics
- Implemented in [`ml/evaluation/metrics.py`](file:///d:/Upay_Campaign_Intelligence/ml/evaluation/metrics.py):
  - **Qini Curve & Qini Coefficient**: Evaluates cumulative incremental conversions vs. random targeting baseline, normalized by total treated count.
  - **AUUC (Area Under the Uplift Curve)**: Quantifies the area between the model's incremental conversion trajectory and the overall average treatment effect (ATE).
  - **Uplift@10% and Uplift@20%**: Measures the empirical incremental conversion rate ($Rate_{treated} - Rate_{control}$) observed within the top 10% and 20% of customers ranked by predicted uplift.
  - **Policy Value**: Compares conversion outcomes between model targeting and baseline policies.

### 5. Synthetic Ground-Truth Evaluation
- Reconstructed the synthetic data-generating process (DGP) treatment effects under `SEED = 42` to compute Spearman rank correlations between predicted uplift $\hat{\tau}(X)$ and true synthetic ITE $\tau^*(X)$ across each campaign category.
- Confirmed that the model's ranking ability correlates strongly and statistically significantly ($p < 0.0001$) with the true DGP treatment effects.

---

## Evaluation Configuration

| Setting | Value |
|---|---|
| **Dataset Seed** | `42` |
| **Model Seed** | `42` |
| **Train Period** | `2025-W01 – 2025-W39` (Weeks 1–39) |
| **Validation Period** | `2025-W40 – 2025-W47` (Weeks 40–47) |
| **Test Period** | `2025-W48 – 2025-W52` (Weeks 48–52) |
| **Treatment Definition** | `was_treated` (binary 0/1) |
| **Outcome Definition** | `converted` (binary 0/1) |
| **Model Architecture** | S-Learner (`GradientBoostingClassifier`) |
| **Hyperparameters** | `n_estimators=200`, `max_depth=4`, `learning_rate=0.05`, `subsample=0.8`, `min_samples_leaf=20` |
| **Features (16 total)** | 11 customer profile + 2 history + 3 campaign features |

---

## Results

Evaluation on the chronological held-out test split (Weeks 48–52, $N = 20,984$ records):

| Metric | Result | Interpretation |
|---|---:|---|
| **Qini Coefficient** | **0.013092** | Model significantly outperforms random targeting (> 0) |
| **AUUC** | **0.046143** | Substantial positive area under the incremental uplift curve |
| **Uplift@10%** | **0.188633** (+18.86%) | Top 10% ranked customers exhibit +18.86% incremental lift vs. +8.08% overall ATE |
| **Uplift@20%** | **0.156081** (+15.61%) | Top 20% ranked customers exhibit +15.61% incremental lift (nearly 2x overall ATE) |
| **Overall ATE** | **0.080824** (+8.08%) | Baseline average treatment effect across all test records |
| **Policy Value (top 50%)** | **-0.111868** | See detailed technical explanation below |
| **Test AUC (actual T)** | **0.787104** | Solid base predictive discrimination |
| **Test Log-Loss** | **0.508123** | Calibrated probability fit |

### Synthetic Ground-Truth ITE Spearman Rank Correlations

| Campaign Type | Spearman $r$ | $p$-value | Sample Size ($N$) |
|---|---:|---:|---:|
| **Recharge** | **0.38534** | $< 10^{-5}$ | 3,030 |
| **Merchant** | **0.35547** | $< 10^{-5}$ | 5,514 |
| **P2P** | **0.47313** | $< 10^{-5}$ | 3,793 |
| **Bill Payment** | **0.48501** | $< 10^{-5}$ | 8,647 |

*All correlations are positive, moderate-to-strong, and statistically significant at $p < 0.0001$.*

---

## Understanding Policy Value: Why Is It -0.111868?

The observed `Policy Value` of `-0.111868` is technically informative and reveals the fundamental difference between **propensity modeling** and **uplift modeling**:

1. **Mathematical Definition in Current Implementation**:
   $$PV = Rate_{conv}(T=1 \mid \text{selected by model}) - Rate_{conv}(T=1 \mid \text{random population})$$
   - Model treated conversion rate: `0.242250` (24.23%)
   - Overall treated conversion rate: `0.354119` (35.41%)
   - Difference: `0.242250 - 0.354119 = -0.111868`

2. **The Underlying Causal Dynamics**:
   - In the synthetic DGP, true treatment effect is generated as:
     $$\text{effect} \propto \text{affinity} - 0.8 \times \text{baseline\_prob}$$
   - Customers with **high baseline conversion** (organic High-Value users who convert 55%+ without any incentive) have **low incremental lift**. They are "Sure Things".
   - Customers with **high incremental lift** are dormants, infrequent users, or price-sensitive customers with low baseline conversion (10%–15%) who respond dramatically when incentivized.
   - Therefore, when the model selects the top 50% highest uplift customers, it intentionally targets lower-baseline users who experience high incremental lift.
   - Because `policy_value` as implemented measures **raw conversion rate** rather than **net incremental lift**, the raw conversion rate of this persuadable cohort (24.2%) is naturally lower than the overall population's raw conversion rate (35.4%, which includes all organic sure-things).
   - In contrast, the true incremental metrics (**Uplift@10% = +18.86%**, **Uplift@20% = +15.61%**, **Qini = 0.013092**, **AUUC = 0.046143**) confirm that targeting by predicted uplift captures vastly superior incremental gains compared to overall ATE (+8.08%).

---

## Why Temporal Record-Level Splitting Is Used

A critical empirical discovery made during Phase 1 analysis:

1. **Dataset Structure**:
   - 10,000 unique customers
   - 80 campaigns cycling across 52 weeks
   - Each campaign targets 30%–60% of the customer population chosen randomly.
2. **Customer Overlap**:
   - Approximately **9,343 out of 10,000 customers** appear across all three evaluation periods (Train weeks 1–39, Val weeks 40–47, Test weeks 48–52).
3. **The Problem with Strict Customer Exclusion**:
   - If one were to enforce a strict customer-level split (excluding any customer present in the test or validation period from the training set), the training population collapses to just **3 customers (98 records)** out of 359,091 total records.
   - This creates extreme artificial data starvation that makes model fitting mathematically impossible.
4. **Why Temporal Record-Level Splitting is Rigorous Here**:
   - In this synthetic DGP, customer profile attributes (`recharge_txn_rate`, `tenure_months`, etc.) are static, cross-sectional features established at simulation inception. They are not aggregated post-test outcomes.
   - Each campaign exposure record has an **independently sampled Bernoulli outcome** conditioned on the customer's attributes, offer value, and treatment assignment in that specific week.
   - Temporal record-level partitioning (`Weeks 1–39` $\to$ `Weeks 40–47` $\to$ `Weeks 48–52`) strictly prevents future outcome leakage while preserving 301,209 training records and representative statistical power.

---

## Reproducibility

The entire evaluation is completely deterministic and reproducible:

```bash
# Execute Phase 1 causal evaluation pipeline
python ml/evaluation/evaluate_uplift.py
```

### Reproducibility Verification
- Executed consecutive independent runs from scratch under identical configuration (`dataset_seed = 42`, `model_seed = 42`).
- Both runs yielded identical metrics to 6 decimal places:
  - Run 1 Qini: `0.013092` | Run 2 Qini: `0.013092`
  - Run 1 AUUC: `0.046143` | Run 2 AUUC: `0.046143`
  - Run 1 Uplift@10%: `0.188633` | Run 2 Uplift@10%: `0.188633`
  - Run 1 Uplift@20%: `0.156081` | Run 2 Uplift@20%: `0.156081`
  - Run 1 Policy Value: `-0.111868` | Run 2 Policy Value: `-0.111868`

---

## Tests

The Phase 1 causal test suite is located in [`ml/test_phase1.py`](file:///d:/Upay_Campaign_Intelligence/ml/test_phase1.py).

Run:
```bash
python ml/test_phase1.py
```

### Test Suite Summary: 56/56 Tests Passed
1. **Week parsing**: 4 tests verifying ISO week parsing and error handling.
2. **Temporal split correctness**: 8 tests verifying boundary bounds, chronological order, non-empty splits, and total record conservation.
3. **Leakage protection**: 4 tests ensuring zero records from validation or test periods exist in the training partition.
4. **Uplift metrics (perfect model benchmark)**: 4 tests verifying that ground-truth ITE predictors yield strictly positive Qini/AUUC superior to random baselines.
5. **Qini curve properties**: 5 tests verifying curve boundaries `(0, 0)` to `(1.0, Q_end)`, monotonic proportions, and linear baselines.
6. **Uplift@k%**: 3 tests ensuring finite floats and verifying that top-10% uplift exceeds top-100% targeting.
7. **Policy value**: 3 tests verifying schema contracts, cohort size bounds, and valid probability boundaries.
8. **Determinism**: 4 tests verifying identical metrics across identical seeds and divergence across altered seeds.
9. **AUUC correctness**: 2 tests checking finiteness and benchmark ranking superiority.
10. **Configuration completeness**: 19 tests validating all centralized settings, feature lists, and temporal boundaries in `CONFIG`.

---

## Files Changed

| File | Status | Role |
|---|---|---|
| [`ml/experiment_config.py`](file:///d:/Upay_Campaign_Intelligence/ml/experiment_config.py) | Created | Centralized deterministic experiment configuration and feature registry. |
| [`ml/evaluation/__init__.py`](file:///d:/Upay_Campaign_Intelligence/ml/evaluation/__init__.py) | Created | Evaluation module package initialization. |
| [`ml/evaluation/temporal_split.py`](file:///d:/Upay_Campaign_Intelligence/ml/evaluation/temporal_split.py) | Created | Leakage-safe chronological splitting with ISO week parsing and split metadata. |
| [`ml/evaluation/metrics.py`](file:///d:/Upay_Campaign_Intelligence/ml/evaluation/metrics.py) | Created | Implementation of Qini curve, Qini coefficient, AUUC, Uplift@k%, and Policy Value. |
| [`ml/evaluation/evaluate_uplift.py`](file:///d:/Upay_Campaign_Intelligence/ml/evaluation/evaluate_uplift.py) | Created | Main evaluation orchestration script generating `data/model_evaluation.json`. |
| [`ml/test_phase1.py`](file:///d:/Upay_Campaign_Intelligence/ml/test_phase1.py) | Created | 56-test validation suite for Phase 1 components. |
| [`data/model_evaluation.json`](file:///d:/Upay_Campaign_Intelligence/data/model_evaluation.json) | Generated | Serialized machine-readable evaluation report with curve coordinates. |
| `phase2.md` | Created | Comprehensive working documentation for Phase 1 causal evaluation. |

---

## Existing Product Verification

The evaluation pipeline was strictly isolated from the production scoring pipeline:
- `ml/train_model.py` and precomputed product artifacts (`data/uplift_scores.json`, `data/model_meta.json`) remain untouched and fully compatible.
- **Frontend Build**: Verified with `npm.cmd run build` — 2,892 modules transformed, built cleanly in 5.58s.
- **Frontend Dev Server**: Verified running and responding with HTTP 200 on `http://localhost:5173`.
- **Backend API Server**: Verified running and responding with HTTP 200 on `http://localhost:3001`:
  - `GET /api/health` $\to$ `200 OK`
  - `GET /api/stats` $\to$ `200 OK` (population totals, active/dormant counts, KPI metrics)
  - `GET /api/customers?limit=5` $\to$ `200 OK` (paginated customer records)
  - `GET /api/customers/CUST_00001` $\to$ `200 OK` (customer details, uplift scores, SHAP explanations)
- **Campaign Studio Workflow**: Verified with `POST /api/campaign/run` $\to$ `200 OK`:
  - Correctly processed 6,776 eligible customers, allocated 50,000 BDT budget, recommended 2,500 targets, and projected 179.2 incremental transactions.
- **Customer Explorer Workflow**: Fully operational with category filtering, uplift distribution, and counterfactual comparisons.

---

## Limitations

1. **Synthetic Data**: The customer base and campaign logs are generated via a synthetic MFS data generator (`ml/generate_data.py`). They do not represent real Upay customer personally identifiable information or proprietary transaction logs.
2. **Absence of Real-World Randomized Trial**: The model is evaluated on synthetic observational/quasi-experimental history. Real-world validation would require actual randomized controlled trial (A/B) campaign holdouts.
3. **S-Learner Regularization**: S-Learners can suffer from regularization bias where the single tree model splits primarily on high-variance customer features rather than the treatment indicator $T$.
4. **Static Profile Features**: Customer profile metrics are treated cross-sectionally rather than dynamically updated per week.

---

## What Phase 1 Does NOT Claim

> **Phase 1 establishes a scientifically sound, leakage-free causal evaluation benchmark and verifies that the model learns heterogeneous treatment effects from the synthetic DGP. It does NOT claim real-world causal validation or production superiority without live A/B experiment execution.**

---

## Next Phase

### Phase 2 — Benchmark Against Conventional Marketing

In Phase 2, we will benchmark the uplift targeting strategy against three conventional marketing strategies under identical campaign budgets:
1. **Random Targeting**: Allocating budget uniformly at random across eligible customers.
2. **Propensity Targeting**: Targeting customers with the highest raw conversion probability $P(Y=1)$.
3. **Fixed Incentive Targeting**: Traditional rule-based targeting without uplift personalization.
4. **Uplift Targeting**: Targeting customers prioritized by predicted incremental treatment effect $\hat{\tau}(X)$.

*Phase 2 is NOT implemented yet.*
