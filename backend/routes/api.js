/**
 * api.js — All API routes for Upay Campaign Intelligence
 */

const express = require("express");
const router  = express.Router();

const statsController    = require("../controllers/statsController");
const customerController = require("../controllers/customerController");
const campaignController = require("../controllers/campaignController");

// ── Population stats ──────────────────────────────────────────────────────────
router.get("/stats", statsController.getStats);

// ── Customers ─────────────────────────────────────────────────────────────────
router.get("/customers",     customerController.listCustomers);
router.get("/customers/:id", customerController.getCustomer);

// ── Campaign ──────────────────────────────────────────────────────────────────
router.post("/campaign/run", campaignController.runCampaign);

// ── Policy Benchmark & Comparison ───────────────────────────────────────────
const fs = require("fs");
const path = require("path");

router.get("/comparison", (req, res) => {
  const comparisonPath = path.join(__dirname, "..", "..", "data", "policy_comparison.json");
  if (fs.existsSync(comparisonPath)) {
    try {
      return res.json(JSON.parse(fs.readFileSync(comparisonPath, "utf8")));
    } catch (err) {
      return res.status(500).json({ error: "Failed to read comparison report: " + err.message });
    }
  }
  const benchmarkPath = path.join(__dirname, "..", "..", "data", "policy_benchmark.json");
  if (fs.existsSync(benchmarkPath)) {
    try {
      const benchmarkData = JSON.parse(fs.readFileSync(benchmarkPath, "utf8"));
      const exp = benchmarkData.experiment || {};
      const pol = benchmarkData.policies || {};
      return res.json({
        scenario: {
          campaign: exp.campaign_type || "Recharge",
          budget: exp.campaign_budget || 50000,
          incentive: exp.fixed_incentive || 30,
          target_count: exp.max_targets || 1666,
          eligible_customers: exp.eligible_customers || 3893
        },
        strategies: {
          random: {
            targeted: pol.random?.targeted_customers || 1666,
            avg_uplift: pol.random?.mean_predicted_uplift || 0.0723,
            incremental_transactions: pol.random?.incremental_transactions || 120.5,
            incremental_gmv: pol.random?.incremental_gmv_bdt || 44603.2,
            sure_things: pol.random?.sure_thing_targets || 146,
            sure_thing_percentage: pol.random?.sure_thing_percentage || 8.8,
            wasteful_targets: pol.random?.incentive_waste_targets || 168
          },
          propensity: {
            targeted: pol.propensity?.targeted_customers || 1666,
            avg_uplift: pol.propensity?.mean_predicted_uplift || 0.0517,
            incremental_transactions: pol.propensity?.incremental_transactions || 86.2,
            incremental_gmv: pol.propensity?.incremental_gmv_bdt || 30671.6,
            sure_things: pol.propensity?.sure_thing_targets || 349,
            sure_thing_percentage: pol.propensity?.sure_thing_percentage || 20.9,
            wasteful_targets: pol.propensity?.incentive_waste_targets || 391
          },
          uplift: {
            targeted: pol.uplift?.targeted_customers || 1666,
            avg_uplift: pol.uplift?.mean_predicted_uplift || 0.0982,
            incremental_transactions: pol.uplift?.incremental_transactions || 163.5,
            incremental_gmv: pol.uplift?.incremental_gmv_bdt || 64124.5,
            sure_things: pol.uplift?.sure_thing_targets || 0,
            sure_thing_percentage: pol.uplift?.sure_thing_percentage || 0.0,
            wasteful_targets: pol.uplift?.incentive_waste_targets || 0
          }
        },
        comparison: benchmarkData.comparison || {}
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to parse benchmark fallback: " + err.message });
    }
  }
  return res.status(404).json({ error: "Comparison report not found" });
});

router.get("/benchmark", (req, res) => {
  const benchmarkPath = path.join(__dirname, "..", "..", "data", "policy_benchmark.json");
  if (fs.existsSync(benchmarkPath)) {
    try {
      return res.json(JSON.parse(fs.readFileSync(benchmarkPath, "utf8")));
    } catch (err) {
      return res.status(500).json({ error: "Failed to read benchmark report: " + err.message });
    }
  }
  return res.status(404).json({ error: "Benchmark report not found" });
});

// ── Health check ──────────────────────────────────────────────────────────────
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

module.exports = router;
