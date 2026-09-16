'use client';

import type { ComponentProps } from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** shadcn `badgeVariants`, RentEvent look: small uppercase pill, solid tints that pass contrast on photos. */
export const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium uppercase tracking-[0.08em] backdrop-blur-sm transition-colors [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary/12 text-primary-text ring-1 ring-inset ring-primary/20',
        secondary: 'bg-foreground/8 text-foreground ring-1 ring-inset ring-foreground/10',
        success:
          'bg-emerald-500/12 text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-400',
        // Solid amber-100 / amber-900 reads at ≥ 7:1 on a photo; translucent
        // amber on white was ≈ 2.6:1.
        warning:
          'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300/60 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/30',
        destructive: 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25',
        graphite: 'bg-brand-graphite/85 text-white',
        outline: 'border border-border text-muted-foreground',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-[10px]',
        lg: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, variant, size, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge };
