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

// ── Policy Benchmark ─────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
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
