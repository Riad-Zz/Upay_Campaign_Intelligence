/**
 * statsController.js
 * GET /api/stats — Population-level statistics for the dashboard.
 */

const { getPopulationStats } = require("../services/dataService");

function getStats(req, res) {
  try {
    const stats = getPopulationStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getStats };
