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

interface Props {
  customerId: string;
}

const CAMPAIGN_TYPES: CampaignType[] = ['recharge', 'merchant', 'p2p', 'bill'];

export function CustomerDetailPanel({ customerId }: Props) {
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
  if (error)   return <div className="p-4 text-red-400 text-sm">{error}</div>;
  if (!customer) return null;

  const { explanation: exp } = customer;

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Identity */}
      <div>
        <p className="text-xs font-mono text-slate-500">{customer.customer_id}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`badge ${segmentBadgeClass(customer.segment)}`}>
            {SEGMENT_LABELS[customer.segment]}
          </span>
          <span className={`badge ${fatigueBadgeClass(customer.fatigue_status)}`}>
            {FATIGUE_LABELS[customer.fatigue_status]}
          </span>
          {customer.is_dormant && <span className="badge badge-red">Dormant</span>}
        </div>
      </div>

      {/* Profile stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Monthly GMV',   value: formatBDT(customer.avg_monthly_gmv_bdt) },
          { label: 'Txn / Month',   value: formatNumber(customer.avg_monthly_txn_count, 0) },
          { label: 'Tenure',        value: `${customer.tenure_months} mo` },
          { label: 'Days Since Txn',value: `${customer.days_since_last_txn}d` },
          { label: 'Campaigns (90d)', value: String(customer.campaign_received_last_90d) },
          { label: 'Responses (90d)', value: String(customer.campaign_responded_last_90d) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800/50 rounded-lg p-2.5">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Uplift by campaign type */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
          Uplift by Campaign Type
        </p>
        <div className="space-y-2.5">
          {CAMPAIGN_TYPES.map(ct => {
            const scores = customer.uplift_scores?.[ct];
            const uplift = typeof scores === 'object' ? scores.uplift ?? scores : scores ?? 0;
            return (
              <div key={ct}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">
                    {CAMPAIGN_TYPE_LABELS[ct].split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
                <UpliftBar value={Number(uplift)} size="md" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation narrative */}
      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/40">
        <p className="text-xs font-medium text-upay-400 mb-1.5">
          AI Explanation — {CAMPAIGN_TYPE_LABELS[exp.primary_campaign_type]}
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">{exp.narrative}</p>
      </div>

      {/* Treatment vs Control */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
          Predicted Conversion Probability
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-upay-900/20 border border-upay-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400">With Offer (T=1)</p>
            <p className="text-xl font-bold text-upay-400 mt-1">
              {formatPct(exp.treatment_prob)}
            </p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400">Without Offer (T=0)</p>
            <p className="text-xl font-bold text-slate-300 mt-1">
              {formatPct(exp.control_prob)}
            </p>
          </div>
        </div>
        <div className="mt-2 text-center">
          <span className={`text-sm font-semibold ${exp.uplift_score >= 0.10 ? 'text-emerald-400' : exp.uplift_score >= 0 ? 'text-upay-400' : 'text-red-400'}`}>
            Δ = {exp.uplift_score >= 0 ? '+' : ''}{(exp.uplift_score * 100).toFixed(1)}pp uplift
          </span>
        </div>
      </div>

      {/* Feature drivers */}
      {exp.top_drivers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Top Influencing Features
          </p>
          <div className="space-y-2">
            {exp.top_drivers.slice(0, 4).map((d, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${d.direction === 'positive' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="text-xs text-slate-300">{d.label}</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-xs font-mono text-slate-400">
                    {typeof d.raw_value === 'number' ? d.raw_value.toFixed(3) : d.raw_value}
                  </span>
                  <span className={`text-xs font-medium ${
                    d.impact === 'high' ? 'text-emerald-400'
                    : d.impact === 'medium' ? 'text-upay-400'
                    : 'text-slate-500'
                  }`}>
                    {d.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fatigue detail */}
      {customer.fatigue_status !== 'safe' && (
        <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-400 mb-1">Fatigue Warning</p>
          <p className="text-xs text-slate-400">
            Received {customer.campaign_received_last_90d} campaigns in last 90 days,
            responded {customer.campaign_responded_last_90d} time(s).
            {customer.days_since_prev_campaign !== undefined && (
              <> Last campaign was {customer.days_since_prev_campaign} days ago.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-8 bg-slate-800 rounded animate-pulse" />
      ))}
    </div>
  );
}
