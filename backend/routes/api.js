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

// ── Health check ──────────────────────────────────────────────────────────────
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

module.exports = router;
