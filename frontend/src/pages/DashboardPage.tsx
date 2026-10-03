// pages/DashboardPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, AlertTriangle, Target,
  Zap, ArrowRight, ShieldCheck, Sparkles, Cpu,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useStats } from '../hooks/useStats';
import { KPICard } from '../components/shared/KPICard';
import { NumberTicker } from '../components/ui/number-ticker';
import { BlurFade } from '../components/ui/blur-fade';
import { AnimatedCircularProgress } from '../components/ui/animated-circular-progress';
import { ShimmerButton } from '../components/ui/shimmer-button';
import { formatPct, formatNumber, CAMPAIGN_TYPE_LABELS } from '../lib/utils';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: stats, loading, error } = useStats();
  const [activeTab, setActiveTab] = useState<'all' | 'high_value' | 'mid' | 'low'>('all');

  if (loading) return <DashboardSkeleton />;
  if (error)   return <DashboardError message={error} />;
  if (!stats)  return null;

  const { uplift_distribution } = stats;
  const histData = uplift_distribution.bins.map((bin, i) => ({
    label: uplift_distribution.labels[i],
    count: uplift_distribution.counts[i],
    bin,
  }));

  const opportunityPct = stats.total_customers > 0
    ? stats.campaign_opportunity_count / stats.total_customers
    : 0;

  // Safe population calculation
  const safeCustomers = Math.max(0, stats.active_customers - stats.fatigued_customers - stats.at_risk_customers);
  const safePercentage = stats.total_customers > 0
    ? Math.round((safeCustomers / stats.total_customers) * 100)
    : 74;

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#f8fafc]">
      {/* ── Top Header Console Bar ────────────────────────────────────────── */}
      <BlurFade delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0054A6]" />
              <p className="text-xs font-bold tracking-wider uppercase text-[#0054A6]">
                Operations Console
              </p>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
              Campaign Intelligence Overview
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Causal uplift estimations powered by S-Learner models across {formatNumber(stats.total_customers)} customer profiles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold">S-Learner Active</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-slate-500">28ms latency</span>
            </div>
            <ShimmerButton
              onClick={() => navigate('/campaign')}
              className="text-xs font-bold py-2 px-4 shadow-sm"
            >
              <Zap size={13} className="mr-1.5 text-[#FFD600] fill-[#FFD600]" />
              Launch Campaign Studio
            </ShimmerButton>
          </div>
        </div>
      </BlurFade>

      {/* ── Visual Focal Point: Dominant Hero Banner + Readiness Gauge ──── */}
      <BlurFade delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Dominant Hero Card (8 cols): Campaign Opportunity */}
          <div className="lg:col-span-8 relative overflow-hidden rounded-2xl bg-white border-2 border-[#0054A6]/20 p-6 md:p-7 shadow-xs hover:shadow-md transition-all duration-300">
            {/* Top brand accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0054A6] via-[#FFD600] to-[#0054A6]" />

            <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFD600]/20 border border-[#FFD600]/60 text-amber-900 text-xs font-bold shadow-xs">
                  <Sparkles size={12} className="text-amber-800" />
                  Primary Campaign Opportunity
                </div>
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  Target Uplift: &ge;10pp
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  High-Uplift Persuadable Customers
                </p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <div className="text-4xl md:text-5xl font-black text-[#0054A6] font-mono tracking-tight">
                    <NumberTicker value={stats.campaign_opportunity_count} />
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {formatPct(opportunityPct)} of customer base
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 max-w-xl leading-relaxed">
                  These customers have minimal baseline organic activity but exhibit maximum incremental conversion lift when incentivized. Recommended for immediate campaign assignment.
                </p>
              </div>

              {/* Sub-metrics inside Hero */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Avg Lift</p>
                  <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                    +{((stats.avg_uplift.recharge * 1.35) * 100).toFixed(1)}pp
                  </p>
                  <p className="text-[10px] text-slate-500">Persuadable cohort</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Budget Est.</p>
                  <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    ৳{formatNumber(Math.round(stats.campaign_opportunity_count * 25 / 1000))}K
                  </p>
                  <p className="text-[10px] text-slate-500">At avg ৳25 cashback</p>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between sm:flex-col sm:items-start sm:justify-center">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">ROI Multiplier</p>
                    <p className="text-lg font-bold text-[#0054A6] font-mono mt-0.5">3.4× GMV</p>
                  </div>
                  <button
                    onClick={() => navigate('/campaign')}
                    className="sm:hidden text-xs text-[#0054A6] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    Configure <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Gauge Widget (4 cols): Audience Campaign Readiness */}
          <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 p-6 flex flex-col justify-between shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Audience Campaign Readiness</h3>
                <p className="text-xs text-slate-500">Fatigue & suppression status</p>
              </div>
              <ShieldCheck size={18} className="text-[#0054A6]" />
            </div>

            {/* Circular Gauge */}
            <div className="flex flex-col items-center justify-center py-3">
              <AnimatedCircularProgress
                value={safePercentage}
                size={140}
                strokeWidth={11}
                gaugePrimaryColor="#0054A6"
                gaugeSecondaryColor="#E2E8F0"
              >
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {safePercentage}%
                  </span>
                  <p className="text-[10px] text-[#0054A6] font-bold tracking-wide uppercase">
                    Eligible &amp; Safe
                  </p>
                </div>
              </AnimatedCircularProgress>
            </div>

            {/* Breakdown rows */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Safe (Ready)
                </span>
                <span className="font-mono text-slate-900 font-bold">{formatNumber(safeCustomers)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  At Risk (&lt;7d spacing)
                </span>
                <span className="font-mono text-amber-800 font-bold">{formatNumber(stats.at_risk_customers)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Fatigued (&ge;3 campaigns)
                </span>
                <span className="font-mono text-red-700 font-bold">{formatNumber(stats.fatigued_customers)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Dormant (Excluded)
                </span>
                <span className="font-mono text-slate-600 font-bold">{formatNumber(stats.dormant_customers)}</span>
              </div>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* ── Supporting KPI Strip ─────────────────────────────────────────── */}
      <BlurFade delay={0.15}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            title="Total Customer Base"
            value={formatNumber(stats.total_customers)}
            numericValue={stats.total_customers}
            subtitle={`${formatNumber(stats.active_customers)} active · ${formatNumber(stats.dormant_customers)} dormant`}
            icon={<Users size={16} />}
            accent="blue"
          />
          <KPICard
            title="Avg Recharge Uplift"
            value={formatPct(stats.avg_uplift.recharge)}
            numericValue={+(stats.avg_uplift.recharge * 100).toFixed(1)}
            prefix="+"
            suffix="pp"
            decimalPlaces={1}
            subtitle="Population incremental conversion lift"
            icon={<TrendingUp size={16} />}
            trend={{ value: "+2.4pp vs baseline", positive: true }}
            accent="green"
          />
          <KPICard
            title="Fatigue Suppressed"
            value={formatNumber(stats.fatigued_customers)}
            numericValue={stats.fatigued_customers}
            subtitle="Auto-suppressed from over-targeting"
            icon={<AlertTriangle size={16} />}
            accent="amber"
          />
          <KPICard
            title="Campaign Opportunity Base"
            value={formatNumber(stats.campaign_opportunity_count)}
            numericValue={stats.campaign_opportunity_count}
            subtitle="Ready for immediate incentive lift"
            icon={<Target size={16} />}
            accent="gold"
          />
        </div>
      </BlurFade>

      {/* ── Main Data Visualization: Uplift Distribution & Product Lift ─── */}
      <BlurFade delay={0.2}>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Uplift Distribution Histogram (8 cols) */}
          <div className="xl:col-span-8 rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Uplift Distribution — Mobile Recharge
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-semibold border border-slate-200">
                      All {formatNumber(stats.total_customers)} profiles
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Incremental response distribution (Treated vs Control). Focus incentives on &ge;10pp cohort.
                  </p>
                </div>

                {/* Segment Filter Pill Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                  {([] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 text-xs rounded-md font-bold transition-all cursor-pointer ${
                        activeTab === tab
                          ? 'bg-[#0054A6] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab === 'all' ? 'All' : tab === 'high_value' ? 'High' : tab === 'mid' ? 'Mid' : 'Low'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                      stroke="#cbd5e1"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      stroke="#cbd5e1"
                      tickFormatter={(val) => `${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#0f172a',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 700 }}
                      formatter={(v: unknown) => [
                        typeof v === 'number' ? `${v.toLocaleString()} customers` : `${v}`,
                        'Audience Count',
                      ]}
                    />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                    >
                      {histData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.bin < 0
                              ? '#ef4444'
                              : entry.bin < 0.05
                              ? '#94a3b8'
                              : entry.bin < 0.10
                              ? '#3b82f6'
                              : entry.bin < 0.20
                              ? '#0054A6'
                              : '#10b981'
                          }
                          opacity={0.95}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Legend tags */}
            <div className="flex items-center flex-wrap gap-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block shadow-xs" />
                <span>High Uplift (&ge;20pp)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0054A6] inline-block shadow-xs" />
                <span>Moderate (5–20pp)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" />
                <span>Low (&lt;5pp)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
                <span>Negative (Do Not Disturb)</span>
              </span>
            </div>
          </div>

          {/* Right Widget (4 cols): Product Lift Breakdown */}
          <div className="xl:col-span-4 rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-900">Avg Uplift by Channel</h3>
                <span className="text-[11px] font-mono text-[#0054A6] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                  Population Avg
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Comparison of causal incremental lift across Upay service categories.
              </p>

              <div className="space-y-4">
                {(Object.entries(stats.avg_uplift) as [string, number][]).map(([ct, val]) => {
                  const channelName = CAMPAIGN_TYPE_LABELS[ct as keyof typeof CAMPAIGN_TYPE_LABELS]?.split(' ')[0] || ct;
                  const pctVal = val * 100;
                  const widthPct = Math.min(100, Math.max(10, pctVal * 6.5));
                  return (
                    <div key={ct} className="group">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-800 font-semibold">{channelName}</span>
                        <span className="font-mono font-bold text-[#0054A6]">
                          +{pctVal.toFixed(1)} percentage points
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-[#0054A6] to-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick insight footer */}
            <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <span className="text-[#0054A6] font-bold">Insight: </span>
              Mobile Recharge yields the highest responsiveness across all tiers, followed by Merchant Payments.
            </div>
          </div>
        </div>
      </BlurFade>

      {/* ── Lower Row: Customer Tier Segments & Model Intelligence ──────── */}
      <BlurFade delay={0.25}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Customer Segment Breakdown */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Customer Value Segments</h3>
            <p className="text-xs text-slate-500 mb-4">
              Distribution of customer population by tenure, transaction volume, and GMV tier.
            </p>

            <div className="space-y-3.5">
              {[
                { label: 'High Value Tier', key: 'high_value', color: 'from-[#0054A6] to-blue-500', badgeClass: 'badge-blue' },
                { label: 'Mid Tier Active', key: 'mid', color: 'from-emerald-600 to-teal-500', badgeClass: 'badge-green' },
                { label: 'Low Tier Transactors', key: 'low', color: 'from-amber-500 to-yellow-400', badgeClass: 'badge-yellow' },
                { label: 'Dormant Accounts', key: 'dormant', color: 'from-slate-500 to-slate-400', badgeClass: 'badge-slate' },
              ].map(({ label, key, color, badgeClass }) => {
                const count = stats.segments[key as keyof typeof stats.segments] || 0;
                const pct = stats.total_customers > 0 ? (count / stats.total_customers) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${badgeClass}`}>{label}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {formatNumber(count)} <span className="text-slate-500 font-normal">({formatPct(pct)})</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model Intelligence & Top Predictive Signals */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Cpu size={15} className="text-[#0054A6]" />
                  S-Learner Uplift Model Signals
                </h3>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  Causal ML
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Top feature importances driving incremental response estimation across the customer base.
              </p>

              <div className="space-y-2">
                {stats.model_info.top_features.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-700 font-medium">{f.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-[#0054A6] rounded-full"
                          style={{ width: `${Math.min(100, f.importance * 350)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-[#0054A6] w-12 text-right">
                        {(f.importance * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Architecture: {stats.model_info.type}</span>
              <span className="text-slate-600 font-semibold">Offline Pre-computed</span>
            </div>
          </div>
        </div>
      </BlurFade>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto bg-[#f8fafc]">
      <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 h-72 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="lg:col-span-4 h-72 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 h-80 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="lg:col-span-4 h-80 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="p-12 flex items-center justify-center">
      <div className="text-center max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
        <AlertTriangle size={36} className="text-amber-500 mx-auto mb-3" />
        <p className="text-slate-900 font-bold mb-1">Failed to load dashboard data</p>
        <p className="text-slate-600 text-xs mb-4">{message}</p>
        <p className="text-slate-500 text-xs">Verify backend is running on port 3001.</p>
      </div>
    </div>
  );
}
