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
const { optimizeBudget, computeMetrics } = require("./optimizer");

const CAMPAIGN_TYPES   = ["recharge", "merchant", "p2p", "bill"];
const VALID_SEGMENTS   = ["all", "high_value", "mid", "low", "dormant"];
const VALID_OFFER_VALS = [10, 20, 30, 50];

/**
 * Validate and normalize campaign configuration.
 * @param {Object} config
 * @throws if config is invalid
 */
function validateConfig(config) {
  const { campaign_type, offer_value_bdt, budget_bdt, target_segment } = config;

  if (!CAMPAIGN_TYPES.includes(campaign_type)) {
    throw new Error(`Invalid campaign_type: "${campaign_type}". Must be one of: ${CAMPAIGN_TYPES.join(", ")}`);
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
    offer_value_bdt: offerVal,
    budget_bdt:      budget,
    target_segment   = "all",
  } = config;

  const offerValueBdt = Number(offerVal);
  const budgetBdt     = Number(budget);

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

  // 6. Feature importances for display
  const meta = getModelMeta();
  const featureImportances = (meta.feature_importances || []).slice(0, 8);

  const elapsed = Date.now() - startTime;

  return {
    campaign_name,
    campaign_type,
    offer_value_bdt: offerValueBdt,
    summary: {
      ...summary,
      processing_time_ms: elapsed,
    },
    // Limit returned rows to keep response lean
    recommended:          recommended.slice(0, 200),
    suppressed_fatigue:   suppressedFatigue.slice(0, 100),
    suppressed_other:     suppressedOther.slice(0, 100),
    feature_importances:  featureImportances,
  };
}

module.exports = { runCampaign };
