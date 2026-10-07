# Upay Campaign Intelligence — Final MVP

## Problem

In traditional Mobile Financial Services (MFS) marketing, campaign budgets are allocated using **response propensity modeling**: targeting customers who have the highest probability of converting ($P(Y=1 \mid X)$).

This creates the **"Sure Thing" Deadweight Loss**:
- The model targets organic loyalists and high-frequency users who would have performed the transaction regardless of the campaign.
- Marketing incentives (cashback/discounts) are wasted paying users for behavior they would execute anyway.
- Truly persuadable customers—those whose behavior only changes when incentivized—are overlooked because their baseline conversion rate is lower.
- Users receive excessive spam notifications without fatigue suppression, triggering churn and opt-outs.

---

## Solution

**Upay Campaign Intelligence** replaces conventional response propensity with **Causal Uplift Modeling**. 

Rather than asking:
> *"Who is most likely to convert?"*

Our engine asks:
> *"Who is most likely to convert **only because** we gave them this campaign?"*

By optimizing for **incremental treatment effect** ($\tau(X) = P(Y=1 \mid X, T=1) - P(Y=1 \mid X, T=0)$) under strict **fatigue protection constraints**, Upay eliminates deadweight incentive loss, protects customer goodwill, and maximizes return on marketing investment.

---

## Causal Uplift Approach

We use an **S-Learner (Single-Model Meta-Learner)** built on `GradientBoostingClassifier` with:
- Temporal record-level cross-validation across 52 calendar weeks (Weeks 1–39 Train, Weeks 40–47 Val, Weeks 48–52 Held-Out Test).
- Counterfactual scoring for every customer:
  - **$P(T=1)$**: Predicted conversion probability if incentivized.
  - **$P(T=0)$**: Baseline organic conversion probability without incentive.
  - **Uplift $\tau$**: $P(T=1) - P(T=0)$ (net causal impact).
- Four-quadrant customer segmentation:
  1. **Persuadables ($\tau \ge 0.10$)**: Target priority — only transact when incentivized.
  2. **Sure Things ($P(T=0) > 0.65, \tau < 0.03$)**: Suppressed — organic converters who don't need incentives.
  3. **Lost Causes ($P(T=0) \le 0.65, \tau < 0.03$)**: Suppressed — unlikely to transact even with incentives.
  4. **Do Not Disturb ($\tau < 0$)**: Strictly suppressed — customers who react negatively to campaign notifications.

---

## Targeting Strategy Comparison

The MVP compares random, propensity, and uplift targeting under the same synthetic campaign budget and eligibility rules.

Propensity targeting prioritizes customers with high conversion probability, while uplift targeting prioritizes customers with high expected incremental response.

All reported business outcomes are model-estimated results from the synthetic dataset and are not real-world campaign results.

### Benchmark Breakdown (Budget ৳50,000 · Fixed Incentive ৳30 · K = 1,666 targets)

| Metric | Random | Propensity (Conventional) | Uplift (Upay Causal ML) | Uplift Advantage |
|:---|:---:|:---:|:---:|:---:|
| **Targeted Customers** | 1,666 | 1,666 | 1,666 | Identical budget & audience |
| **Expected Incremental Txns** | 120.5 | 86.2 | **163.5** | **+89.7% lift** |
| **Model-Estimated Incr. GMV** | ৳44,603 | ৳30,672 | **৳64,125** | **+109.1% GMV lift** |
| **Sure-Thing Targets** | 146 (8.8%) | 349 (20.9%) | **0 (0.0%)** | **-100% waste** |
| **Sure-Thing Spend Wasted** | ৳4,380 | ৳10,470 | **৳0** | **৳10,470 saved** |
| **Cost per Incremental Txn** | ৳414.9 | ৳579.9 | **৳305.6** | **47.3% more cost-effective** |

---

## Fatigue Protection

Automated multi-layer fatigue suppression rules safeguard the customer relationship:
1. **Hard Exposure Cap**: Maximum 3 campaigns received within any rolling 90-day window.
2. **Unresponsive Guard**: Maximum 2 campaigns with 0 responses before mandatory cooldown.
3. **Minimum Spacing**: Minimum 7 days between consecutive campaign contacts.

---

## Controlled Benchmark Results (Held-Out Test Set: Weeks 48–52)

All four policies evaluated under **identical conditions**:
- **Eligible Population**: 3,893 customers (held-out test set, non-dormant, fatigue-cleared)
- **Campaign Budget**: ৳50,000 BDT
- **Fixed Incentive**: ৳30 BDT per targeted customer
- **Target Count**: 1,666 customers ($K = \lfloor 50,000 / 30 \rfloor$)
- **Random Seed**: `42` (deterministic reproducibility)

| Metric | Random | Propensity | Fixed Incentive (Top GMV) | Uplift (Upay AI) | Uplift vs. Propensity |
|---|---:|---:|---:|---:|---|
| **Targeted Customers** | 1,666 | 1,666 | 1,666 | **1,666** | Same (100% budget parity) |
| **Incentive Cost** | ৳49,980 | ৳49,980 | ৳49,980 | **৳49,980** | Identical budget utilized |
| **Treated Conv. Prob ($T=1$)** | 42.2% | 60.6% | 55.5% | **29.1%** | Uplift targets lower-baseline users |
| **Baseline Prob ($T=0$)** | 35.0% | 55.5% | 50.0% | **19.3%** | Propensity targets organic buyers |
| **Mean Predicted Uplift** | +7.23% | +5.17% | +5.53% | **+9.82%** | **Nearly 2x incremental lift** |
| **Incremental Transactions** | 120.5 | 86.2 | 92.1 | **163.5** | **+89.7% more transactions** |
| **Ground-Truth True Lift (ITE)** | 202.3 | 165.1 | 164.2 | **239.7** | **+45.2% true causal lift** |
| **Incremental GMV (BDT)** | ৳44,603 | ৳30,672 | ৳48,345 | **৳64,125** | **+109.1% more GMV** |
| **Net Incremental Value** | -৳5,377 | -৳19,308 | -৳1,635 | **+৳14,145** | **Only strategy with positive net value** |
| **GMV Multiplier** | 0.89x | 0.61x | 0.97x | **1.28x** | Return per ৳1 spent |
| **Cost / Incr. Transaction** | ৳414.9 | ৳579.9 | ৳542.7 | **৳305.6** | **47.3% more cost-efficient** |
| **Sure-Thing Targets Wasted** | 146 (8.8%) | 349 (20.9%) | 342 (20.5%) | **0 (0.0%)** | **100% deadweight elimination** |
| **Sure-Thing Budget Wasted** | ৳4,380 | ৳10,470 | ৳10,260 | **৳0** | **Saved ৳10,470 from being wasted** |
| **Fatigue Risk Targets** | 328 | 545 | 494 | **14** | **97.4% reduction in fatigue risk** |

---

## Business Impact Summary

1. **+89.7% Higher Transaction Volume**: Uplift targeting drives 163.5 incremental transactions vs. 86.2 for propensity targeting under the same ৳50,000 budget.
2. **৳10,470 Saved per ৳50K Campaign**: Zero Taka spent paying Sure Things who would have transacted anyway (vs. 20.9% wasted under conventional marketing).
3. **Positive ROI (1.28x GMV Multiplier)**: The only targeting policy that generates positive net incremental value (+৳14,145) compared to negative returns for propensity (-৳19,308) and fixed incentive (-৳1,635).
4. **97.4% Fewer Fatigue Collisions**: By deprioritizing already-active users, uplift naturally avoids over-messaging fatigued customers (14 vs. 545).

---

## Architecture

```text
Synthetic MFS Population (10,000 users, 80 campaigns, 52 weeks)
                        ↓
Temporal Train / Val / Test Split (Weeks 1–39 Train, Weeks 48–52 Test)
                        ↓
S-Learner Model (GradientBoostingClassifier, 16 features)
                        ↓
Batch Uplift Pre-Scoring & SHAP Driver Attribution
                        ↓
Node.js Express Backend (/api/campaign/run, /api/customers, /api/stats)
                        ↓
React + Vite Frontend (Dashboard, Campaign Studio, Customer Explorer)
```

---

## Demo Flow

1. **Dashboard Console (`/`)**:
   - Live KPI ticker: 10,000 customers, 26.8% campaign opportunity rate, estimated incremental transactions.
   - Population segment distribution: High Value, Mid, Low, Dormant.
2. **Campaign Studio (`/campaign`)**:
   - Select campaign objective (e.g. *Increase Recharge Transactions*).
   - Configure budget (e.g. ৳50,000) and nominal incentive (৳30).
   - Click **Run Campaign Intelligence**:
     - Visual progress sequence showing baseline analysis, uplift estimation, and fatigue suppression.
     - Generated audience recommendation: recommended reach, budget utilized, projected incremental GMV.
     - **Causal Benchmark Card**: side-by-side comparison showing +89.7% lift over conventional propensity targeting.
     - Suppression audit: inspection of fatigue-suppressed and sure-thing-skipped cohorts.
3. **Customer Explorer (`/customers`)**:
   - Search individual customer profiles.
   - Click customer to open **Causal Counterfactual Comparison Panel**:
     - *Without Campaign* baseline conversion ticker (e.g., 31%).
     - *With Campaign* treated conversion ticker (e.g., 58%).
     - Net *Incremental Uplift* delta (+27.0 pp).
     - Recommended action, SHAP feature drivers, and fatigue exposure history.

---

## Synthetic Data Disclaimer

All customer records, transaction amounts, and campaign histories are generated via a synthetic data simulation script (`ml/generate_data.py`) parameterized for Bangladesh MFS behavior. No real customer personally identifiable information or proprietary Upay transaction data is included.

---

## Limitations

- **Observational Holdout vs. Live A/B Trial**: The evaluation is conducted on a chronological held-out synthetic test set. Live production validation requires deploying real-world A/B holdout groups.
- **S-Learner Regularization**: S-Learners may regularize treatment indicators in small cohorts; advanced estimators (T-Learner, X-Learner, Causal Forests) can be explored in future iterations.
- **Cross-Sectional Customer Profile**: Profile features are currently fixed across the calendar year rather than rolling weekly time-series tables.

---

## Future Work

- **Live Randomized A/B Experimentation**: Direct integration with Upay campaign execution gateways.
- **Dynamic Offer Elasticity**: Multi-treatment incentive optimization (৳10 vs. ৳20 vs. ৳30 vs. ৳50 price curves).
- **Deep Causal Trees & Representation Learning**: Neural causal estimators for high-dimensional payment graph data.
