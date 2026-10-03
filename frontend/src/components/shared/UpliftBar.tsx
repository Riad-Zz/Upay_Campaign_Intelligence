// components/shared/UpliftBar.tsx
import { cn } from '../../lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface UpliftBarProps {
  value: number; // e.g. -0.2 to 0.5
  baselineProb?: number; // e.g. 0.54
  treatmentProb?: number; // e.g. 0.78
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showComparison?: boolean;
}

export function UpliftBar({
  value,
  baselineProb,
  treatmentProb,
  showLabel = true,
  size = 'sm',
  className,
  showComparison = false,
}: UpliftBarProps) {
  // Normalize percentage for bar width: 0 to 0.4 (40pp) maps to 0-100%
  const pct = Math.min(Math.max((Math.abs(value) / 0.35) * 100, 3), 100);
  const label = `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`;

  const getTheme = () => {
    if (value >= 0.20) {
      return {
        fill: 'bg-emerald-500',
        badge: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        text: 'text-emerald-700',
        icon: <ArrowUpRight size={11} className="text-emerald-700" />,
      };
    }
    if (value >= 0.10) {
      return {
        fill: 'bg-[#0054A6]',
        badge: 'text-[#0054A6] bg-blue-50 border-blue-200 font-semibold',
        text: 'text-[#0054A6]',
        icon: <ArrowUpRight size={11} className="text-[#0054A6]" />,
      };
    }
    if (value >= 0.03) {
      return {
        fill: 'bg-amber-500',
        badge: 'text-amber-800 bg-amber-50 border-amber-200',
        text: 'text-amber-700',
        icon: <ArrowUpRight size={11} className="text-amber-700" />,
      };
    }
    if (value >= 0) {
      return {
        fill: 'bg-slate-400',
        badge: 'text-slate-600 bg-slate-100 border-slate-200',
        text: 'text-slate-600',
        icon: <Minus size={11} className="text-slate-500" />,
      };
    }
    return {
      fill: 'bg-red-500',
      badge: 'text-red-800 bg-red-50 border-red-200',
      text: 'text-red-700',
      icon: <ArrowDownRight size={11} className="text-red-700" />,
    };
  };

  const theme = getTheme();

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showComparison && baselineProb !== undefined && treatmentProb !== undefined && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-0.5">
          <span>{(baselineProb * 100).toFixed(0)}% base</span>
          <span className="text-slate-400">→</span>
          <span className="text-slate-900 font-bold">{(treatmentProb * 100).toFixed(0)}% campaign</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div
          className={cn(
            'uplift-bar-track flex-1 bg-slate-100 border border-slate-200 rounded-full overflow-hidden',
            size === 'lg' ? 'h-3' : size === 'md' ? 'h-2' : 'h-1.5'
          )}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              theme.fill
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {showLabel && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-xs font-mono font-bold tabular-nums',
              theme.badge
            )}
          >
            {theme.icon}
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
