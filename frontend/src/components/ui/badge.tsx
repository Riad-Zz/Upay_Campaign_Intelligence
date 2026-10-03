import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-upay-600 text-white hover:bg-upay-500',
        secondary: 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700',
        destructive: 'bg-red-900/60 text-red-400 border border-red-800/50',
        outline: 'text-slate-300 border border-slate-700',
        success: 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50',
        warning: 'bg-amber-950/70 text-amber-400 border border-amber-800/50',
        brand: 'bg-upay-950/70 text-upay-300 border border-upay-800/50',
        gold: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
