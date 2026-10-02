// pages/CustomersPage.tsx
import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { UpliftBar } from '../components/shared/UpliftBar';
import { CustomerDetailPanel } from '../components/customers/CustomerDetailPanel';
import type { Customer, Segment, FatigueStatus, CampaignType } from '../types';
import {
  formatBDT, formatNumber,
  segmentBadgeClass, fatigueBadgeClass,
  SEGMENT_LABELS, FATIGUE_LABELS, CAMPAIGN_TYPE_OPTIONS,
} from '../lib/utils';

const SORT_OPTIONS = [
  { value: 'avg_monthly_gmv_bdt',    label: 'Monthly GMV ↓' },
  { value: 'avg_monthly_txn_count',  label: 'Txn Count ↓' },
  { value: 'uplift_recharge',        label: 'Recharge Uplift ↓' },
  { value: 'uplift_merchant',        label: 'Merchant Uplift ↓' },
  { value: 'days_since_last_txn',    label: 'Recency ↑ (oldest first)' },
];

export function CustomersPage() {
  const { data, loading, error, params, updateParams, setPage } = useCustomers();
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  return (
    <div className="flex h-full">
      {/* Main panel */}
      <div className={`flex flex-col ${selectedId ? 'flex-1' : 'w-full'} overflow-hidden`}>
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900 flex items-center gap-3 flex-wrap">
          <h1 className="text-sm font-semibold text-white mr-2">Customer Explorer</h1>

          {/* Segment filter */}
          <select
            className="select text-xs py-1.5 w-36"
            value={params.segment || 'all'}
            onChange={e => handleSegmentFilter(e.target.value)}
          >
            <option value="all">All Segments</option>
            <option value="high_value">High Value</option>
            <option value="mid">Mid Tier</option>
            <option value="low">Low Tier</option>
            <option value="dormant">Dormant</option>
          </select>

          {/* Fatigue filter */}
          <select
            className="select text-xs py-1.5 w-36"
            value={params.fatigue || 'all'}
            onChange={e => handleFatigueFilter(e.target.value)}
          >
            <option value="all">Any Fatigue</option>
            <option value="safe">Safe</option>
            <option value="at_risk">At Risk</option>
            <option value="suppressed">Suppressed</option>
          </select>

          {/* Sort */}
          <select
            className="select text-xs py-1.5 w-44"
            value={params.sort || 'avg_monthly_gmv_bdt'}
            onChange={e => handleSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="ml-auto text-xs text-slate-500">
            {data ? `${formatNumber(data.total)} customers` : '—'}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading && <LoadingTable />}
          {error && (
            <div className="p-8 text-center text-red-400 text-sm">{error}</div>
          )}
          {data && !loading && (
            <table className="data-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>Customer ID</th>
                  <th>Segment</th>
                  <th>Monthly GMV</th>
                  <th>Txn/Month</th>
                  <th>Days Since Txn</th>
                  <th>Fatigue</th>
                  <th>Recharge Uplift</th>
                  <th>Merchant Uplift</th>
                  <th>P2P Uplift</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map(c => (
                  <CustomerRow
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

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {data.page} of {data.pages} · {formatNumber(data.total)} total
            </p>
            <div className="flex gap-1">
              <button
                className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40"
                disabled={data.page >= data.pages}
                onClick={() => setPage(data.page + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedId && (
        <div className="w-96 border-l border-slate-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
            <span className="text-sm font-medium text-white">Customer Detail</span>
            <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <CustomerDetailPanel customerId={selectedId} />
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerRow({
  customer, isSelected, onClick,
}: {
  customer: Customer;
  isSelected: boolean;
  onClick: () => void;
}) {
  const c = customer;
  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer ${isSelected ? 'bg-upay-900/20 !border-upay-800/40' : ''}`}
    >
      <td className="font-mono text-xs text-upay-400 hover:underline">{c.customer_id}</td>
      <td><span className={`badge ${segmentBadgeClass(c.segment)}`}>{SEGMENT_LABELS[c.segment]}</span></td>
      <td className="font-mono text-xs">{formatBDT(c.avg_monthly_gmv_bdt)}</td>
      <td className="font-mono text-xs">{c.avg_monthly_txn_count.toFixed(0)}</td>
      <td className="text-xs">{c.days_since_last_txn}d ago</td>
      <td>
        <span className={`badge ${fatigueBadgeClass(c.fatigue_status)}`}>
          {FATIGUE_LABELS[c.fatigue_status]}
        </span>
      </td>
      <td className="w-32"><UpliftBar value={c.uplift_scores.recharge} size="sm" /></td>
      <td className="w-32"><UpliftBar value={c.uplift_scores.merchant} size="sm" /></td>
      <td className="w-32"><UpliftBar value={c.uplift_scores.p2p} size="sm" /></td>
    </tr>
  );
}

function LoadingTable() {
  return (
    <div className="p-4 space-y-2">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="h-10 bg-slate-800 rounded animate-pulse" style={{ animationDelay: `${i * 30}ms` }} />
      ))}
    </div>
  );
}
