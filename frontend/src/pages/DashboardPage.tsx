// pages/DashboardPage.tsx
import { Users, TrendingUp, AlertCircle, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStats } from '../hooks/useStats';
import { KPICard } from '../components/shared/KPICard';
import { formatBDT, formatPct, CAMPAIGN_TYPE_LABELS } from '../lib/utils';

export function DashboardPage() {
  const { data: stats, loading, error } = useStats();

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;
  if (!stats)  return null;

  const { uplift_distribution } = stats;
  const histData = uplift_distribution.bins.map((bin, i) => ({
    label: uplift_distribution.labels[i],
    count: uplift_distribution.counts[i],
    bin,
  }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Population Overview</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Synthetic customer base — S-Learner uplift model pre-computed for all customers
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <KPICard
          title="Total Customers"
          value={stats.total_customers.toLocaleString()}
          subtitle="In synthetic population"
          icon={<Users size={14} />}
          accent="blue"
          animate
        />
        <KPICard
          title="Active Customers"
          value={stats.active_customers.toLocaleString()}
          subtitle={`${formatPct(stats.active_customers / stats.total_customers)} of total`}
          icon={<Activity size={14} />}
          accent="green"
          animate
        />
        <KPICard
          title="Fatigued Customers"
          value={stats.fatigued_customers.toLocaleString()}
          subtitle="Will be suppressed in next campaign"
          icon={<AlertCircle size={14} />}
          accent="amber"
          animate
        />
        <KPICard
          title="Avg Recharge Uplift"
          value={formatPct(stats.avg_uplift.recharge)}
          subtitle="Expected incremental lift"
          icon={<TrendingUp size={14} />}
          accent="blue"
          animate
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Uplift Distribution Chart */}
        <div className="xl:col-span-2 card p-5">
          <h2 className="section-title">
            Recharge Uplift Distribution
            <span className="ml-2 text-xs font-normal text-slate-500">
              All {stats.total_customers.toLocaleString()} customers
            </span>
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Distribution of estimated incremental response probability if treated vs. untreated.
            Customers near 0 have little to gain from the campaign.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={histData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                interval={1}
                angle={-30}
                textAnchor="end"
                height={45}
              />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e5e7eb' }}
                itemStyle={{ color: '#60a5fa' }}
                formatter={(v: number) => [v.toLocaleString(), 'Customers']}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {histData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.bin < 0    ? '#ef4444' :
                      entry.bin < 0.05 ? '#6b7280' :
                      entry.bin < 0.10 ? '#3b82f6' :
                      entry.bin < 0.20 ? '#1793e8' :
                                         '#10b981'
                    }
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"/> High uplift (≥20pp)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-upay-500 inline-block"/> Moderate (5–20pp)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block"/> Low / None</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"/> Negative</span>
          </div>
        </div>

        {/* Segment Breakdown */}
        <div className="card p-5">
          <h2 className="section-title">Customer Segments</h2>
          <div className="space-y-3 mt-2">
            {[
              { label: 'High Value', key: 'high_value', color: 'bg-upay-500',     textColor: 'text-upay-400' },
              { label: 'Mid Tier',   key: 'mid',        color: 'bg-emerald-500',  textColor: 'text-emerald-400' },
              { label: 'Low Tier',   key: 'low',        color: 'bg-amber-500',    textColor: 'text-amber-400' },
              { label: 'Dormant',    key: 'dormant',    color: 'bg-slate-600',    textColor: 'text-slate-400' },
            ].map(({ label, key, color, textColor }) => {
              const count = stats.segments[key as keyof typeof stats.segments] || 0;
              const pct   = count / stats.total_customers;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{label}</span>
                    <span className={`text-sm font-semibold ${textColor}`}>
                      {count.toLocaleString()} ({formatPct(pct)})
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Average uplift per campaign type */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Avg Uplift by Campaign Type
            </p>
            <div className="space-y-2">
              {(Object.entries(stats.avg_uplift) as [string, number][]).map(([ct, val]) => (
                <div key={ct} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {CAMPAIGN_TYPE_LABELS[ct as keyof typeof CAMPAIGN_TYPE_LABELS]?.split(' ')[0] || ct}
                  </span>
                  <span className="text-xs font-mono font-semibold text-upay-400">
                    +{(val * 100).toFixed(1)}pp
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Model info footer */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-300">AI Model</p>
          <p className="text-xs text-slate-500 mt-0.5">{stats.model_info.type}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-300">Top Signal Feature</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {stats.model_info.top_features[0]?.label || '—'}
            {stats.model_info.top_features[0] && (
              <span className="ml-2 text-upay-400 font-mono">
                {(stats.model_info.top_features[0].importance * 100).toFixed(1)}%
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-7 w-48 bg-slate-800 rounded-lg animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-80 bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-80 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-400 font-medium mb-2">Failed to load dashboard</p>
        <p className="text-slate-500 text-sm">{message}</p>
        <p className="text-slate-600 text-xs mt-2">Make sure the backend is running: cd backend && npm start</p>
      </div>
    </div>
  );
}
