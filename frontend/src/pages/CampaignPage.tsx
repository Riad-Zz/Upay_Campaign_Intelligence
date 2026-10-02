// pages/CampaignPage.tsx
import { useState } from 'react';
import { Play, RotateCcw, ChevronRight, Zap, ShieldOff, TrendingUp, Wallet, Users, Target } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useCampaignRun } from '../hooks/useCampaignRun';
import { KPICard } from '../components/shared/KPICard';
import { UpliftBar } from '../components/shared/UpliftBar';
import type { CampaignConfig, CampaignType, RecommendedCustomer, SuppressedCustomer } from '../types';
import {
  formatBDT, formatNumber, formatMultiplier, formatPct,
  CAMPAIGN_TYPE_OPTIONS, SEGMENT_OPTIONS, OFFER_VALUE_OPTIONS,
  segmentBadgeClass, suppressReasonLabel, SEGMENT_LABELS,
} from '../lib/utils';

const DEFAULT_CONFIG: CampaignConfig = {
  campaign_name:   'Friday Recharge Boost',
  campaign_type:   'recharge',
  offer_value_bdt: 30,
  budget_bdt:      500000,
  target_segment:  'all',
};

export function CampaignPage() {
  const [config, setConfig] = useState<CampaignConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'recommended' | 'suppressed'>('recommended');
  const { data: result, loading, error, execute, reset } = useCampaignRun();

  function handleChange(field: keyof CampaignConfig, value: string | number) {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (result) reset();
  }

  async function handleRun() {
    await execute(config);
  }

  return (
    <div className="flex h-full">
      {/* Left panel: Config form */}
      <div className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800">
          <h1 className="text-sm font-semibold text-white">Campaign Studio</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure and run campaign analysis</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Campaign name */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
              Campaign Name
            </label>
            <input
              className="input"
              value={config.campaign_name}
              onChange={e => handleChange('campaign_name', e.target.value)}
              placeholder="e.g. Friday Recharge Boost"
            />
          </div>

          {/* Campaign type */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
              Campaign Type
            </label>
            <select
              className="select"
              value={config.campaign_type}
              onChange={e => handleChange('campaign_type', e.target.value as CampaignType)}
            >
              {CAMPAIGN_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Offer value */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
              Offer Value
            </label>
            <select
              className="select"
              value={config.offer_value_bdt}
              onChange={e => handleChange('offer_value_bdt', Number(e.target.value))}
            >
              {OFFER_VALUE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label} cashback</option>
              ))}
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
              Campaign Budget
            </label>
            <input
              className="input font-mono"
              type="number"
              min={10000}
              step={50000}
              value={config.budget_bdt}
              onChange={e => handleChange('budget_bdt', Number(e.target.value))}
            />
            <p className="text-xs text-slate-500 mt-1">
              Max reach: ~{formatNumber(Math.floor(config.budget_bdt / config.offer_value_bdt))} customers
            </p>
          </div>

          {/* Target segment */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
              Target Segment
            </label>
            <select
              className="select"
              value={config.target_segment}
              onChange={e => handleChange('target_segment', e.target.value)}
            >
              {SEGMENT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-600 space-y-1">
              <p>• Fatigue filter: ≥3 campaigns/90d</p>
              <p>• Spacing rule: &lt;7 days since last</p>
              <p>• Budget optimizer: greedy ranking</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 space-y-2">
          <button
            className="btn-primary w-full flex items-center justify-center gap-2"
            onClick={handleRun}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play size={14} />
                Run Campaign Analysis
              </>
            )}
          </button>
          {result && (
            <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={reset}>
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Right panel: Results */}
      <div className="flex-1 overflow-y-auto">
        {!result && !loading && !error && <EmptyResultsState />}
        {loading && <LoadingResultsState />}
        {error && <ErrorState message={error} />}
        {result && <CampaignResults result={result} activeTab={activeTab} setActiveTab={setActiveTab} />}
      </div>
    </div>
  );
}

// ── Results panel ──────────────────────────────────────────────────────────────

function CampaignResults({
  result, activeTab, setActiveTab,
}: {
  result: ReturnType<typeof useCampaignRun>['data'] & {};
  activeTab: 'recommended' | 'suppressed';
  setActiveTab: (t: 'recommended' | 'suppressed') => void;
}) {
  if (!result) return null;
  const { summary, recommended, suppressed_fatigue, suppressed_other, feature_importances } = result;
  const allSuppressed = [...suppressed_fatigue, ...suppressed_other];

  // Uplift histogram data
  const histData = summary.uplift_distribution.bins.map((bin, i) => ({
    label: summary.uplift_distribution.labels[i],
    count: summary.uplift_distribution.counts[i],
    bin,
  }));

  // Feature importance bar data
  const importanceData = feature_importances.slice(0, 7).map(f => ({
    label: f.label,
    value: +(f.importance * 100).toFixed(1),
  }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{result.campaign_name}</h2>
          <p className="text-sm text-slate-400">
            {CAMPAIGN_TYPE_OPTIONS.find(o => o.value === result.campaign_type)?.label} ·
            BDT {result.offer_value_bdt} offer ·
            Processed in {summary.processing_time_ms}ms
          </p>
        </div>
        <span className="badge-green text-xs">Analysis Complete</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <KPICard
          title="Recommended"
          value={formatNumber(summary.recommended_count)}
          subtitle={`of ${formatNumber(summary.total_customers_analyzed)} analyzed`}
          icon={<Target size={14} />}
          accent="green"
          animate
        />
        <KPICard
          title="Budget Utilized"
          value={formatBDT(summary.budget_utilized_bdt, true)}
          subtitle={`${formatPct(summary.budget_utilized_bdt / summary.budget_bdt)} of ${formatBDT(summary.budget_bdt, true)}`}
          icon={<Wallet size={14} />}
          accent="blue"
          animate
        />
        <KPICard
          title="Incr. Transactions"
          value={formatNumber(summary.expected_incremental_txns, 0)}
          subtitle="Expected incremental conversions"
          icon={<TrendingUp size={14} />}
          accent="green"
          animate
        />
        <KPICard
          title="Incr. GMV"
          value={formatBDT(summary.expected_incremental_gmv_bdt, true)}
          subtitle={`${formatMultiplier(summary.gmv_multiplier)} per BDT spent`}
          icon={<Zap size={14} />}
          accent="blue"
          animate
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Cost Per Incr. Txn</p>
            <p className="text-lg font-bold text-amber-400 mt-0.5">
              {formatBDT(summary.cost_per_incremental_txn_bdt)}
            </p>
          </div>
          <div className="text-xs text-slate-500 text-right">
            <p>vs BDT {result.offer_value_bdt} offer cost</p>
          </div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Fatigued (Suppressed)</p>
            <p className="text-lg font-bold text-amber-400 mt-0.5">
              {formatNumber(summary.suppressed_fatigue_count)}
            </p>
          </div>
          <div className="text-xs text-slate-500 text-right">
            <p>Protected from over-targeting</p>
          </div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Sure Things Skipped</p>
            <p className="text-lg font-bold text-slate-300 mt-0.5">
              {formatNumber(summary.suppressed_sure_thing_count)}
            </p>
          </div>
          <div className="text-xs text-slate-500 text-right">
            <p>Would convert anyway</p>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Uplift distribution of recommended */}
        <div className="card p-5">
          <h3 className="section-title text-sm">
            Uplift Distribution — Recommended Audience
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={histData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} interval={0} angle={-25} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [v.toLocaleString(), 'Customers']}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {histData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.bin >= 0.20 ? '#10b981' : entry.bin >= 0.10 ? '#1793e8' : '#60a5fa'}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Feature importance */}
        <div className="card p-5">
          <h3 className="section-title text-sm">Model Feature Importances</h3>
          <p className="text-xs text-slate-500 mb-3">
            Which customer signals most influence uplift predictions.
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={importanceData}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} unit="%" />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} width={120} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`${v}%`, 'Importance']}
              />
              <Bar dataKey="value" fill="#1793e8" opacity={0.85} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="card">
        {/* Tab header */}
        <div className="flex border-b border-slate-800">
          <button
            className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'recommended' ? 'text-upay-400 border-b-2 border-upay-500' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('recommended')}
          >
            Recommended ({formatNumber(summary.recommended_count)})
          </button>
          <button
            className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab === 'suppressed' ? 'text-upay-400 border-b-2 border-upay-500' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('suppressed')}
          >
            Suppressed ({formatNumber(allSuppressed.length)})
          </button>
        </div>

        {activeTab === 'recommended' && <RecommendedTable customers={recommended} />}
        {activeTab === 'suppressed'  && <SuppressedTable customers={allSuppressed} />}
      </div>
    </div>
  );
}

function RecommendedTable({ customers }: { customers: RecommendedCustomer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Segment</th>
            <th>Uplift Score</th>
            <th>Treatment Prob</th>
            <th>Control Prob</th>
            <th>Avg Txn Value</th>
            <th>Exp. Incr. GMV</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          {customers.slice(0, 100).map(c => (
            <tr key={c.customer_id}>
              <td className="font-mono text-xs text-slate-300">{c.customer_id}</td>
              <td><span className={`badge ${segmentBadgeClass(c.segment)}`}>{SEGMENT_LABELS[c.segment]}</span></td>
              <td className="w-44">
                <UpliftBar value={c.uplift_score} />
              </td>
              <td className="text-upay-400 font-mono text-xs">{formatPct(c.treatment_prob)}</td>
              <td className="text-slate-400 font-mono text-xs">{formatPct(c.control_prob)}</td>
              <td className="font-mono text-xs">{formatBDT(c.avg_txn_value_bdt)}</td>
              <td className="text-emerald-400 font-mono text-xs">{formatBDT(c.expected_incremental_gmv_bdt)}</td>
              <td className="font-mono text-xs text-slate-400">{c.priority_score.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {customers.length > 100 && (
        <p className="text-xs text-slate-500 px-4 py-3 border-t border-slate-800">
          Showing top 100 of {formatNumber(customers.length)} recommended customers.
        </p>
      )}
    </div>
  );
}

function SuppressedTable({ customers }: { customers: SuppressedCustomer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Segment</th>
            <th>Reason</th>
            <th>Detail</th>
            <th>Campaigns (90d)</th>
            <th>Uplift Score</th>
          </tr>
        </thead>
        <tbody>
          {customers.slice(0, 100).map(c => (
            <tr key={c.customer_id}>
              <td className="font-mono text-xs text-slate-300">{c.customer_id}</td>
              <td><span className={`badge ${segmentBadgeClass(c.segment)}`}>{SEGMENT_LABELS[c.segment]}</span></td>
              <td>
                <span className={`badge ${
                  c.reason === 'fatigue' ? 'badge-amber' :
                  c.reason === 'do_not_disturb' ? 'badge-red' :
                  'badge-slate'
                }`}>
                  {suppressReasonLabel(c.reason)}
                </span>
              </td>
              <td className="text-xs text-slate-400 max-w-xs truncate" title={c.detail}>{c.detail}</td>
              <td className="text-xs text-center">{c.campaign_received_last_90d ?? '—'}</td>
              <td className="text-xs text-slate-400 font-mono">
                {c.uplift_score !== undefined ? `${c.uplift_score >= 0 ? '+' : ''}${(c.uplift_score * 100).toFixed(1)}pp` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {customers.length > 100 && (
        <p className="text-xs text-slate-500 px-4 py-3 border-t border-slate-800">
          Showing 100 of {formatNumber(customers.length)} suppressed customers.
        </p>
      )}
    </div>
  );
}

function EmptyResultsState() {
  return (
    <div className="h-full flex items-center justify-center text-center p-8">
      <div>
        <div className="w-16 h-16 rounded-full bg-upay-900/30 border border-upay-800/30 flex items-center justify-center mx-auto mb-4">
          <Play size={24} className="text-upay-400" />
        </div>
        <h3 className="text-white font-medium mb-2">Ready to Analyze</h3>
        <p className="text-slate-400 text-sm max-w-sm">
          Configure your campaign parameters on the left and click{' '}
          <strong className="text-white">Run Campaign Analysis</strong> to see
          AI-powered recommendations.
        </p>
      </div>
    </div>
  );
}

function LoadingResultsState() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-7 w-64 bg-slate-800 rounded-lg animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
      </div>
      <div className="h-80 bg-slate-800 rounded-xl animate-pulse" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center p-8">
        <p className="text-red-400 font-medium mb-2">Analysis failed</p>
        <p className="text-slate-500 text-sm">{message}</p>
      </div>
    </div>
  );
}
