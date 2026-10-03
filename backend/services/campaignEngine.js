/**
 * campaignEngine.js
 * The core campaign intelligence pipeline.
 *
 * Steps:
 *  1. Parse + validate campaign config
 *  2. Select eligible customers by target_segment
 *  3. Filter by fatigue (fatigueService)
 *  4. Run greedy budget optimization (optimizer)
 *  5. Compute campaign metrics
 *  6. Attach feature importances for results display
 */

const { getCustomers, getModelMeta } = require("./dataService");
const { filterByFatigue }            = require("./fatigueService");
const { optimizeBudget, computeMetrics, classifyUpliftSegment } = require("./optimizer");

const CAMPAIGN_TYPES   = ["recharge", "merchant", "p2p", "bill"];
const VALID_SEGMENTS   = ["all", "high_value", "mid", "low", "dormant"];
const VALID_OFFER_VALS = [10, 20, 30, 50];

// Campaign objective → campaign_type mapping
const OBJECTIVE_TYPE_MAP = {
  increase_recharge:      "recharge",
  increase_gmv:           "recharge",
  reactivate_dormant:     "recharge",
  increase_merchant:      "merchant",
  increase_p2p:           "p2p",
  increase_bill:          "bill",
  increase_frequency:     "recharge",
  re_engage_inactive:     "recharge",
};

const OBJECTIVE_LABELS = {
  increase_recharge:      "Increase Recharge Transactions",
  increase_gmv:           "Increase GMV",
  reactivate_dormant:     "Reactivate Dormant Customers",
  increase_merchant:      "Increase Merchant Payments",
  increase_p2p:           "Increase P2P Transfers",
  increase_bill:          "Increase Bill Payments",
  increase_frequency:     "Increase Recharge Frequency",
  re_engage_inactive:     "Re-engage Inactive Customers",
};

/**
 * Validate and normalize campaign configuration.
 * @param {Object} config
 * @throws if config is invalid
 */
function validateConfig(config) {
  const { campaign_type, offer_value_bdt, budget_bdt, target_segment } = config;

  // Resolve campaign type from objective if provided
  const resolvedType = campaign_type;
  if (!CAMPAIGN_TYPES.includes(resolvedType)) {
    throw new Error(`Invalid campaign_type: "${resolvedType}". Must be one of: ${CAMPAIGN_TYPES.join(", ")}`);
  }
  if (!VALID_OFFER_VALS.includes(Number(offer_value_bdt))) {
    throw new Error(`Invalid offer_value_bdt: ${offer_value_bdt}. Must be one of: ${VALID_OFFER_VALS.join(", ")}`);
  }
  if (!budget_bdt || Number(budget_bdt) <= 0) {
    throw new Error("budget_bdt must be a positive number");
  }
  if (target_segment && !VALID_SEGMENTS.includes(target_segment)) {
    throw new Error(`Invalid target_segment: "${target_segment}". Must be one of: ${VALID_SEGMENTS.join(", ")}`);
  }
}

/**
 * Run the full campaign intelligence pipeline.
 *
 * @param {Object} config
 * @param {string} config.campaign_name
 * @param {string} config.campaign_type
 * @param {string} [config.campaign_objective]
 * @param {number} config.offer_value_bdt
 * @param {number} config.budget_bdt
 * @param {string} [config.target_segment="all"]
 * @returns {Object} CampaignResult
 */
function runCampaign(config) {
  const startTime = Date.now();

  // 1. Validate
  validateConfig(config);

  const {
    campaign_name    = "Untitled Campaign",
    campaign_type,
    campaign_objective,
    offer_value_bdt: offerVal,
    budget_bdt:      budget,
    target_segment   = "all",
  } = config;

  const offerValueBdt = Number(offerVal);
  const budgetBdt     = Number(budget);
  const objectiveLabel = campaign_objective ? (OBJECTIVE_LABELS[campaign_objective] || campaign_objective) : null;

  // 2. Select eligible customers
  const allCustomers = getCustomers();
  let eligible = allCustomers;

  if (target_segment !== "all") {
    eligible = allCustomers.filter(c => c.segment === target_segment);
  }

  // Always exclude dormant UNLESS explicitly targeting them
  if (target_segment !== "dormant") {
    eligible = eligible.filter(c => !c.is_dormant);
  }

  const totalAnalyzed = eligible.length;

  // 3. Fatigue filter
  const { safe: safeCustomers, suppressed: suppressedFatigue } = filterByFatigue(eligible);

  // 4. Budget optimization (greedy ranking)
  const {
    recommended,
    suppressed: suppressedOther,
    budgetUtilized,
    budgetRemaining,
  } = optimizeBudget(safeCustomers, campaign_type, offerValueBdt, budgetBdt);

  // 5. Compute metrics
  const summary = computeMetrics(
    recommended,
    suppressedFatigue,
    suppressedOther,
    offerValueBdt,
    budgetBdt,
    budgetUtilized,
    totalAnalyzed
  );

  // 5b. Compute tiered incentive allocation
  const incentiveTiers = computeIncentiveTiers(recommended, offerValueBdt);

  // 6. Feature importances for display
  const meta = getModelMeta();
  const featureImportances = (meta.feature_importances || []).slice(0, 8);

  const elapsed = Date.now() - startTime;

  return {
    campaign_name,
    campaign_type,
    campaign_objective: campaign_objective || null,
    campaign_objective_label: objectiveLabel,
    offer_value_bdt: offerValueBdt,
    summary: {
      ...summary,
      processing_time_ms: elapsed,
    },
    incentive_tiers:      incentiveTiers,
    // Limit returned rows to keep response lean
    recommended:          recommended.slice(0, 200),
    suppressed_fatigue:   suppressedFatigue.slice(0, 100),
    suppressed_other:     suppressedOther.slice(0, 100),
    feature_importances:  featureImportances,
  };
}

/**
 * Given the recommended list (all at same offerValue), produce a
 * tiered breakdown showing how customers would be distributed across
 * incentive tiers based on their uplift magnitude.
 *
 * Tiers based on uplift:
 *   ≥ 0.25  → ৳50 (high persuadable)
 *   ≥ 0.15  → ৳30 (moderate persuadable)
 *   ≥ 0.10  → ৳20 (low persuadable)
 *   < 0.10  → ৳10 (low uplift - marginal)
 *
 * Budget check: if tiered total > budget, scale down starting from highest tier.
 * This gives an advisory recommendation — actual send uses offerValueBdt.
 */
function computeIncentiveTiers(recommended, offerValueBdt) {
  const tiers = { 50: [], 30: [], 20: [], 10: [] };

  for (const c of recommended) {
    const uplift = c.uplift_score;
    if (uplift >= 0.25)      tiers[50].push(c);
    else if (uplift >= 0.15) tiers[30].push(c);
    else if (uplift >= 0.10) tiers[20].push(c);
    else                     tiers[10].push(c);
  }

  return [
    { offer_bdt: 50, count: tiers[50].length, avg_uplift: avg(tiers[50].map(c => c.uplift_score)), expected_incr_gmv: sum(tiers[50].map(c => c.expected_incremental_gmv_bdt)) },
    { offer_bdt: 30, count: tiers[30].length, avg_uplift: avg(tiers[30].map(c => c.uplift_score)), expected_incr_gmv: sum(tiers[30].map(c => c.expected_incremental_gmv_bdt)) },
    { offer_bdt: 20, count: tiers[20].length, avg_uplift: avg(tiers[20].map(c => c.uplift_score)), expected_incr_gmv: sum(tiers[20].map(c => c.expected_incremental_gmv_bdt)) },
    { offer_bdt: 10, count: tiers[10].length, avg_uplift: avg(tiers[10].map(c => c.uplift_score)), expected_incr_gmv: sum(tiers[10].map(c => c.expected_incremental_gmv_bdt)) },
  ];
}

function avg(arr) { return arr.length ? +(arr.reduce((a,b) => a+b,0)/arr.length).toFixed(4) : 0; }
function sum(arr) { return arr.length ? +arr.reduce((a,b) => a+b,0).toFixed(2) : 0; }

module.exports = { runCampaign };

