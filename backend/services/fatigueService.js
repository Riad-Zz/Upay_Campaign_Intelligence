/**
 * fatigueService.js
 * Determines whether a customer should be suppressed due to campaign fatigue.
 * Rules are intentionally simple and explainable for the demo.
 */

const FATIGUE_HARD_CAP = 3;       // campaigns in 90 days
const FATIGUE_SPACING_DAYS = 7;   // minimum days since last campaign
const FATIGUE_NO_RESPONSE_CAP = 2; // campaigns received with 0 responses → at_risk suppression

/**
 * Determine if a customer should be suppressed from a campaign.
 *
 * @param {Object} customer
 * @returns {{ suppressed: boolean, reason: string|null, detail: string|null }}
 */
function evaluateFatigue(customer) {
  const recv = customer.campaign_received_last_90d || 0;
  const resp = customer.campaign_responded_last_90d || 0;
  const daysSince = customer.days_since_prev_campaign ?? 90;

  // Hard cap: received too many campaigns recently
  if (recv >= FATIGUE_HARD_CAP) {
    return {
      suppressed: true,
      reason: "fatigue",
      detail: `Received ${recv} campaigns in the last 90 days (limit: ${FATIGUE_HARD_CAP})`,
    };
  }

  // Non-responder with recent exposure
  if (recv >= FATIGUE_NO_RESPONSE_CAP && resp === 0) {
    return {
      suppressed: true,
      reason: "fatigue",
      detail: `Received ${recv} campaigns recently with 0 responses — likely unresponsive`,
    };
  }

  // Spacing rule: too soon since last campaign
  if (daysSince < FATIGUE_SPACING_DAYS && recv > 0) {
    return {
      suppressed: true,
      reason: "spacing",
      detail: `Last campaign sent only ${daysSince} days ago (minimum spacing: ${FATIGUE_SPACING_DAYS} days)`,
    };
  }

  return { suppressed: false, reason: null, detail: null };
}

/**
 * Batch-evaluate fatigue for a list of customers.
 * @param {Object[]} customers
 * @returns {{ safe: Object[], suppressed: Array<{customer: Object, reason: string, detail: string}> }}
 */
function filterByFatigue(customers) {
  const safe       = [];
  const suppressed = [];

  for (const c of customers) {
    const result = evaluateFatigue(c);
    if (result.suppressed) {
      suppressed.push({
        customer_id: c.customer_id,
        segment: c.segment,
        reason: result.reason,
        detail: result.detail,
        campaign_received_last_90d: c.campaign_received_last_90d,
        campaign_responded_last_90d: c.campaign_responded_last_90d,
        days_since_prev_campaign: c.days_since_prev_campaign,
      });
    } else {
      safe.push(c);
    }
  }

  return { safe, suppressed };
}

module.exports = { evaluateFatigue, filterByFatigue };
