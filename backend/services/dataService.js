/**
 * dataService.js
 * In-memory data layer. Loads JSON artifacts once at startup.
 * All other services access data through this module.
 */

const fs   = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

/** @type {import('../types').Customer[]} */
let customers = [];

/** @type {Object.<string, Object.<string, {uplift: number, treatment_prob: number, control_prob: number}>>} */
let upliftScores = {};

/** @type {Object} */
let modelMeta = {};

/** @type {import('../types').CampaignHistoryRecord[]} */
let campaignHistory = [];

// Cached population stats (computed once)
let _populationStats = null;

/**
 * Load all data artifacts into memory.
 * Called once at server startup.
 */
async function loadAllData() {
  const customersPath    = path.join(DATA_DIR, "customers.json");
  const historyPath      = path.join(DATA_DIR, "campaign_history.json");
  const upliftPath       = path.join(DATA_DIR, "uplift_scores.json");
  const modelMetaPath    = path.join(DATA_DIR, "model_meta.json");

  const required = [customersPath, upliftPath, modelMetaPath];
  for (const p of required) {
    if (!fs.existsSync(p)) {
      throw new Error(`Required data file not found: ${p}\nRun: python ml/generate_data.py && python ml/train_model.py`);
    }
  }

  customers       = JSON.parse(fs.readFileSync(customersPath, "utf8"));
  upliftScores    = JSON.parse(fs.readFileSync(upliftPath, "utf8"));
  modelMeta       = JSON.parse(fs.readFileSync(modelMetaPath, "utf8"));

  if (fs.existsSync(historyPath)) {
    campaignHistory = JSON.parse(fs.readFileSync(historyPath, "utf8"));
  }

  // Attach uplift scores and explanations to each customer for fast lookup
  const explanations = modelMeta.customer_explanations || {};
  for (const c of customers) {
    c.uplift_scores = upliftScores[c.customer_id] || {};
    c.explanation_drivers = explanations[c.customer_id] || [];
    // Compute fatigue status
    c.fatigue_status = computeFatigueStatus(c);
  }

  console.log(`[dataService] Loaded ${customers.length.toLocaleString()} customers`);
  console.log(`[dataService] Uplift scores for ${Object.keys(upliftScores).length.toLocaleString()} customers`);
  console.log(`[dataService] Campaign history: ${campaignHistory.length.toLocaleString()} records`);
}

/**
 * Determine fatigue status for a customer.
 * @param {Object} c - customer record
 * @returns {'safe'|'at_risk'|'suppressed'}
 */
function computeFatigueStatus(c) {
  if (c.campaign_received_last_90d >= 3) return "suppressed";
  if (c.campaign_received_last_90d >= 2 && c.campaign_responded_last_90d === 0) return "at_risk";
  if (c.days_since_prev_campaign !== undefined && c.days_since_prev_campaign < 7) return "at_risk";
  return "safe";
}

// ── Accessor functions ────────────────────────────────────────────────────────

/** @returns {import('../types').Customer[]} */
function getCustomers() { return customers; }

/** @returns {Object} */
function getModelMeta() { return modelMeta; }

/** @returns {import('../types').CampaignHistoryRecord[]} */
function getCampaignHistory() { return campaignHistory; }

/**
 * Get a single customer by ID (O(1) via Map, built lazily).
 */
let _customerMap = null;
function getCustomerById(id) {
  if (!_customerMap) {
    _customerMap = new Map(customers.map(c => [c.customer_id, c]));
  }
  return _customerMap.get(id) || null;
}

/**
 * Compute and cache population-level statistics.
 */
function getPopulationStats() {
  if (_populationStats) return _populationStats;

  const total   = customers.length;
  const active  = customers.filter(c => !c.is_dormant).length;
  const dormant = total - active;

  // Segment counts
  const segments = {};
  for (const c of customers) {
    segments[c.segment] = (segments[c.segment] || 0) + 1;
  }

  // Average uplift per campaign type
  const CAMPAIGN_TYPES = ["recharge", "merchant", "p2p", "bill"];
  const avg_uplift = {};
  for (const ct of CAMPAIGN_TYPES) {
    const vals = customers
      .map(c => c.uplift_scores?.[ct]?.uplift ?? 0)
      .filter(v => !isNaN(v));
    avg_uplift[ct] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  // Uplift distribution for "recharge" (default dashboard view)
  const rechargeUpliftVals = customers.map(c => c.uplift_scores?.recharge?.uplift ?? 0);
  const uplift_distribution = buildUpliftHistogram(rechargeUpliftVals);

  // Fatigue counts
  const fatigued  = customers.filter(c => c.fatigue_status === "suppressed").length;
  const at_risk   = customers.filter(c => c.fatigue_status === "at_risk").length;

  _populationStats = {
    total_customers: total,
    active_customers: active,
    dormant_customers: dormant,
    fatigued_customers: fatigued,
    at_risk_customers: at_risk,
    segments,
    avg_uplift,
    uplift_distribution,
    model_info: {
      type: modelMeta.model_type || "S-Learner (GradientBoostingClassifier)",
      top_features: (modelMeta.feature_importances || []).slice(0, 5),
    },
  };

  return _populationStats;
}

/**
 * Build a histogram of uplift values.
 * @param {number[]} values
 */
function buildUpliftHistogram(values) {
  const bins = [-0.15, -0.05, 0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50];
  const labels = bins.slice(0, -1).map((b, i) => `${b.toFixed(2)}–${bins[i+1].toFixed(2)}`);
  const counts = new Array(bins.length - 1).fill(0);

  for (const v of values) {
    for (let i = 0; i < bins.length - 1; i++) {
      if (v >= bins[i] && v < bins[i + 1]) {
        counts[i]++;
        break;
      }
    }
  }

  return { bins: bins.slice(0, -1), labels, counts };
}

module.exports = {
  loadAllData,
  getCustomers,
  getModelMeta,
  getCampaignHistory,
  getCustomerById,
  getPopulationStats,
  buildUpliftHistogram,
  computeFatigueStatus,
};
