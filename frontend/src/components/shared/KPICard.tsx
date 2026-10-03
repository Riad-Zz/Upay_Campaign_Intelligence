// components/shared/KPICard.tsx
import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { NumberTicker } from '../ui/number-ticker';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  decimalPlaces?: number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean };
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gold';
  className?: string;
  animate?: boolean;
  isHero?: boolean;
}

const ACCENT_STYLES = {
  blue: {
    iconBg: 'bg-blue-50 border-blue-100 text-[#0054A6]',
    text: 'text-[#0054A6]',
    border: 'hover:border-blue-300',
  },
  green: {
    iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    text: 'text-emerald-700',
    border: 'hover:border-emerald-300',
  },
  amber: {
    iconBg: 'bg-amber-50 border-amber-100 text-amber-800',
    text: 'text-amber-800',
    border: 'hover:border-amber-300',
  },
  red: {
    iconBg: 'bg-red-50 border-red-100 text-red-700',
    text: 'text-red-700',
    border: 'hover:border-red-300',
  },
  purple: {
    iconBg: 'bg-purple-50 border-purple-100 text-purple-700',
    text: 'text-purple-700',
    border: 'hover:border-purple-300',
  },
  gold: {
    iconBg: 'bg-[#FFD600]/20 border-[#FFD600]/40 text-amber-900',
    text: 'text-amber-900',
    border: 'hover:border-amber-300',
  },
};

export function KPICard({
  title,
  value,
  numericValue,
  prefix = '',
  suffix = '',
  decimalPlaces = 0,
  subtitle,
  icon,
  trend,
  accent = 'blue',
  className,
  isHero = false,
}: KPICardProps) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.blue;

  if (isHero) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-white p-5 md:p-6 border-2 border-[#0054A6]/20 shadow-sm transition-all duration-300',
          className
        )}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0054A6] via-[#FFD600] to-[#0054A6]" />
        <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {title}
            </span>
            {icon && (
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0054A6]">
                {icon}
              </div>
            )}
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-[#0054A6] tracking-tight font-mono">
              {numericValue !== undefined ? (
                <NumberTicker
                  value={numericValue}
                  prefix={prefix}
                  suffix={suffix}
                  decimalPlaces={decimalPlaces}
                />
              ) : (
                value
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {trend && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 pt-1">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100">
                {trend.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              </span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl bg-white border border-slate-200/90 p-4 md:p-5 flex flex-col justify-between shadow-xs transition-all duration-200 hover:shadow-md hover:border-slate-300',
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </p>
        {icon && (
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 transition-transform duration-200 group-hover:scale-105',
              styles.iconBg
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="my-0.5">
        <div
          className={cn(
            'text-2xl font-bold tracking-tight font-mono',
            styles.text
          )}
        >
          {numericValue !== undefined ? (
            <NumberTicker
              value={numericValue}
              prefix={prefix}
              suffix={suffix}
              decimalPlaces={decimalPlaces}
            />
          ) : (
            value
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100">
        {subtitle && (
          <p className="text-xs text-slate-500 truncate" title={subtitle}>
            {subtitle}
          </p>
        )}
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-auto',
              trend.positive
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                : 'text-red-700 bg-red-50 border border-red-200'
            )}
          >
            {trend.positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}
