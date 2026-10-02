// types/index.ts
// Shared TypeScript interfaces for Upay Campaign Intelligence

export type CampaignType = 'recharge' | 'merchant' | 'p2p' | 'bill';
export type Segment = 'high_value' | 'mid' | 'low' | 'dormant';
export type FatigueStatus = 'safe' | 'at_risk' | 'suppressed';
export type UpliftSegment = 'persuadable' | 'low_uplift' | 'sure_thing' | 'lost_cause' | 'do_not_disturb';
export type SuppressReason = 'fatigue' | 'spacing' | 'do_not_disturb' | 'sure_thing' | 'lost_cause' | 'budget_exhausted';

// ── Customer ──────────────────────────────────────────────────────────────────

export interface UpliftScores {
  recharge: number;
  merchant: number;
  p2p:      number;
  bill:     number;
}

export interface UpliftScoreDetail {
  uplift:          number;
  treatment_prob:  number;
  control_prob:    number;
}

export interface ExplanationDriver {
  feature:      string;
  label:        string;
  raw_value:    number;
  importance:   number;
  impact_score: number;
  direction:    'positive' | 'negative';
  impact:       'high' | 'medium' | 'low';
}

export interface Customer {
  customer_id:                  string;
  segment:                      Segment;
  tenure_months:                number;
  avg_monthly_txn_count:        number;
  avg_monthly_gmv_bdt:          number;
  preferred_category:           CampaignType;
  days_since_last_txn:          number;
  is_dormant:                   boolean;
  campaign_received_last_90d:   number;
  campaign_responded_last_90d:  number;
  friday_txn_rate:              number;
  recharge_txn_rate:            number;
  merchant_txn_rate:            number;
  p2p_txn_rate:                 number;
  bill_txn_rate:                number;
  days_since_prev_campaign?:    number;
  fatigue_status:               FatigueStatus;
  uplift_scores:                UpliftScores;
}

export interface CustomerDetail extends Customer {
  explanation: CustomerExplanation;
  explanation_drivers: ExplanationDriver[];
}

export interface CustomerExplanation {
  primary_campaign_type: CampaignType;
  uplift_score:    number;
  treatment_prob:  number;
  control_prob:    number;
  top_drivers:     ExplanationDriver[];
  narrative:       string;
}

// ── Campaign Config ───────────────────────────────────────────────────────────

export interface CampaignConfig {
  campaign_name:    string;
  campaign_type:    CampaignType;
  offer_value_bdt:  number;
  budget_bdt:       number;
  target_segment:   'all' | Segment;
}

// ── Campaign Result ───────────────────────────────────────────────────────────

export interface RecommendedCustomer {
  customer_id:                  string;
  segment:                      Segment;
  uplift_score:                 number;
  treatment_prob:               number;
  control_prob:                 number;
  uplift_segment:               UpliftSegment;
  avg_txn_value_bdt:            number;
  priority_score:               number;
  expected_incremental_gmv_bdt: number;
}

export interface SuppressedCustomer {
  customer_id:                 string;
  segment:                     Segment;
  reason:                      SuppressReason;
  detail:                      string;
  uplift_score?:               number;
  control_prob?:               number;
  campaign_received_last_90d?: number;
  campaign_responded_last_90d?: number;
  days_since_prev_campaign?:   number;
}

export interface UpliftDistribution {
  bins:   number[];
  labels: string[];
  counts: number[];
}

export interface SegmentBreakdown {
  persuadable:     number;
  low_uplift:      number;
  do_not_disturb:  number;
  sure_thing:      number;
  lost_cause:      number;
}

export interface FeatureImportance {
  feature:    string;
  label:      string;
  importance: number;
}

export interface CampaignSummary {
  total_customers_analyzed:         number;
  recommended_count:                number;
  suppressed_fatigue_count:         number;
  suppressed_do_not_disturb_count:  number;
  suppressed_sure_thing_count:      number;
  suppressed_lost_cause_count:      number;
  suppressed_budget_count:          number;
  budget_bdt:                       number;
  budget_utilized_bdt:              number;
  budget_remaining_bdt:             number;
  expected_incremental_txns:        number;
  expected_incremental_gmv_bdt:     number;
  net_incremental_revenue_bdt:      number;
  campaign_cost_bdt:                number;
  gmv_multiplier:                   number;
  cost_per_incremental_txn_bdt:     number;
  uplift_distribution:              UpliftDistribution;
  segment_breakdown:                SegmentBreakdown;
  processing_time_ms:               number;
}

export interface CampaignResult {
  campaign_name:       string;
  campaign_type:       CampaignType;
  offer_value_bdt:     number;
  summary:             CampaignSummary;
  recommended:         RecommendedCustomer[];
  suppressed_fatigue:  SuppressedCustomer[];
  suppressed_other:    SuppressedCustomer[];
  feature_importances: FeatureImportance[];
}

// ── Population Stats ──────────────────────────────────────────────────────────

export interface PopulationStats {
  total_customers:    number;
  active_customers:   number;
  dormant_customers:  number;
  fatigued_customers: number;
  at_risk_customers:  number;
  segments: {
    high_value: number;
    mid:        number;
    low:        number;
    dormant:    number;
  };
  avg_uplift: {
    recharge: number;
    merchant: number;
    p2p:      number;
    bill:     number;
  };
  uplift_distribution: UpliftDistribution;
  model_info: {
    type:         string;
    top_features: FeatureImportance[];
  };
}

// ── Paginated Customers ───────────────────────────────────────────────────────

export interface CustomerListResponse {
  total:     number;
  page:      number;
  limit:     number;
  pages:     number;
  customers: Customer[];
}

// ── API Query Params ──────────────────────────────────────────────────────────

export interface CustomerQueryParams {
  page?:          number;
  limit?:         number;
  segment?:       Segment;
  fatigue?:       FatigueStatus;
  sort?:          string;
  order?:         'asc' | 'desc';
  campaign_type?: CampaignType;
}
