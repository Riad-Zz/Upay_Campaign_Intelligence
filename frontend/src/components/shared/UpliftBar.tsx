// components/shared/UpliftBar.tsx
import { cn } from '../../lib/utils';

interface UpliftBarProps {
  value:      number;  // -0.2 to 0.5
  showLabel?: boolean;
  size?:      'sm' | 'md';
  className?: string;
}

export function UpliftBar({ value, showLabel = true, size = 'sm', className }: UpliftBarProps) {
  const isNeg   = value < 0;
  const pct     = Math.min(Math.abs(value) / 0.5, 1) * 100;   // normalize to 0.5 max
  const label   = `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('uplift-bar-track flex-1', size === 'md' ? 'h-2' : 'h-1.5')}>
        <div
          className={isNeg ? 'uplift-bar-fill-negative' : 'uplift-bar-fill-positive'}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn(
          'text-xs font-mono font-medium w-14 text-right tabular-nums',
          value >= 0.10 ? 'text-emerald-400'
          : value >= 0.03 ? 'text-upay-400'
          : value >= 0    ? 'text-slate-400'
          : 'text-red-400'
        )}>
          {label}
        </span>
      )}
    </div>
  );
}
