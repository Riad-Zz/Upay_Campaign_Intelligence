/**
 * customerController.js
 * GET /api/customers       — Paginated, filterable customer list
 * GET /api/customers/:id   — Full customer profile with explanation
 */

const { getCustomers, getCustomerById } = require("../services/dataService");

const VALID_SEGMENTS      = ["high_value", "mid", "low", "dormant"];
const VALID_SORT_FIELDS   = [
  "avg_monthly_gmv_bdt", "avg_monthly_txn_count",
  "tenure_months", "days_since_last_txn",
  "uplift_recharge", "uplift_merchant", "uplift_p2p", "uplift_bill",
];
const VALID_CAMPAIGN_TYPES = ["recharge", "merchant", "p2p", "bill"];

/**
 * GET /api/customers
 * Query params:
 *   page        {number} default 1
 *   limit       {number} default 50, max 200
 *   segment     {string} filter by segment
 *   fatigue     {string} "safe" | "at_risk" | "suppressed"
 *   sort        {string} field to sort by
 *   order       {string} "asc" | "desc"
 *   campaign_type {string} which uplift score to sort by (when sort=uplift_*)
 */
function listCustomers(req, res) {
  try {
    let customers = getCustomers();

    const {
      page         = 1,
      limit        = 50,
      segment,
      fatigue,
      sort         = "avg_monthly_gmv_bdt",
      order        = "desc",
      campaign_type = "recharge",
    } = req.query;

    // Filters
    if (segment && VALID_SEGMENTS.includes(segment)) {
      customers = customers.filter(c => c.segment === segment);
    }
    if (fatigue && ["safe", "at_risk", "suppressed"].includes(fatigue)) {
      customers = customers.filter(c => c.fatigue_status === fatigue);
    }

    // Sort
    const sortDir = order === "asc" ? 1 : -1;
    customers = [...customers].sort((a, b) => {
      let av, bv;
      if (sort.startsWith("uplift_")) {
        const ct = sort.replace("uplift_", "");
        av = a.uplift_scores?.[ct]?.uplift ?? 0;
        bv = b.uplift_scores?.[ct]?.uplift ?? 0;
      } else {
        av = a[sort] ?? 0;
        bv = b[sort] ?? 0;
      }
      return sortDir * (av - bv);
    });

    // Pagination
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const total    = customers.length;
    const start    = (pageNum - 1) * limitNum;
    const slice    = customers.slice(start, start + limitNum);

    // Project fields for list view (keep response lean)
    const projected = slice.map(c => {
      // Build per-campaign-type score detail (uplift, baseline, campaign prob)
      const scores = Object.fromEntries(
        VALID_CAMPAIGN_TYPES.map(ct => {
          const s = c.uplift_scores?.[ct] || {};
          return [ct, {
            uplift:        +(s.uplift          ?? 0).toFixed(4),
            control_prob:  +(s.control_prob    ?? 0).toFixed(4),
            treatment_prob: +(s.treatment_prob ?? 0).toFixed(4),
          }];
        })
      );

      // Recommended action based on preferred category uplift
      const preferredCt  = c.preferred_category || 'recharge';
      const primaryScore = c.uplift_scores?.[preferredCt] || {};
      const uplift       = primaryScore.uplift  ?? 0;
      const controlProb  = primaryScore.control_prob ?? 0;
      let recommended_action  = 'do_not_target';
      let recommended_incentive = 0;
      if (c.fatigue_status === 'suppressed') {
        recommended_action = 'suppressed_fatigue';
      } else if (uplift < 0) {
        recommended_action = 'do_not_disturb';
      } else if (uplift < 0.03 && controlProb > 0.65) {
        recommended_action = 'sure_thing';
      } else if (uplift < 0.03) {
        recommended_action = 'low_value';
      } else if (uplift >= 0.10) {
        recommended_action = 'target';
        recommended_incentive = uplift >= 0.20 ? 50 : uplift >= 0.15 ? 30 : 20;
      } else {
        recommended_action = 'target_low_incentive';
        recommended_incentive = 10;
      }

      return {
        customer_id:                  c.customer_id,
        segment:                      c.segment,
        tenure_months:                c.tenure_months,
        avg_monthly_gmv_bdt:          c.avg_monthly_gmv_bdt,
        avg_monthly_txn_count:        c.avg_monthly_txn_count,
        days_since_last_txn:          c.days_since_last_txn,
        is_dormant:                   c.is_dormant,
        campaign_received_last_90d:   c.campaign_received_last_90d,
        campaign_responded_last_90d:  c.campaign_responded_last_90d,
        preferred_category:           c.preferred_category,
        fatigue_status:               c.fatigue_status,
        recommended_action,
        recommended_incentive,
        // Backward-compatible uplift_scores (number only) + new score detail
        uplift_scores: Object.fromEntries(
          VALID_CAMPAIGN_TYPES.map(ct => [ct, scores[ct].uplift])
        ),
        uplift_score_detail: scores,
      };
    });

    res.json({
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      customers: projected,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/customers/:id
 * Returns full customer profile + uplift scores + explanation drivers.
 */
function getCustomer(req, res) {
  try {
    const { id } = req.params;
    const customer = getCustomerById(id);

    if (!customer) {
      return res.status(404).json({ error: `Customer not found: ${id}` });
    }

    // Build a narrative explanation for the default campaign type (recharge)
    const primaryCampaignType = customer.preferred_category || "recharge";
    const primaryScores = customer.uplift_scores?.[primaryCampaignType] || {};

    const narrative = buildNarrative(customer, primaryCampaignType, primaryScores);

    res.json({
      ...customer,
      explanation: {
        primary_campaign_type: primaryCampaignType,
        uplift_score:    primaryScores.uplift      ?? 0,
        treatment_prob:  primaryScores.treatment_prob ?? 0,
        control_prob:    primaryScores.control_prob   ?? 0,
        top_drivers:     (customer.explanation_drivers || []).slice(0, 5),
        narrative,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Build a human-readable narrative for a customer explanation.
 */
function buildNarrative(customer, campaignType, scores) {
  const uplift     = scores.uplift ?? 0;
  const treatProb  = scores.treatment_prob ?? 0;
  const ctrlProb   = scores.control_prob ?? 0;
  const segment    = customer.segment?.replace("_", " ") || "unknown";
  const tenure     = customer.tenure_months || 0;
  const recency    = customer.days_since_last_txn || 0;

  if (uplift < 0) {
    return `This customer shows a negative response to ${campaignType} campaigns (uplift: ${uplift.toFixed(3)}). Sending an offer may actually reduce their probability of transacting. Suppressing is the recommended action.`;
  }
  if (uplift < 0.05 && ctrlProb > 0.65) {
    return `This customer is in the "${segment}" segment with a high baseline conversion probability (${(ctrlProb * 100).toFixed(0)}%). They are likely to transact regardless of the campaign. Including them would spend budget without generating incremental value.`;
  }
  if (uplift >= 0.10) {
    return `This customer is a strong ${campaignType} target. Without the offer, they have a ${(ctrlProb * 100).toFixed(0)}% chance of transacting. With the offer, that rises to ${(treatProb * 100).toFixed(0)}% — an uplift of ${(uplift * 100).toFixed(1)} percentage points. They have been active for ${tenure} months and last transacted ${recency} day(s) ago.`;
  }
  return `This customer shows moderate responsiveness to ${campaignType} campaigns (uplift: ${(uplift * 100).toFixed(1)}pp). Their baseline conversion probability is ${(ctrlProb * 100).toFixed(0)}%, rising to ${(treatProb * 100).toFixed(0)}% with the offer.`;
}

module.exports = { listCustomers, getCustomer };
