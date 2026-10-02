// components/shared/KPICard.tsx
import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface KPICardProps {
  title:    string;
  value:    string | number;
  subtitle?: string;
  icon?:    ReactNode;
  trend?:   { value: string; positive: boolean };
  accent?:  'blue' | 'green' | 'amber' | 'red' | 'purple';
  className?: string;
  animate?:  boolean;
}

const ACCENT_COLORS = {
  blue:   'text-upay-400   bg-upay-900/30   border-upay-800/40',
  green:  'text-emerald-400 bg-emerald-900/30 border-emerald-800/40',
  amber:  'text-amber-400   bg-amber-900/30   border-amber-800/40',
  red:    'text-red-400     bg-red-900/30     border-red-800/40',
  purple: 'text-purple-400  bg-purple-900/30  border-purple-800/40',
};

export function KPICard({
  title, value, subtitle, icon, trend, accent = 'blue', className, animate = false,
}: KPICardProps) {
  return (
    <div className={cn(
      'kpi-card',
      animate && 'animate-slide-up',
      className
    )}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        {icon && (
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border', ACCENT_COLORS[accent])}>
            {icon}
          </div>
        )}
      </div>
      <p className={cn(
        'text-2xl font-bold tracking-tight',
        ACCENT_COLORS[accent].split(' ')[0]   // just the text color
      )}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      {trend && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', trend.positive ? 'text-emerald-400' : 'text-red-400')}>
          <span>{trend.positive ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
