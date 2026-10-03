// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CampaignType, Segment, FatigueStatus, UpliftSegment, RecommendedAction } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Number formatting ─────────────────────────────────────────────────────────

export function formatBDT(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `৳${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)     return `৳${(value / 1_000).toFixed(0)}K`;
    return `৳${value.toFixed(0)}`;
  }
  return `৳${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatUplift(value: number): string {
  const pct = (value * 100).toFixed(1);
  return value >= 0 ? `+${pct}pp` : `${pct}pp`;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}×`;
}

// ── Label helpers ─────────────────────────────────────────────────────────────

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  recharge: 'Mobile Recharge Cashback',
  merchant: 'Merchant Payment Cashback',
  p2p:      'P2P Transfer Bonus',
  bill:     'Bill Payment Offer',
};

export const SEGMENT_LABELS: Record<Segment, string> = {
  high_value: 'High Value',
  mid:        'Mid Tier',
  low:        'Low Tier',
  dormant:    'Dormant',
};

export const FATIGUE_LABELS: Record<FatigueStatus, string> = {
  safe:       'Safe',
  at_risk:    'At Risk',
  suppressed: 'Fatigued',
};

export const UPLIFT_SEGMENT_LABELS: Record<UpliftSegment, string> = {
  persuadable:    'Persuadable',
  low_uplift:     'Low Uplift',
  sure_thing:     'Sure Thing',
  lost_cause:     'Lost Cause',
  do_not_disturb: 'Do Not Disturb',
};

export const RECOMMENDED_ACTION_LABELS: Record<RecommendedAction, string> = {
  target:               'Target',
  target_low_incentive: 'Target (Low Incentive)',
  sure_thing:           'Skip — Sure Thing',
  low_value:            'Skip — Low Value',
  do_not_disturb:       'Suppress — DND',
  suppressed_fatigue:   'Suppress — Fatigued',
  do_not_target:        'Do Not Target',
};

export const CAMPAIGN_TYPE_OPTIONS = [
  { value: 'recharge', label: 'Mobile Recharge Cashback' },
  { value: 'merchant', label: 'Merchant Payment Cashback' },
  { value: 'p2p',      label: 'P2P Transfer Bonus' },
  { value: 'bill',     label: 'Bill Payment Offer' },
] as const;

export const CAMPAIGN_OBJECTIVE_OPTIONS = [
  { value: 'increase_recharge',  label: 'Increase Recharge Transactions', type: 'recharge' as CampaignType },
  { value: 'increase_frequency', label: 'Increase Recharge Frequency',   type: 'recharge' as CampaignType },
  { value: 'increase_gmv',       label: 'Increase Overall GMV',          type: 'recharge' as CampaignType },
  { value: 'reactivate_dormant', label: 'Reactivate Dormant Customers',  type: 'recharge' as CampaignType },
  { value: 'increase_merchant',  label: 'Increase Merchant Payments',    type: 'merchant' as CampaignType },
  { value: 'increase_p2p',       label: 'Increase P2P Transfers',        type: 'p2p'      as CampaignType },
  { value: 'increase_bill',      label: 'Increase Bill Payments',        type: 'bill'     as CampaignType },
  { value: 're_engage_inactive', label: 'Re-engage Inactive Customers',  type: 'recharge' as CampaignType },
] as const;

export const SEGMENT_OPTIONS = [
  { value: 'all',        label: 'All Customers' },
  { value: 'high_value', label: 'High Value' },
  { value: 'mid',        label: 'Mid Tier' },
  { value: 'low',        label: 'Low Tier' },
  { value: 'dormant',    label: 'Dormant (Reactivation)' },
] as const;

export const OFFER_VALUE_OPTIONS = [
  { value: 10,  label: 'BDT 10' },
  { value: 20,  label: 'BDT 20' },
  { value: 30,  label: 'BDT 30' },
  { value: 50,  label: 'BDT 50' },
] as const;

// ── Color helpers ─────────────────────────────────────────────────────────────

export function upliftColor(uplift: number): string {
  if (uplift >= 0.20) return 'text-emerald-700';
  if (uplift >= 0.10) return 'text-[#0054A6]';
  if (uplift >= 0.03) return 'text-amber-700';
  if (uplift >= 0)    return 'text-slate-500';
  return 'text-red-700';
}

export function segmentBadgeClass(segment: Segment | string): string {
  const map: Record<string, string> = {
    high_value: 'badge-blue',
    mid:        'badge-green',
    low:        'badge-yellow',
    dormant:    'badge-slate',
  };
  return map[segment] || 'badge-slate';
}

export function fatigueBadgeClass(status: FatigueStatus): string {
  return status === 'suppressed' ? 'badge-red'
       : status === 'at_risk'   ? 'badge-yellow'
       : 'badge-green';
}

export function recommendedActionBadgeClass(action: RecommendedAction | string): string {
  const map: Record<string, string> = {
    target:               'badge-green',
    target_low_incentive: 'badge-blue',
    sure_thing:           'badge-yellow',
    low_value:            'badge-slate',
    do_not_disturb:       'badge-red',
    suppressed_fatigue:   'badge-amber',
    do_not_target:        'badge-slate',
  };
  return map[action] || 'badge-slate';
}

export function upliftSegmentColor(seg: UpliftSegment): string {
  const map: Record<UpliftSegment, string> = {
    persuadable:    'text-emerald-700',
    low_uplift:     'text-[#0054A6]',
    sure_thing:     'text-amber-700',
    lost_cause:     'text-slate-500',
    do_not_disturb: 'text-red-700',
  };
  return map[seg] || 'text-slate-500';
}

// ── Suppress reason labels ────────────────────────────────────────────────────

export function suppressReasonLabel(reason: string): string {
  const map: Record<string, string> = {
    fatigue:          'Campaign Fatigue',
    spacing:          'Too Recent',
    do_not_disturb:   'Negative Uplift',
    sure_thing:       'High Baseline — Saves Budget',
    lost_cause:       'Low Baseline + Low Uplift',
    budget_exhausted: 'Budget Exhausted',
    not_eligible:     'Not Eligible',
  };
  return map[reason] || reason;
}
