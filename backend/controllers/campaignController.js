/**
 * campaignController.js
 * POST /api/campaign/run — Execute the campaign intelligence pipeline.
 */

const { runCampaign } = require("../services/campaignEngine");

function runCampaignHandler(req, res) {
  try {
    const config = req.body;

    if (!config || !config.campaign_type) {
      return res.status(400).json({
        error: "Request body must include campaign_type, offer_value_bdt, and budget_bdt",
      });
    }

    const result = runCampaign(config);
    res.json(result);
  } catch (err) {
    // Validation errors → 400; everything else → 500
    const status = err.message.startsWith("Invalid") ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = { runCampaign: runCampaignHandler };
