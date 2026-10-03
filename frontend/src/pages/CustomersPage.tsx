// pages/CustomersPage.tsx
import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Search, Users,
} from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { UpliftBar } from '../components/shared/UpliftBar';
import { CustomerDetailPanel } from '../components/customers/CustomerDetailPanel';
import type { Customer, Segment, FatigueStatus, CampaignType } from '../types';
import {
  formatBDT, formatNumber, formatPct,
  segmentBadgeClass, fatigueBadgeClass,
  SEGMENT_LABELS, FATIGUE_LABELS,
} from '../lib/utils';

const SORT_OPTIONS = [
  { value: 'avg_monthly_gmv_bdt',    label: 'Monthly GMV ↓' },
  { value: 'avg_monthly_txn_count',  label: 'Txn Count ↓' },
  { value: 'uplift_recharge',        label: 'Recharge Uplift ↓' },
  { value: 'uplift_merchant',        label: 'Merchant Uplift ↓' },
  { value: 'days_since_last_txn',    label: 'Recency ↑ (oldest)' },
];

const ACTION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',                  label: 'Any Recommended Action' },
  { value: 'target_low_incentive', label: 'Target (Low Incentive)' },
  { value: 'sure_thing',           label: 'Skip — Sure Thing' },
  { value: 'suppressed_fatigue',   label: 'Suppressed — Fatigued' },
  { value: 'do_not_disturb',       label: 'Suppress — Negative Uplift' },
];

export function CustomersPage() {
  const { data, loading, error, params, updateParams, setPage } = useCustomers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchId, setSearchId] = useState<string>('');

  function handleSegmentFilter(segment: string) {
    updateParams({ segment: segment === 'all' ? undefined : segment as Segment });
  }

  function handleFatigueFilter(fatigue: string) {
    updateParams({ fatigue: fatigue === 'all' ? undefined : fatigue as FatigueStatus });
  }

  function handleSortChange(sort: string) {
    const ct = sort.startsWith('uplift_') ? sort.replace('uplift_', '') as CampaignType : undefined;
    updateParams({ sort, campaign_type: ct });
  }

  // Client-side filtering for action and search term
  const displayedCustomers = (data?.customers || []).filter(c => {
    if (searchId && !c.customer_id.toLowerCase().includes(searchId.toLowerCase())) {
      return false;
    }
    if (actionFilter === 'all') return true;
    return c.recommended_action === actionFilter;
  });

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden bg-[#f8fafc]">
      {/* ── Main Explorer Table Panel ─────────────────────────────────── */}
      <div className={`flex flex-col ${selectedId ? 'w-full lg:w-3/5 xl:w-2/3' : 'w-full'} min-w-0 h-full border-r border-slate-200 transition-all duration-300`}>
        {/* Toolbar Header */}
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-white space-y-3 flex-shrink-0 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#0054A6]" />
                <h1 className="text-base font-bold text-slate-900">Customer Explorer</h1>
                <span className="badge badge-blue text-[11px] font-mono font-bold">
                  {data ? `${formatNumber(data.total)} Profiles` : 'Loading...'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse, filter, and inspect individual causal uplift predictions and fatigue history.
              </p>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Customer ID..."
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                className="input text-xs pl-8 py-1.5 bg-white border-slate-200 text-slate-900"
              />
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Segment */}
            <select
              className="select text-xs py-1.5 w-32 bg-white border-slate-200 text-slate-800"
              value={params.segment || 'all'}
              onChange={e => handleSegmentFilter(e.target.value)}
            >
              <option value="all">All Segments</option>
              <option value="high_value">High Value</option>
              <option value="mid">Mid Tier</option>
              <option value="low">Low Tier</option>
              <option value="dormant">Dormant</option>
            </select>

            {/* Fatigue */}
            <select
              className="select text-xs py-1.5 w-32 bg-white border-slate-200 text-slate-800"
              value={params.fatigue || 'all'}
              onChange={e => handleFatigueFilter(e.target.value)}
            >
              <option value="all">Any Fatigue</option>
              <option value="safe">Safe (Ready)</option>
              <option value="at_risk">At Risk</option>
              <option value="suppressed">Fatigued</option>
            </select>

            {/* Action */}
            <select
              className="select text-xs py-1.5 w-44 bg-white border-slate-200 text-slate-800"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              {ACTION_FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              className="select text-xs py-1.5 w-40 bg-white border-slate-200 text-slate-800 ml-auto"
              value={params.sort || 'avg_monthly_gmv_bdt'}
              onChange={e => handleSortChange(e.target.value)}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Body (Scrollable) */}
        <div className="flex-1 overflow-auto bg-white">
          {loading && <LoadingTableRows />}
          {error && (
            <div className="p-12 text-center text-red-600 text-xs">{error}</div>
          )}

          {data && !loading && (
            <table className="data-table">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200">
                <tr>
                  <th>Customer ID</th>
                  <th>Segment</th>
                  <th>Monthly GMV</th>
                  <th>Txn / Mo</th>
                  <th>Fatigue Status</th>
                  <th>Recommended Action</th>
                  <th>Recharge Uplift</th>
                  <th>Baseline → Treated</th>
                </tr>
              </thead>
              <tbody>
                {displayedCustomers.map(c => (
                  <CustomerRowItem
                    key={c.customer_id}
                    customer={c}
                    isSelected={c.customer_id === selectedId}
                    onClick={() => setSelectedId(c.customer_id === selectedId ? null : c.customer_id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {data && (
          <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0 text-xs">
            <span className="text-slate-500 font-mono font-medium">
              Showing page {data.page} of {data.pages} ({formatNumber(data.total)} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-40"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                <ChevronLeft size={13} />
                Previous
              </button>
              <button
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 disabled:opacity-40"
                disabled={data.page >= data.pages}
                onClick={() => setPage(data.page + 1)}
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Customer Detail Slide-out / Side Panel ───────────────────────── */}
      {selectedId && (
        <div className="w-full lg:w-2/5 xl:w-1/3 h-full border-t lg:border-t-0 lg:border-l border-slate-200 bg-white overflow-hidden flex flex-col shadow-lg animate-fade-in">
          <CustomerDetailPanel
            customerId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}

// ── Customer Table Row (Light Mode) ────────────────────────────────────────

function CustomerRowItem({
  customer: c,
  isSelected,
  onClick,
}: {
  customer: Customer;
  isSelected: boolean;
  onClick: () => void;
}) {
  const rechargeUplift = typeof c.uplift_scores?.recharge === 'number'
    ? c.uplift_scores.recharge
    : (c.uplift_scores?.recharge as any)?.uplift ?? 0;

  const baselineProb = c.uplift_score_detail?.recharge?.control_prob ?? 0.45;
  const treatedProb = c.uplift_score_detail?.recharge?.treatment_prob ?? (baselineProb + rechargeUplift);

  // Deriving visual badge for recommended action
  const actionLabel = c.recommended_action === 'target' ? 'Target ৳30' :
    c.recommended_action === 'target_low_incentive' ? 'Target ৳10' :
    c.recommended_action === 'sure_thing' ? 'Sure Thing' :
    c.recommended_action === 'suppressed_fatigue' ? 'Fatigued' :
    c.recommended_action === 'do_not_disturb' ? 'DND (Neg Lift)' :
    'Skip';

  const actionStyle = c.recommended_action?.startsWith('target')
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : c.recommended_action === 'suppressed_fatigue'
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : c.recommended_action === 'do_not_disturb'
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50/70 border-l-4 border-l-[#0054A6]'
          : 'hover:bg-slate-50/80'
      }`}
    >
      <td className="font-mono text-xs font-bold text-slate-900">
        {c.customer_id}
      </td>
      <td>
        <span className={`badge ${segmentBadgeClass(c.segment)}`}>
          {SEGMENT_LABELS[c.segment]}
        </span>
      </td>
      <td className="font-mono text-xs text-slate-900 font-bold">
        {formatBDT(c.avg_monthly_gmv_bdt)}
      </td>
      <td className="font-mono text-xs text-slate-600 font-medium">
        {formatNumber(c.avg_monthly_txn_count, 0)}
      </td>
      <td>
        <span className={`badge ${fatigueBadgeClass(c.fatigue_status)}`}>
          {FATIGUE_LABELS[c.fatigue_status]}
        </span>
      </td>
      <td>
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${actionStyle}`}>
          {actionLabel}
        </span>
      </td>
      <td className="w-36">
        <UpliftBar value={rechargeUplift} size="sm" />
      </td>
      <td className="font-mono text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">{formatPct(baselineProb, 0)}</span>
          <span className="text-slate-400">→</span>
          <span className="text-[#0054A6] font-bold">{formatPct(treatedProb, 0)}</span>
        </div>
      </td>
    </tr>
  );
}

function LoadingTableRows() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
      ))}
    </div>
  );
}
