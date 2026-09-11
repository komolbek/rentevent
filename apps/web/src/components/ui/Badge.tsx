'use client';

import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center font-medium rounded-full uppercase tracking-[0.08em] transition-colors backdrop-blur-sm';

    const variants = {
      default: 'bg-primary/12 text-primary-text ring-1 ring-inset ring-primary/20',
      secondary: 'bg-foreground/8 text-foreground ring-1 ring-inset ring-foreground/10',
      success: 'bg-emerald-500/12 text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-400',
      warning: 'bg-amber-500/14 text-amber-700 ring-1 ring-inset ring-amber-500/25 dark:text-amber-400',
      destructive: 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25',
      outline: 'border border-border text-muted-foreground',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-[10px]',
      md: 'px-2.5 py-1 text-[10px]',
      lg: 'px-3 py-1 text-xs',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
