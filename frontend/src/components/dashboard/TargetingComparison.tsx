// components/dashboard/TargetingComparison.tsx
import { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { fetchComparison } from '../../services/api';
import type { PolicyComparisonData } from '../../types';
import { formatBDT, formatNumber } from '../../lib/utils';
import { BlurFade } from '../ui/blur-fade';

// Fallback baseline in case API is temporarily unavailable
const DEFAULT_COMPARISON: PolicyComparisonData = {
  scenario: {
    campaign: 'Recharge',
    budget: 50000,
    incentive: 30,
    target_count: 1666,
    eligible_customers: 3893,
    random_seed: 42,
  },
  strategies: {
    random: {
      targeted: 1666,
      avg_uplift: 0.0723,
      incremental_transactions: 120.5,
      incremental_gmv: 44603.2,
      sure_things: 146,
      sure_thing_percentage: 8.8,
      wasteful_targets: 168,
      cost_per_incremental_txn: 414.9,
      conversion_prob_treatment: 42.2,
      baseline_prob_control: 35.0,
    },
    propensity: {
      targeted: 1666,
      avg_uplift: 0.0517,
      incremental_transactions: 86.2,
      incremental_gmv: 30671.6,
      sure_things: 349,
      sure_thing_percentage: 20.9,
      wasteful_targets: 391,
      cost_per_incremental_txn: 579.9,
      conversion_prob_treatment: 60.6,
      baseline_prob_control: 55.5,
    },
    uplift: {
      targeted: 1666,
      avg_uplift: 0.0982,
      incremental_transactions: 163.5,
      incremental_gmv: 64124.5,
      sure_things: 0,
      sure_thing_percentage: 0.0,
      wasteful_targets: 0,
      cost_per_incremental_txn: 305.6,
      conversion_prob_treatment: 29.1,
      baseline_prob_control: 19.3,
    },
  },
  comparison: {
    uplift_vs_propensity_txn_lift_pct: 89.7,
    uplift_vs_propensity_gmv_lift_pct: 109.1,
    sure_thing_spend_saved_bdt: 10470.0,
    cost_efficiency_improvement_pct: 47.3,
  },
};

export function TargetingComparison() {
  const [data, setData] = useState<PolicyComparisonData>(DEFAULT_COMPARISON);

  useEffect(() => {
    fetchComparison()
      .then((res) => {
        if (res && res.strategies) {
          setData(res);
        }
      })
      .catch((err) => {
        console.warn('[TargetingComparison] Using cached default comparison:', err);
      });
  }, []);

  const { scenario, strategies, comparison } = data;
  const { random, propensity, uplift } = strategies;

  // Max transactions for bar scaling
  const maxTxns = Math.max(
    uplift.incremental_transactions,
    propensity.incremental_transactions,
    random.incremental_transactions,
    1
  );

  return (
    <BlurFade delay={0.18}>
      <section className="rounded-2xl bg-white border border-slate-200 p-5 md:p-7 shadow-xs space-y-6">
        {/* ── Section Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0054A6]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#0054A6]">
                Controlled Policy Benchmark
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium border border-slate-200">
                Budget: {formatBDT(scenario.budget)} · Incentive: {formatBDT(scenario.incentive)}/cust
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 mt-1">
              Targeting Strategy Comparison
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Same budget. Same audience eligibility. Different targeting logic.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span>Eligible Pool: <strong>{formatNumber(scenario.eligible_customers || 3893)}</strong></span>
            <span>·</span>
            <span>Target Count: <strong>{formatNumber(scenario.target_count || 1666)}</strong></span>
          </div>
        </div>

        {/* ── Three Comparison Cards ────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. RANDOM */}
          <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black tracking-wider uppercase text-slate-600">
                  RANDOM
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-bold">
                  Baseline
                </span>
              </div>
              <p className="text-[11px] text-slate-500 min-h-[32px] mb-4">
                Uniform random selection across eligible, fatigue-safe customers.
              </p>

              <div className="space-y-3 pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Targeted Customers</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {formatNumber(random.targeted)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Incremental Txns</span>
                  <span className="text-sm font-mono font-black text-slate-800">
                    +{random.incremental_transactions.toFixed(1)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Model-Est. Incr. GMV</span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {formatBDT(random.incremental_gmv)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Sure-Thing Targets</span>
                  <span className="text-xs font-mono font-semibold text-slate-700">
                    {random.sure_things} ({random.sure_thing_percentage.toFixed(1)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200">
                  <span className="text-[11px] text-slate-500">Cost / Incr. Txn</span>
                  <span className="text-xs font-mono text-slate-600">
                    {formatBDT(random.cost_per_incremental_txn || 414.9)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
              Mean uplift: +{((random.avg_uplift || 0) * 100).toFixed(1)}pp
            </div>
          </div>

          {/* 2. PROPENSITY (Conventional Marketing) */}
          <div className="rounded-xl bg-amber-50/40 border border-amber-200 p-5 flex flex-col justify-between hover:border-amber-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black tracking-wider uppercase text-amber-900">
                  PROPENSITY
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  Conventional
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80 min-h-[32px] mb-4">
                Prioritizes customers most likely to convert: <em>"Who will transact?"</em>
              </p>

              <div className="space-y-3 pt-2 border-t border-amber-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700">Targeted Customers</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {formatNumber(propensity.targeted)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-medium">Incremental Txns</span>
                  <span className="text-sm font-mono font-black text-amber-900">
                    +{propensity.incremental_transactions.toFixed(1)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700">Model-Est. Incr. GMV</span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {formatBDT(propensity.incremental_gmv)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-700 font-medium flex items-center gap-1">
                    <AlertTriangle size={12} className="text-red-500" />
                    Sure-Thing Targets
                  </span>
                  <span className="text-xs font-mono font-bold text-red-700">
                    {propensity.sure_things} ({propensity.sure_thing_percentage.toFixed(1)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-dashed border-amber-200">
                  <span className="text-[11px] text-slate-500">Cost / Incr. Txn</span>
                  <span className="text-xs font-mono text-slate-700">
                    {formatBDT(propensity.cost_per_incremental_txn || 579.9)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-200/80 text-[11px] text-amber-900 font-medium">
              High baseline ({propensity.baseline_prob_control || 55.5}%) = subsidizes natural behavior
            </div>
          </div>

          {/* 3. UPLIFT (Recommended) */}
          <div className="relative rounded-xl bg-blue-50/70 border-2 border-[#0054A6] p-5 flex flex-col justify-between shadow-xs">
            {/* Top accent badge */}
            <div className="absolute -top-3 right-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0054A6] text-white text-[11px] font-bold shadow-xs">
                <Sparkles size={11} className="text-[#FFD600]" />
                Recommended
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black tracking-wider uppercase text-[#0054A6]">
                  UPLIFT
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-[#0054A6] font-bold">
                  Causal AI
                </span>
              </div>
              <p className="text-[11px] text-slate-700 min-h-[32px] mb-4">
                Prioritizes customers whose behavior changes: <em>"Who changes because of incentive?"</em>
              </p>

              <div className="space-y-3 pt-2 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700">Targeted Customers</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {formatNumber(uplift.targeted)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#0054A6] font-bold">Incremental Txns</span>
                  <span className="text-base font-mono font-black text-[#0054A6]">
                    +{uplift.incremental_transactions.toFixed(1)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700">Model-Est. Incr. GMV</span>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {formatBDT(uplift.incremental_gmv)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Sure-Thing Targets
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {uplift.sure_things} ({uplift.sure_thing_percentage.toFixed(1)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-dashed border-blue-200">
                  <span className="text-[11px] text-slate-500">Cost / Incr. Txn</span>
                  <span className="text-xs font-mono font-bold text-[#0054A6]">
                    {formatBDT(uplift.cost_per_incremental_txn || 305.6)}
                  </span>
                </div>
              </div>
            </div>

            {/* Win Callout Banner */}
            <div className="mt-4 pt-3 border-t border-blue-200">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-900 block">
                  +{comparison.uplift_vs_propensity_txn_lift_pct || 89.7}% expected incremental txns
                </span>
                <span className="text-[11px] text-emerald-700">
                  vs propensity (+{comparison.uplift_vs_propensity_gmv_lift_pct || 109.1}% GMV)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Visual Horizontal Comparison Bars ────────────────────── */}
        <div className="p-4 md:p-5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Expected Incremental Transactions Comparison
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Sum of predicted uplift across {formatNumber(scenario.target_count || 1666)} targets
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Random bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-600 w-24">Random</span>
                <span className="font-mono font-bold text-slate-700">
                  +{random.incremental_transactions.toFixed(1)} txns
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all duration-700"
                  style={{ width: `${(random.incremental_transactions / maxTxns) * 100}%` }}
                />
              </div>
            </div>

            {/* Propensity bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-amber-900 w-24">Propensity</span>
                <span className="font-mono font-bold text-amber-900">
                  +{propensity.incremental_transactions.toFixed(1)} txns
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${(propensity.incremental_transactions / maxTxns) * 100}%` }}
                />
              </div>
            </div>

            {/* Uplift bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[#0054A6] w-24 flex items-center gap-1">
                  Uplift
                  <span className="text-[10px] text-emerald-600 font-black">★ WINNER</span>
                </span>
                <span className="font-mono font-black text-[#0054A6]">
                  +{uplift.incremental_transactions.toFixed(1)} txns
                </span>
              </div>
              <div className="h-3.5 w-full bg-slate-200 rounded-full overflow-hidden p-0.5 border border-blue-200">
                <div
                  className="h-full bg-gradient-to-r from-[#0054A6] to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${(uplift.incremental_transactions / maxTxns) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Short Insight Box ─────────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#0054A6]">
            <Info size={14} className="text-[#0054A6]" />
            Why uplift targeting?
          </div>
          <p className="leading-relaxed">
            <strong>Propensity targeting</strong> prioritizes customers who are already likely to convert ({propensity.baseline_prob_control || 55.5}% organic baseline), wasting <strong>{formatBDT(comparison.sure_thing_spend_saved_bdt || 10470)}</strong> subsidizing "Sure Things".
          </p>
          <p className="leading-relaxed">
            <strong>Uplift targeting</strong> prioritizes customers whose behavior is <em>most likely to change</em> because of the campaign, eliminating incentive waste and capturing <strong>+{comparison.uplift_vs_propensity_txn_lift_pct || 89.7}% more incremental transactions</strong> under the exact same ৳50,000 budget.
          </p>
        </div>
      </section>
    </BlurFade>
  );
}
