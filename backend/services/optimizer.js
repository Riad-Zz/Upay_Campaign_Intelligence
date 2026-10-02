/**
 * optimizer.js
 * Greedy budget optimizer for campaign audience selection.
 *
 * Objective:
 *   Maximize Σ uplift(i) × avg_txn_value(i)   [Expected Incremental GMV]
 *   subject to: |selected| × offer_value_bdt ≤ campaign_budget
 *
 * Method: Greedy ranking by priority_score (optimal for uniform cost items).
 *
 *   priority_score(i) = uplift(i) × avg_txn_value(i) / offer_value_bdt
 *   Interpretation: expected incremental GMV generated per BDT of offer cost.
 *
 * Greedy is provably optimal here because all items have identical cost
 * (one fixed offer_value_bdt per customer). This reduces the 0-1 knapsack
 * to a simple sort-and-take problem.
 */

const OFFER_VALUE_MULTIPLIER = {
  10: 0.65,
  20: 0.82,
  30: 1.00,
  50: 1.25,
};

// MDR rate — platform earns this fraction of GMV
const MDR = 0.015;

/**
 * Classify a customer's uplift into a campaign segment.
 * @param {number} uplift
 * @param {number} controlProb - baseline conversion probability
 * @returns {string}
 */
function classifyUpliftSegment(uplift, controlProb) {
  if (uplift < 0)    return "do_not_disturb";
  if (uplift < 0.03) {
    if (controlProb > 0.65) return "sure_thing";
    return "lost_cause";
  }
  if (uplift >= 0.10) return "persuadable";
  return "low_uplift";
}

/**
 * Run greedy budget optimization.
 *
 * @param {Object[]} eligibleCustomers - customers who passed fatigue filter
 * @param {string}   campaignType
 * @param {number}   offerValueBdt
 * @param {number}   budgetBdt
 * @returns {{
 *   recommended: Object[],
 *   suppressed: Object[],
 *   budgetUtilized: number,
 *   budgetRemaining: number,
 * }}
 */
function optimizeBudget(eligibleCustomers, campaignType, offerValueBdt, budgetBdt) {
  // Offer-value multiplier adjusts the pre-scored uplift (scored at BDT 30)
  const mult = OFFER_VALUE_MULTIPLIER[offerValueBdt] || 1.0;
  const maxCustomers = Math.floor(budgetBdt / offerValueBdt);

  const scored       = [];
  const suppOther    = [];   // sure_things, lost_causes, do_not_disturbs

  for (const c of eligibleCustomers) {
    const scores = c.uplift_scores?.[campaignType];
    if (!scores) continue;

    const uplift       = scores.uplift * mult;
    const treatProb    = scores.treatment_prob;
    const controlProb  = scores.control_prob;
    const segment      = classifyUpliftSegment(uplift, controlProb);

    // Suppress sure-things, lost-causes, and do-not-disturbs — not efficient spend
    if (segment === "do_not_disturb" || segment === "sure_thing" || segment === "lost_cause") {
      suppOther.push({
        customer_id: c.customer_id,
        segment: c.segment,
        reason: segment,
        detail: segmentDetail(segment, uplift, controlProb),
        uplift_score: +uplift.toFixed(5),
        control_prob: +controlProb.toFixed(5),
      });
      continue;
    }

    const avgTxnValue  = (c.avg_monthly_gmv_bdt || 1000) / Math.max(c.avg_monthly_txn_count || 1, 1);
    const priorityScore = uplift * avgTxnValue / offerValueBdt;

    scored.push({
      customer_id:  c.customer_id,
      segment:      c.segment,
      uplift_score: +uplift.toFixed(5),
      treatment_prob: +treatProb.toFixed(5),
      control_prob:   +controlProb.toFixed(5),
      uplift_segment: segment,
      avg_txn_value_bdt: +avgTxnValue.toFixed(2),
      priority_score: +priorityScore.toFixed(6),
      expected_incremental_gmv_bdt: +(uplift * avgTxnValue).toFixed(2),
    });
  }

  // Sort descending by priority_score
  scored.sort((a, b) => b.priority_score - a.priority_score);

  // Take top-N within budget
  const recommended = scored.slice(0, maxCustomers);
  const notSelected  = scored.slice(maxCustomers).map(c => ({
    customer_id: c.customer_id,
    segment: c.segment,
    reason: "budget_exhausted",
    detail: "Budget was exhausted before this customer could be reached",
    uplift_score: c.uplift_score,
  }));

  const budgetUtilized = recommended.length * offerValueBdt;
  const budgetRemaining = budgetBdt - budgetUtilized;

  return {
    recommended,
    suppressed: [...suppOther, ...notSelected],
    budgetUtilized,
    budgetRemaining,
  };
}

function segmentDetail(segment, uplift, controlProb) {
  if (segment === "do_not_disturb")
    return `Negative uplift (${uplift.toFixed(3)}) — campaign may reduce transaction probability`;
  if (segment === "sure_thing")
    return `High baseline (${controlProb.toFixed(2)}) with low uplift (${uplift.toFixed(3)}) — likely to transact without incentive`;
  if (segment === "lost_cause")
    return `Low baseline (${controlProb.toFixed(2)}) and low uplift (${uplift.toFixed(3)}) — campaign unlikely to change behavior`;
  return "";
}

/**
 * Compute campaign summary metrics from recommended list.
 *
 * @param {Object[]} recommended
 * @param {Object[]} suppressedFatigue  - from fatigueService
 * @param {Object[]} suppressedOther    - from optimizer (sure_thing, etc.)
 * @param {number}   offerValueBdt
 * @param {number}   budgetBdt
 * @param {number}   budgetUtilized
 * @param {number}   totalAnalyzed
 */
function computeMetrics(
  recommended,
  suppressedFatigue,
  suppressedOther,
  offerValueBdt,
  budgetBdt,
  budgetUtilized,
  totalAnalyzed
) {
  const incrTxns = recommended.reduce((s, c) => s + c.uplift_score, 0);
  const incrGmv  = recommended.reduce((s, c) => s + c.expected_incremental_gmv_bdt, 0);
  const campaignCost = budgetUtilized;

  // MDR-adjusted incremental revenue
  const netIncrRevenue = incrGmv * MDR;

  // GMV multiplier: every BDT 1 of offer cost drives X BDT of incremental GMV
  const gmvMultiplier = campaignCost > 0 ? incrGmv / campaignCost : 0;

  // Cost per incremental transaction
  const costPerIncrTxn = incrTxns > 0 ? campaignCost / incrTxns : 0;

  // Uplift distribution of recommended customers
  const upliftVals = recommended.map(c => c.uplift_score);
  const dist = buildRecommendedUpliftHistogram(upliftVals);

  // Uplift segment breakdown
  const segBreakdown = { persuadable: 0, low_uplift: 0, do_not_disturb: 0, sure_thing: 0, lost_cause: 0 };
  for (const c of recommended) {
    segBreakdown[c.uplift_segment] = (segBreakdown[c.uplift_segment] || 0) + 1;
  }

  const suppressedFatigueCount = suppressedFatigue.length;
  const suppressedDoNotDisturb = suppressedOther.filter(c => c.reason === "do_not_disturb").length;
  const suppressedSureThing    = suppressedOther.filter(c => c.reason === "sure_thing").length;
  const suppressedLostCause    = suppressedOther.filter(c => c.reason === "lost_cause").length;
  const suppressedBudget       = suppressedOther.filter(c => c.reason === "budget_exhausted").length;

  return {
    total_customers_analyzed: totalAnalyzed,
    recommended_count:   recommended.length,
    suppressed_fatigue_count:       suppressedFatigueCount,
    suppressed_do_not_disturb_count: suppressedDoNotDisturb,
    suppressed_sure_thing_count:    suppressedSureThing,
    suppressed_lost_cause_count:    suppressedLostCause,
    suppressed_budget_count:        suppressedBudget,
    budget_bdt:           budgetBdt,
    budget_utilized_bdt:  +campaignCost.toFixed(2),
    budget_remaining_bdt: +(budgetBdt - campaignCost).toFixed(2),
    expected_incremental_txns:      +incrTxns.toFixed(1),
    expected_incremental_gmv_bdt:   +incrGmv.toFixed(2),
    net_incremental_revenue_bdt:    +netIncrRevenue.toFixed(2),
    campaign_cost_bdt:              +campaignCost.toFixed(2),
    gmv_multiplier:                 +gmvMultiplier.toFixed(2),
    cost_per_incremental_txn_bdt:   +costPerIncrTxn.toFixed(2),
    uplift_distribution:            dist,
    segment_breakdown:              segBreakdown,
  };
}

function buildRecommendedUpliftHistogram(values) {
  const bins   = [0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50];
  const labels = bins.slice(0, -1).map((b, i) => `${b.toFixed(2)}–${bins[i+1].toFixed(2)}`);
  const counts = new Array(bins.length - 1).fill(0);

  for (const v of values) {
    for (let i = 0; i < bins.length - 1; i++) {
      if (v >= bins[i] && v < bins[i + 1]) { counts[i]++; break; }
    }
  }
  return { bins: bins.slice(0, -1), labels, counts };
}

module.exports = { optimizeBudget, computeMetrics, classifyUpliftSegment };
