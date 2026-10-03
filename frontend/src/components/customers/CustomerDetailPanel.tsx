// components/customers/CustomerDetailPanel.tsx
import { useState, useEffect } from 'react';
import { fetchCustomer } from '../../services/api';
import type { CustomerDetail, CampaignType } from '../../types';
import {
  formatBDT, formatPct, formatNumber,
  segmentBadgeClass, fatigueBadgeClass,
  SEGMENT_LABELS, FATIGUE_LABELS, CAMPAIGN_TYPE_LABELS,
} from '../../lib/utils';
import { UpliftBar } from '../shared/UpliftBar';
import { NumberTicker } from '../ui/number-ticker';
import { BlurFade } from '../ui/blur-fade';
import {
  TrendingUp, TrendingDown,
  Sparkles, CheckCircle2, ShieldAlert,
} from 'lucide-react';

interface Props {
  customerId: string;
  onClose?: () => void;
}

const CAMPAIGN_TYPES: CampaignType[] = ['recharge', 'merchant', 'p2p', 'bill'];

function getRecommendedIncentive(uplift: number, controlProb: number, fatigued: boolean): { action: string; incentive: number | null } {
  if (fatigued) return { action: 'Suppress — Fatigued', incentive: null };
  if (uplift < 0) return { action: 'Suppress — Negative Uplift', incentive: null };
  if (uplift < 0.03 && controlProb > 0.65) return { action: 'Skip — Sure Thing (High Baseline)', incentive: null };
  if (uplift < 0.03) return { action: 'Skip — Lost Cause (Low Response)', incentive: null };
  if (uplift >= 0.25) return { action: 'Target (High Incentive)', incentive: 50 };
  if (uplift >= 0.15) return { action: 'Target', incentive: 30 };
  if (uplift >= 0.10) return { action: 'Target', incentive: 20 };
  return { action: 'Target (Low Incentive)', incentive: 10 };
}

export function CustomerDetailPanel({ customerId, onClose }: Props) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCustomer(customerId)
      .then(setCustomer)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <PanelSkeleton />;
  if (error)   return <div className="p-5 text-red-600 text-xs font-semibold">{error}</div>;
  if (!customer) return null;

  const { explanation: exp } = customer;
  const isFatigued = customer.fatigue_status === 'suppressed';
  const { action, incentive } = getRecommendedIncentive(exp.uplift_score, exp.control_prob, isFatigued);

  const expectedIncrementalValue = incentive
    ? (exp.uplift_score * (customer.avg_monthly_gmv_bdt / Math.max(customer.avg_monthly_txn_count, 1)))
    : 0;

  const upliftPct = exp.uplift_score * 100;

  return (
    <div className="p-4 md:p-5 space-y-5 h-full overflow-y-auto bg-white">
      {/* ── Top Identity & Header ─────────────────────────────────────── */}
      <BlurFade delay={0.03}>
        <div className="flex items-start justify-between pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900 tracking-wider">
                {customer.customer_id}
              </span>
              <span className={`badge ${segmentBadgeClass(customer.segment)}`}>
                {SEGMENT_LABELS[customer.segment]}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`badge ${fatigueBadgeClass(customer.fatigue_status)}`}>
                {FATIGUE_LABELS[customer.fatigue_status]}
              </span>
              {customer.is_dormant && (
                <span className="badge badge-red">Dormant Account</span>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 cursor-pointer font-medium"
            >
              Close
            </button>
          )}
        </div>
      </BlurFade>

      {/* ── 15. The Strong Counterfactual Comparison (Hero Component - Light Mode) */}
      <BlurFade delay={0.07}>
        <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-[#0054A6]/20 p-4 md:p-5 shadow-xs">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0054A6] via-[#FFD600] to-[#0054A6]" />

          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0054A6] flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" />
              Causal Counterfactual Comparison
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold">
              {CAMPAIGN_TYPE_LABELS[exp.primary_campaign_type]?.split(' ')[0]} Model
            </span>
          </div>

          {/* 2-box comparison */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {/* Without Campaign */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                Without Campaign
              </p>
              <p className="text-[10px] text-slate-400 mb-1">Baseline organic</p>
              <div className="text-2xl md:text-3xl font-black text-slate-800 font-mono tracking-tight">
                <NumberTicker
                  value={Math.round(exp.control_prob * 100)}
                  suffix="%"
                />
              </div>
            </div>

            {/* With Campaign */}
            <div className="bg-blue-50/80 border border-[#0054A6]/30 rounded-xl p-3 text-center shadow-xs">
              <p className="text-[10px] font-bold text-[#0054A6] uppercase tracking-wider mb-0.5">
                With Campaign
              </p>
              <p className="text-[10px] text-[#0054A6]/70 mb-1">Treated response</p>
              <div className="text-2xl md:text-3xl font-black text-[#0054A6] font-mono tracking-tight">
                <NumberTicker
                  value={Math.round(exp.treatment_prob * 100)}
                  suffix="%"
                />
              </div>
            </div>
          </div>

          {/* Delta Pill Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Incremental Uplift
              </p>
              <p className="text-[11px] text-slate-600">Net campaign-driven delta</p>
            </div>
            <div className="flex items-center gap-1 text-xl font-black font-mono text-emerald-700">
              <span>{exp.uplift_score >= 0 ? '+' : ''}{upliftPct.toFixed(1)}</span>
              <span className="text-xs font-bold text-emerald-800">pp</span>
            </div>
          </div>

          {/* Visual comparison bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1 font-semibold">
              <span>0%</span>
              <span>Baseline: {formatPct(exp.control_prob, 0)}</span>
              <span>Treated: {formatPct(exp.treatment_prob, 0)}</span>
              <span>100%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
              {/* Baseline fill */}
              <div
                className="h-full bg-slate-400 rounded-l-full absolute left-0"
                style={{ width: `${exp.control_prob * 100}%` }}
              />
              {/* Lift fill */}
              <div
                className="h-full bg-gradient-to-r from-[#0054A6] to-emerald-500 absolute"
                style={{
                  left: `${exp.control_prob * 100}%`,
                  width: `${Math.max(0, exp.uplift_score * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </BlurFade>

      {/* ── Campaign Recommendation Card ───────────────────────────────── */}
      <BlurFade delay={0.11}>
        <div className={`rounded-xl p-4 border transition-all ${
          action.startsWith('Target')
            ? 'bg-emerald-50/70 border-emerald-200'
            : action.startsWith('Suppress')
            ? 'bg-red-50/70 border-red-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Optimal Action Recommendation
            </p>
            {action.startsWith('Target') ? (
              <span className="badge badge-green text-[10px] font-bold">Optimal Target</span>
            ) : (
              <span className="badge badge-amber text-[10px] font-bold">Suppression Rule</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{action}</p>
              {incentive && (
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Recommended incentive tier</p>
              )}
            </div>
            {incentive ? (
              <div className="px-3 py-1 rounded-lg bg-[#FFD600]/25 border border-[#FFD600]/60 text-right">
                <span className="text-2xl font-black text-amber-950 font-mono">৳{incentive}</span>
                <p className="text-[9px] uppercase tracking-wider text-amber-800 font-bold">Cashback</p>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded">No Offer</span>
            )}
          </div>

          {incentive && expectedIncrementalValue > 0 && (
            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200/80">
              <span className="text-xs text-slate-600 font-medium">Est. Incremental GMV Contribution</span>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                {formatBDT(expectedIncrementalValue)}
              </span>
            </div>
          )}
        </div>
      </BlurFade>

      {/* ── Model Narrative ────────────────────────────────────────────── */}
      <BlurFade delay={0.14}>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs">
          <div className="flex items-center gap-1.5 text-[#0054A6] font-bold uppercase tracking-wider text-[10px] mb-1.5">
            <CheckCircle2 size={12} />
            Model Synthesis
          </div>
          <p className="text-slate-700 leading-relaxed text-[11px]">{exp.narrative}</p>
        </div>
      </BlurFade>

      {/* ── Profile Attributes ─────────────────────────────────────────── */}
      <BlurFade delay={0.17}>
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Historical Profile
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: 'Monthly GMV', value: formatBDT(customer.avg_monthly_gmv_bdt) },
              { label: 'Txn / Month', value: formatNumber(customer.avg_monthly_txn_count, 0) },
              { label: 'Tenure', value: `${customer.tenure_months} months` },
              { label: 'Recency (Days)', value: `${customer.days_since_last_txn}d ago` },
              { label: 'Campaigns (90d)', value: `${customer.campaign_received_last_90d} received` },
              { label: 'Responses (90d)', value: `${customer.campaign_responded_last_90d} responses` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</p>
                <p className="text-xs font-bold font-mono text-slate-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </BlurFade>

      {/* ── Uplift Across Categories ───────────────────────────────────── */}
      <BlurFade delay={0.2}>
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-2.5 shadow-xs">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Predicted Uplift by Category
          </p>
          <div className="space-y-2">
            {CAMPAIGN_TYPES.map(ct => {
              const scores = customer.uplift_scores?.[ct];
              const uplift = typeof scores === 'object' ? (scores as any).uplift ?? scores : scores ?? 0;
              return (
                <div key={ct}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-800 font-semibold">
                      {CAMPAIGN_TYPE_LABELS[ct].split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                  <UpliftBar value={Number(uplift)} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      </BlurFade>

      {/* ── Feature Explanation Drivers ─────────────────────────────────── */}
      {exp.top_drivers.length > 0 && (
        <BlurFade delay={0.23}>
          <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Individual Feature Drivers
            </p>
            <div className="space-y-2">
              {exp.top_drivers.slice(0, 5).map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-xs">
                  <div className="flex items-center gap-1.5">
                    {d.direction === 'positive' ? (
                      <TrendingUp size={12} className="text-emerald-600" />
                    ) : (
                      <TrendingDown size={12} className="text-amber-600" />
                    )}
                    <span className="text-slate-700 font-medium">{d.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 text-[11px]">
                      {typeof d.raw_value === 'number' ? d.raw_value.toFixed(1) : d.raw_value}
                    </span>
                    <span className={`text-[10px] font-bold uppercase ${
                      d.impact === 'high' ? 'text-emerald-700' :
                      d.impact === 'medium' ? 'text-[#0054A6]' :
                      'text-slate-500'
                    }`}>
                      {d.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>
      )}

      {/* ── Fatigue Guard Warning ──────────────────────────────────────── */}
      {customer.fatigue_status !== 'safe' && (
        <BlurFade delay={0.25}>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-1">
              <ShieldAlert size={14} />
              Fatigue Guard Warning
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              Customer received {customer.campaign_received_last_90d} communications in 90 days with {customer.campaign_responded_last_90d} conversions.
              {customer.fatigue_status === 'suppressed' ? (
                <strong className="text-amber-900 block mt-1">
                  Enforcing automatic suppression to protect customer retention.
                </strong>
              ) : (
                <span className="text-amber-800 block mt-1">
                  At risk of burnout. Cooldown period recommended.
                </span>
              )}
            </p>
          </div>
        </BlurFade>
      )}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="p-5 space-y-4 bg-white">
      <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
      <div className="h-36 bg-slate-100 rounded-xl animate-pulse" />
      <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
