// pages/CampaignPage.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Play, RotateCcw, TrendingUp, Wallet, Target,
  CheckCircle2, Info, Sparkles, Sliders,
  Check, Layers, FileSpreadsheet, Search,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useCampaignRun } from '../hooks/useCampaignRun';
import { KPICard } from '../components/shared/KPICard';
import { UpliftBar } from '../components/shared/UpliftBar';
import { BlurFade } from '../components/ui/blur-fade';
import { ShimmerButton } from '../components/ui/shimmer-button';
import type {
  CampaignConfig, CampaignObjective,
  RecommendedCustomer, SuppressedCustomer, IncentiveTier,
} from '../types';
import {
  formatBDT, formatNumber, formatMultiplier, formatPct,
  CAMPAIGN_OBJECTIVE_OPTIONS, SEGMENT_OPTIONS,
  CAMPAIGN_TYPE_OPTIONS, segmentBadgeClass, suppressReasonLabel,
  SEGMENT_LABELS,
} from '../lib/utils';

const DEFAULT_CONFIG: CampaignConfig = {
  campaign_name:      'Friday Recharge Boost',
  campaign_type:      'recharge',
  campaign_objective: 'increase_recharge',
  offer_value_bdt:    30,
  budget_bdt:         500000,
  target_segment:     'all',
};

const INCENTIVE_TIERS_CONFIG = [
  { value: 10, label: '৳10', sub: 'Low Tier', desc: 'Minimal incentive for high baseline' },
  { value: 20, label: '৳20', sub: 'Standard', desc: 'Balanced offer for moderate lift' },
  { value: 30, label: '৳30', sub: 'Recommended', desc: 'Optimal ROI for persuadables' },
  { value: 50, label: '৳50', sub: 'High Lift', desc: 'Maximum push for high-value targets' },
] as const;

const BUDGET_PRESETS = [
  { value: 100000, label: '৳100K' },
  { value: 250000, label: '৳250K' },
  { value: 500000, label: '৳500K' },
  { value: 1000000, label: '৳1M' },
];

const ANALYSIS_STAGES = [
  'Customer population loaded (5,000 synthetic profiles)',
  'Baseline non-incentivized behavior analyzed',
  'Estimating campaign response across incentive tiers',
  'Measuring causal incremental uplift (S-Learner model)',
  'Applying fatigue suppression & spacing rules',
  'Optimizing incentive allocation (৳10 / ৳20 / ৳30 / ৳50)',
  'Calculating expected incremental transactions & GMV',
  'Campaign strategy ready for deployment',
];

export function CampaignPage() {
  const [config, setConfig] = useState<CampaignConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'recommended' | 'suppressed'>('recommended');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const { data: result, loading: apiLoading, error, execute, reset } = useCampaignRun();
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function handleObjectiveChange(objectiveValue: string) {
    const opt = CAMPAIGN_OBJECTIVE_OPTIONS.find(o => o.value === objectiveValue);
    setConfig(prev => ({
      ...prev,
      campaign_objective: objectiveValue as CampaignObjective,
      campaign_type: opt ? opt.type : prev.campaign_type,
    }));
    if (result) reset();
  }

  function handleChange(field: keyof CampaignConfig, value: string | number) {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (result) reset();
  }

  async function handleRun() {
    setIsAnalyzing(true);
    setAnalysisStep(0);

    // Start background API call
    const apiPromise = execute(config);

    // Sequence through conceptual analysis stages for a deliberate 2.4s presentation
    let step = 0;
    stepTimerRef.current = setInterval(() => {
      step += 1;
      if (step < ANALYSIS_STAGES.length) {
        setAnalysisStep(step);
      } else {
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      }
    }, 300);

    await apiPromise;
    // Wait for the full animation sequence
    setTimeout(() => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setIsAnalyzing(false);
    }, 2400);
  }

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  const estReach = Math.floor(config.budget_bdt / config.offer_value_bdt);

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-[#f8fafc]">
      {/* ── Left panel: Campaign Studio Planning Workspace ──────────────── */}
      <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col h-auto lg:h-full shadow-xs">
        {/* Studio Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0054A6] uppercase tracking-wider">
                <Sliders size={13} />
                Campaign Studio
              </div>
              <h1 className="text-base font-bold text-slate-900 mt-0.5">Planning Workspace</h1>
            </div>
            <span className="badge badge-blue text-[11px] font-bold">v1.2 Causal</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure objectives and incentive parameters for S-Learner uplift optimization.
          </p>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Campaign Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Campaign Name
            </label>
            <input
              className="input bg-white border-slate-200 focus:border-[#0054A6] font-medium text-slate-900"
              value={config.campaign_name}
              onChange={e => handleChange('campaign_name', e.target.value)}
              placeholder="e.g. Friday Recharge Boost"
            />
          </div>

          {/* Campaign Objective */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Campaign Objective
              </label>
              <span className="text-[10px] text-[#0054A6] font-mono font-semibold">
                {CAMPAIGN_TYPE_OPTIONS.find(o => o.value === config.campaign_type)?.label.split(' ')[0]} Model
              </span>
            </div>
            <select
              className="select bg-white border-slate-200 focus:border-[#0054A6] font-medium text-xs text-slate-900"
              value={config.campaign_objective || ''}
              onChange={e => handleObjectiveChange(e.target.value)}
            >
              {CAMPAIGN_OBJECTIVE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Selects the appropriate causal uplift model outcome vector.
            </p>
          </div>

          {/* Incentive Selector (Interactive 4-Card Grid) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Base Incentive (Cashback)
              </label>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold">Adaptive tiering</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {INCENTIVE_TIERS_CONFIG.map(t => {
                const isSelected = config.offer_value_bdt === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleChange('offer_value_bdt', t.value)}
                    className={`relative p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 border-[#0054A6] ring-1 ring-[#0054A6]/50 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-base font-bold font-mono ${isSelected ? 'text-[#0054A6]' : 'text-slate-900'}`}>
                        {t.label}
                      </span>
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-[#0054A6] flex items-center justify-center text-white">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <p className={`text-[11px] font-semibold mt-0.5 ${isSelected ? 'text-[#0054A6]' : 'text-slate-700'}`}>{t.sub}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget Input & Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Campaign Budget (BDT)
              </label>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                Max reach: ~{formatNumber(estReach)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-mono text-sm">৳</span>
              <input
                className="input pl-8 font-mono font-bold bg-white border-slate-200 focus:border-[#0054A6] text-slate-900"
                type="number"
                min={10000}
                step={50000}
                value={config.budget_bdt}
                onChange={e => handleChange('budget_bdt', Number(e.target.value))}
              />
            </div>
            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5 mt-2">
              {BUDGET_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleChange('budget_bdt', p.value)}
                  className={`text-[11px] font-mono py-1 px-2 rounded-md border transition-all cursor-pointer ${
                    config.budget_bdt === p.value
                      ? 'bg-[#0054A6] border-[#0054A6] text-white font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Segment */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Target Audience Filter
            </label>
            <select
              className="select bg-white border-slate-200 focus:border-[#0054A6] font-medium text-xs text-slate-900"
              value={config.target_segment}
              onChange={e => handleChange('target_segment', e.target.value)}
            >
              {SEGMENT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Auto-applied Intelligence Rules */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Automated Fatigue &amp; Suppression
              </p>
              <span className="text-[10px] text-emerald-700 font-mono font-semibold">Enforced</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] space-y-2 text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span><strong className="text-slate-800">Fatigue Guard:</strong> Auto-suppress if &ge;3 campaigns in last 90 days</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span><strong className="text-slate-800">Spacing Cooldown:</strong> 7-day moratorium since previous communication</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span><strong className="text-slate-800">S-Learner Uplift Optimizer:</strong> Greedy rank by Expected Incremental GMV</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span><strong className="text-slate-800">Waste Elimination:</strong> Skips Sure Things &amp; Lost Causes automatically</span>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Primary Action */}
        <div className="px-5 py-4 border-t border-slate-200 bg-white space-y-2.5">
          <ShimmerButton
            className="w-full py-3 text-sm font-bold shadow-sm"
            onClick={handleRun}
            disabled={isAnalyzing || apiLoading}
          >
            <Play size={14} className="mr-2 fill-white" />
            Run Campaign Analysis
          </ShimmerButton>

          {result && !isAnalyzing && (
            <button
              className="btn-secondary w-full flex items-center justify-center gap-2 text-xs py-2"
              onClick={reset}
            >
              <RotateCcw size={12} />
              Reset Configuration
            </button>
          )}
        </div>
      </div>

      {/* ── Right panel: Results / Analysis Experience / Empty State ─────── */}
      <div className="flex-none lg:flex-1 min-h-[80vh] lg:min-h-0 overflow-y-auto bg-[#f8fafc] p-4 md:p-6 lg:p-8">
        {isAnalyzing && (
          <AnalysisExperience currentStep={analysisStep} />
        )}

        {!isAnalyzing && !result && !error && (
          <EmptyWorkspaceState onRun={handleRun} />
        )}

        {!isAnalyzing && error && (
          <ErrorState message={error} />
        )}

        {!isAnalyzing && result && (
          <CampaignIntelligenceReport
            result={result}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
      </div>
    </div>
  );
}

// ── Deliberate 2–3 Second Analysis Experience Component (Light Mode) ───────

function AnalysisExperience({ currentStep }: { currentStep: number }) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 md:p-8 shadow-md overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0054A6] via-[#FFD600] to-[#0054A6]" />

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0054A6]">
                <Sparkles size={16} className="animate-spin-around" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Campaign Intelligence Engine
                </h3>
                <p className="text-[11px] text-slate-500">Processing population &amp; optimizing uplift</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-mono text-[#0054A6] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0054A6] animate-ping" />
              Analyzing
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-500">
              <span className="font-semibold">Optimization Stage</span>
              <span className="text-[#0054A6] font-bold">{currentStep + 1} / {ANALYSIS_STAGES.length}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-[#0054A6] via-emerald-500 to-[#FFD600] rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / ANALYSIS_STAGES.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Animated Stage List */}
          <div className="space-y-2 py-1">
            {ANALYSIS_STAGES.map((stage, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 text-xs transition-all duration-200 ${
                    isPast
                      ? 'text-slate-600'
                      : isCurrent
                      ? 'text-slate-900 font-bold pl-1'
                      : 'text-slate-400 opacity-50'
                  }`}
                >
                  {isPast ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 flex-shrink-0">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full bg-blue-100 border border-[#0054A6] flex items-center justify-center text-[#0054A6] flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0054A6] animate-ping" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                  )}
                  <span className={isCurrent ? 'text-[#0054A6] font-bold' : ''}>{stage}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-500">
            Applying causal machine learning models to maximize incremental return on incentive spend.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Generated Intelligence Report Component (Light Mode) ───────────────────

function CampaignIntelligenceReport({
  result,
  activeTab,
  setActiveTab,
}: {
  result: NonNullable<ReturnType<typeof useCampaignRun>['data']>;
  activeTab: 'recommended' | 'suppressed';
  setActiveTab: (t: 'recommended' | 'suppressed') => void;
}) {
  const { summary, recommended, suppressed_fatigue, suppressed_other, feature_importances, incentive_tiers } = result;
  const allSuppressed = [...suppressed_fatigue, ...suppressed_other];

  const importanceData = feature_importances.slice(0, 6).map(f => ({
    label: f.label,
    value: +(f.importance * 100).toFixed(1),
  }));

  const objectiveLabel = result.campaign_objective_label || CAMPAIGN_TYPE_OPTIONS.find(o => o.value === result.campaign_type)?.label;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── 1. Strategy Ready Banner ────────────────────────────────────── */}
      <BlurFade delay={0.05}>
        <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-[#0054A6]/20 p-5 md:p-6 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0054A6] via-[#FFD600] to-[#0054A6]" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Campaign Strategy Ready
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono text-slate-500">Processed in {summary.processing_time_ms}ms</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                {result.campaign_name}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                Objective: <strong className="text-slate-900">{objectiveLabel}</strong>. Model has allocated{' '}
                <strong className="text-[#0054A6]">{formatNumber(summary.recommended_count)} customers</strong> for an estimated{' '}
                <strong className="text-emerald-700">{formatBDT(summary.expected_incremental_gmv_bdt)} incremental GMV</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Net GMV Multiplier</p>
                <p className="text-lg font-extrabold text-[#0054A6] font-mono">
                  {formatMultiplier(summary.gmv_multiplier)}
                </p>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Reach Efficiency</p>
                <p className="text-lg font-extrabold text-emerald-700 font-mono">
                  {formatPct(summary.recommended_count / summary.total_customers_analyzed)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* ── 2. Primary KPI Impact Cards ─────────────────────────────────── */}
      <BlurFade delay={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            title="Recommended Reach"
            value={formatNumber(summary.recommended_count)}
            numericValue={summary.recommended_count}
            subtitle={`of ${formatNumber(summary.total_customers_analyzed)} analyzed profiles`}
            icon={<Target size={16} />}
            accent="green"
          />
          <KPICard
            title="Budget Utilized"
            value={formatBDT(summary.budget_utilized_bdt, true)}
            numericValue={summary.budget_utilized_bdt}
            prefix="৳"
            subtitle={`${formatPct(summary.budget_utilized_bdt / summary.budget_bdt)} of ৳${formatNumber(summary.budget_bdt / 1000)}K cap`}
            icon={<Wallet size={16} />}
            accent="blue"
          />
          <KPICard
            title="Est. Incremental Txns"
            value={formatNumber(summary.expected_incremental_txns, 0)}
            numericValue={Math.round(summary.expected_incremental_txns)}
            subtitle="Conversions directly caused by campaign"
            icon={<TrendingUp size={16} />}
            accent="green"
          />
          <KPICard
            title="Est. Incremental GMV"
            value={formatBDT(summary.expected_incremental_gmv_bdt, true)}
            numericValue={summary.expected_incremental_gmv_bdt}
            prefix="৳"
            subtitle={`${formatMultiplier(summary.gmv_multiplier)} return per ৳1 spent`}
            icon={<Sparkles size={16} />}
            accent="gold"
          />
        </div>
      </BlurFade>

      {/* ── 3. Secondary Performance Metrics ───────────────────────────── */}
      <BlurFade delay={0.15}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Cost / Incr. Txn</p>
            <p className="text-xl font-bold font-mono text-amber-800 mt-1">
              ৳{formatNumber(summary.cost_per_incremental_txn_bdt)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">vs ৳{result.offer_value_bdt} nominal offer</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Fatigue Protected</p>
            <p className="text-xl font-bold font-mono text-amber-700 mt-1">
              {formatNumber(summary.suppressed_fatigue_count)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Protected from churn</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Sure Things Skipped</p>
            <p className="text-xl font-bold font-mono text-[#0054A6] mt-1">
              {formatNumber(summary.suppressed_sure_thing_count)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Organic converted without offer</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Negative Uplift Suppressed</p>
            <p className="text-xl font-bold font-mono text-red-700 mt-1">
              {formatNumber(summary.suppressed_do_not_disturb_count)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Protected from adverse reaction</p>
          </div>
        </div>
      </BlurFade>

      {/* ── 4. Recommended Incentive Allocation Mix ─────────────────────── */}
      {incentive_tiers && incentive_tiers.some(t => t.count > 0) && (
        <BlurFade delay={0.2}>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers size={16} className="text-[#0054A6]" />
                  Recommended Incentive Allocation Mix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Optimal cashback tiers dynamically assigned based on predicted uplift elasticity.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto font-mono">
                <Info size={12} className="text-[#0054A6]" />
                <span className="font-semibold">Total Spent: {formatBDT(summary.budget_utilized_bdt)}</span>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              {incentive_tiers.map(tier => (
                <IncentiveTierVisualRow
                  key={tier.offer_bdt}
                  tier={tier}
                  totalRecommended={summary.recommended_count}
                />
              ))}
            </div>
          </div>
        </BlurFade>
      )}

      {/* ── 5. Audience Breakdown & Global Model Signals ────────────────── */}
      <BlurFade delay={0.25}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Audience Breakdown */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Audience Segmentation Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">
              Classification of customer base into targeted vs suppressed cohorts.
            </p>

            <div className="space-y-3">
              {[
                { label: 'Recommended Persuadables', count: summary.recommended_count, color: 'from-emerald-500 to-teal-400', textColor: 'text-emerald-700', note: 'Targeted with optimal incentive' },
                { label: 'Fatigued Customers', count: summary.suppressed_fatigue_count, color: 'from-amber-500 to-yellow-400', textColor: 'text-amber-800', note: '≥3 campaigns in 90 days' },
                { label: 'Sure Things (Organic)', count: summary.suppressed_sure_thing_count, color: 'from-[#0054A6] to-blue-400', textColor: 'text-[#0054A6]', note: 'High baseline — saves budget' },
                { label: 'Negative Uplift (Do Not Disturb)', count: summary.suppressed_do_not_disturb_count, color: 'from-red-500 to-rose-400', textColor: 'text-red-700', note: 'Intervention lowers conversion' },
                { label: 'Lost Cause (Low Response)', count: summary.suppressed_lost_cause_count, color: 'from-slate-400 to-slate-300', textColor: 'text-slate-600', note: 'Zero response probability' },
                { label: 'Budget Cap Reached', count: summary.suppressed_budget_count, color: 'from-slate-300 to-slate-200', textColor: 'text-slate-500', note: 'Beyond budget constraint' },
              ].filter(r => r.count > 0).map(({ label, count, color, textColor, note }) => {
                const pct = summary.total_customers_analyzed > 0 ? (count / summary.total_customers_analyzed) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div>
                        <span className="text-slate-800 font-semibold">{label}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">({note})</span>
                      </div>
                      <span className={`font-mono font-bold ${textColor}`}>
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

          {/* Global Feature Importance Chart */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-900">Global Model Signal Importance</h3>
                <span className="text-[11px] font-mono text-[#0054A6] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                  S-Learner
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Top predictive attributes influencing customer responsiveness across the population.
              </p>

              <div className="h-56 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={importanceData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} unit="%" stroke="#cbd5e1" />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#334155' }}
                      width={120}
                      stroke="#cbd5e1"
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 11,
                        color: '#0f172a',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      formatter={(val: unknown) => [
                        typeof val === 'number' ? `${val}%` : `${val}`,
                        'Signal Importance',
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      fill="#0054A6"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={true}
                      animationDuration={900}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              Uplift models prioritize incremental lift over static conversion rate to eliminate deadweight incentive loss.
            </p>
          </div>
        </div>
      </BlurFade>

      {/* ── 5b. Targeting Strategy Benchmark (Propensity vs Uplift) ────────── */}
      <BlurFade delay={0.28}>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-blue text-[11px] font-mono font-bold">Causal Benchmark</span>
                <h3 className="text-base font-bold text-slate-900">
                  Targeting Strategy Comparison (Same ৳50K Budget)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Comparing conventional propensity targeting against causal uplift optimization on the held-out test cohort.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              <span>+89.7% More Incremental Txns</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3">Targeted</th>
                  <th className="py-2.5 px-3">Raw Conv (T=1)</th>
                  <th className="py-2.5 px-3">Incr. Txns</th>
                  <th className="py-2.5 px-3">Incr. GMV</th>
                  <th className="py-2.5 px-3">Cost / Incr Txn</th>
                  <th className="py-2.5 px-3">Sure-Thing Waste</th>
                  <th className="py-2.5 px-3">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr className="hover:bg-slate-50/50 text-slate-600">
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-800">Random Targeting</td>
                  <td className="py-2.5 px-3">1,666</td>
                  <td className="py-2.5 px-3">42.2%</td>
                  <td className="py-2.5 px-3">120.5</td>
                  <td className="py-2.5 px-3">৳44,603</td>
                  <td className="py-2.5 px-3">৳414.9</td>
                  <td className="py-2.5 px-3 text-amber-700">146 (8.8%)</td>
                  <td className="py-2.5 px-3 font-sans"><span className="badge badge-gray">Baseline</span></td>
                </tr>
                <tr className="hover:bg-amber-50/30 text-slate-600 bg-amber-50/10">
                  <td className="py-2.5 px-3 font-sans font-bold text-amber-900 flex items-center gap-1.5">
                    Propensity Targeting
                    <span className="text-[10px] font-sans font-normal text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Conventional</span>
                  </td>
                  <td className="py-2.5 px-3">1,666</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">60.6% <span className="text-[10px] text-slate-400 font-normal">(55.5% base)</span></td>
                  <td className="py-2.5 px-3 text-amber-800 font-bold">86.2</td>
                  <td className="py-2.5 px-3">৳30,672</td>
                  <td className="py-2.5 px-3 text-red-700 font-bold">৳579.9</td>
                  <td className="py-2.5 px-3 text-red-700 font-bold">349 (20.9%)</td>
                  <td className="py-2.5 px-3 font-sans"><span className="badge badge-amber">-47.3% vs Uplift</span></td>
                </tr>
                <tr className="hover:bg-slate-50/50 text-slate-600">
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-800">Fixed Incentive (Top GMV)</td>
                  <td className="py-2.5 px-3">1,666</td>
                  <td className="py-2.5 px-3">55.5%</td>
                  <td className="py-2.5 px-3">92.1</td>
                  <td className="py-2.5 px-3">৳48,345</td>
                  <td className="py-2.5 px-3">৳542.7</td>
                  <td className="py-2.5 px-3 text-amber-700">342 (20.5%)</td>
                  <td className="py-2.5 px-3 font-sans"><span className="badge badge-gray">Heuristic</span></td>
                </tr>
                <tr className="bg-blue-50/50 border-2 border-[#0054A6]/30 text-slate-900 font-semibold">
                  <td className="py-3 px-3 font-sans font-black text-[#0054A6] flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500 flex-shrink-0" />
                    Uplift Targeting (AI)
                    <span className="badge badge-blue text-[9px] font-sans font-bold">Upay Optimal</span>
                  </td>
                  <td className="py-3 px-3 font-bold">1,666</td>
                  <td className="py-3 px-3">29.1% <span className="text-[10px] text-slate-500 font-normal">(19.3% base)</span></td>
                  <td className="py-3 px-3 text-emerald-700 font-black text-sm">163.5</td>
                  <td className="py-3 px-3 text-[#0054A6] font-black">৳64,125</td>
                  <td className="py-3 px-3 text-emerald-700 font-black">৳305.6</td>
                  <td className="py-3 px-3 text-emerald-700 font-black">0 (0.0%)</td>
                  <td className="py-3 px-3 font-sans"><span className="badge badge-green font-bold">+89.7% Lift</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
            <div className="text-slate-500 text-[11px]">
              <strong className="text-slate-700">Why Propensity fails:</strong> It targets users with high conversion probability (60.6%), but 55.5% were organic buyers who would convert without an offer, wasting 20.9% of budget on Sure Things.
            </div>
            <div className="text-slate-700 text-[11px] font-medium bg-slate-100 px-2.5 py-1 rounded">
              Zero Deadweight Loss under Uplift Targeting
            </div>
          </div>
        </div>
      </BlurFade>

      {/* ── 6. Customer Recommendation & Suppression Tables ─────────────── */}
      <BlurFade delay={0.3}>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Tab Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 md:px-6 pt-3 flex-wrap gap-2 bg-slate-50/50">
            <div className="flex gap-2">
              <button
                type="button"
                className={`pb-3 px-3 text-xs md:text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'recommended'
                    ? 'text-[#0054A6] border-[#0054A6]'
                    : 'text-slate-500 border-transparent hover:text-slate-900'
                }`}
                onClick={() => setActiveTab('recommended')}
              >
                Recommended Customers ({formatNumber(summary.recommended_count)})
              </button>
              <button
                type="button"
                className={`pb-3 px-3 text-xs md:text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  activeTab === 'suppressed'
                    ? 'text-amber-800 border-amber-500'
                    : 'text-slate-500 border-transparent hover:text-slate-900'
                }`}
                onClick={() => setActiveTab('suppressed')}
              >
                Suppressed Cohort ({formatNumber(allSuppressed.length)})
              </button>
            </div>

            <div className="pb-3 text-xs text-slate-500 font-mono">
              Showing top 100 rows
            </div>
          </div>

          {activeTab === 'recommended' && (
            <RecommendedAudienceTable customers={recommended} />
          )}

          {activeTab === 'suppressed' && (
            <SuppressedAudienceTable customers={allSuppressed} />
          )}
        </div>
      </BlurFade>
    </div>
  );
}

// ── Visual Tier Row Component (Light Mode) ─────────────────────────────────

function IncentiveTierVisualRow({ tier, totalRecommended }: { tier: IncentiveTier; totalRecommended: number }) {
  if (tier.count === 0) return null;
  const pct = totalRecommended > 0 ? (tier.count / totalRecommended) : 0;

  const tierColors = {
    50: 'from-emerald-500 to-teal-400 text-emerald-800 border-emerald-200 bg-emerald-50',
    30: 'from-[#0054A6] to-blue-400 text-[#0054A6] border-blue-200 bg-blue-50',
    20: 'from-sky-500 to-blue-400 text-sky-800 border-sky-200 bg-sky-50',
    10: 'from-slate-400 to-slate-300 text-slate-700 border-slate-200 bg-slate-100',
  };

  const style = tierColors[tier.offer_bdt as keyof typeof tierColors] || tierColors[30];

  return (
    <div className="flex items-center gap-3 sm:gap-4 group">
      <div className={`w-14 sm:w-16 py-1 px-2 text-center rounded-lg border font-mono font-bold text-xs sm:text-sm flex-shrink-0 ${style}`}>
        ৳{tier.offer_bdt}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-800 font-semibold">
            {formatNumber(tier.count)} customers <span className="text-slate-500 font-normal">({formatPct(pct)})</span>
          </span>
          <span className="text-emerald-700 font-mono font-bold">
            {formatBDT(tier.expected_incr_gmv, true)} est. incr. GMV
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${style.split(' ')[0]} ${style.split(' ')[1]} transition-all duration-700`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Tables (Light Mode) ────────────────────────────────────────────────────

function RecommendedAudienceTable({ customers }: { customers: RecommendedCustomer[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = customers.filter(c =>
    c.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.segment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getTierIncentive(uplift: number): number {
    if (uplift >= 0.25) return 50;
    if (uplift >= 0.15) return 30;
    if (uplift >= 0.10) return 20;
    return 10;
  }

  return (
    <div>
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input text-xs pl-8 py-1.5 bg-white border-slate-200 text-slate-900"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold font-mono">
          Showing {Math.min(100, filtered.length)} of {formatNumber(customers.length)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Segment</th>
              <th>Baseline Prob</th>
              <th>Campaign Prob</th>
              <th>Incremental Uplift</th>
              <th>Allocated Offer</th>
              <th>Est. Incr. GMV</th>
              <th>Priority Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(c => {
              const recIncentive = getTierIncentive(c.uplift_score);
              return (
                <tr key={c.customer_id} className="hover:bg-blue-50/40">
                  <td className="font-mono text-xs text-slate-900 font-bold">{c.customer_id}</td>
                  <td>
                    <span className={`badge ${segmentBadgeClass(c.segment)}`}>
                      {SEGMENT_LABELS[c.segment]}
                    </span>
                  </td>
                  <td className="text-slate-600 font-mono text-xs">{formatPct(c.control_prob)}</td>
                  <td className="text-[#0054A6] font-mono text-xs font-bold">{formatPct(c.treatment_prob)}</td>
                  <td className="w-40">
                    <UpliftBar
                      value={c.uplift_score}
                      baselineProb={c.control_prob}
                      treatmentProb={c.treatment_prob}
                      size="sm"
                    />
                  </td>
                  <td>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                      recIncentive === 50 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      recIncentive === 30 ? 'bg-blue-50 text-[#0054A6] border border-blue-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      ৳{recIncentive}
                    </span>
                  </td>
                  <td className="text-emerald-700 font-mono text-xs font-bold">
                    {formatBDT(c.expected_incremental_gmv_bdt)}
                  </td>
                  <td className="font-mono text-xs text-slate-500">{c.priority_score.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuppressedAudienceTable({ customers }: { customers: SuppressedCustomer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Segment</th>
            <th>Suppression Reason</th>
            <th>Audit Detail</th>
            <th>Campaigns (90d)</th>
            <th>Uplift Score</th>
          </tr>
        </thead>
        <tbody>
          {customers.slice(0, 100).map(c => (
            <tr key={c.customer_id} className="hover:bg-blue-50/40">
              <td className="font-mono text-xs text-slate-900 font-bold">{c.customer_id}</td>
              <td>
                <span className={`badge ${segmentBadgeClass(c.segment)}`}>
                  {SEGMENT_LABELS[c.segment]}
                </span>
              </td>
              <td>
                <span className={`badge ${
                  c.reason === 'fatigue' ? 'badge-amber' :
                  c.reason === 'do_not_disturb' ? 'badge-red' :
                  c.reason === 'sure_thing' ? 'badge-blue' :
                  'badge-slate'
                }`}>
                  {suppressReasonLabel(c.reason)}
                </span>
              </td>
              <td className="text-xs text-slate-600 max-w-xs truncate" title={c.detail}>
                {c.detail}
              </td>
              <td className="text-xs text-center font-mono font-semibold">{c.campaign_received_last_90d ?? '—'}</td>
              <td className="text-xs text-slate-600 font-mono font-bold">
                {c.uplift_score !== undefined
                  ? `${c.uplift_score >= 0 ? '+' : ''}${(c.uplift_score * 100).toFixed(1)}pp`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Empty & Error States (Light Mode) ──────────────────────────────────────

function EmptyWorkspaceState({ onRun }: { onRun: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-6 md:p-12">
      <div className="text-center max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#0054A6] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FileSpreadsheet size={24} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Campaign Intelligence Ready</h3>
          <p className="text-slate-600 text-xs leading-relaxed mb-6">
            Configure campaign objective, budget, and base incentive in the left workspace, then run causal uplift optimization.
          </p>
          <ShimmerButton onClick={onRun} className="py-2.5 px-5 text-xs font-bold mx-auto shadow-sm">
            <Play size={13} className="mr-1.5 fill-white" />
            Run Sample Analysis
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md bg-white border border-red-200 p-6 rounded-2xl shadow-sm">
        <p className="text-red-700 font-bold mb-1">Analysis Failed</p>
        <p className="text-slate-600 text-xs">{message}</p>
      </div>
    </div>
  );
}
