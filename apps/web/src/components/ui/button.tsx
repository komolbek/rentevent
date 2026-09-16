'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * shadcn `buttonVariants`, RentEvent look: every button is a pill, the
 * primary one carries the orange glow. `gradient` is an alias of `primary`
 * kept for old call sites — one primary look site-wide.
 */
export const buttonVariants = cva(
  [
    'group relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium tracking-tight',
    'transition-[background-color,color,box-shadow,border-color,filter,transform] duration-300',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    'outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_rgba(242,86,41,0.55)] hover:bg-primary-600 hover:shadow-[0_10px_28px_-8px_rgba(242,86,41,0.6)]',
        gradient:
          'bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_rgba(242,86,41,0.55)] hover:bg-primary-600 hover:shadow-[0_10px_28px_-8px_rgba(242,86,41,0.6)]',
        secondary:
          'bg-foreground text-background shadow-[0_4px_16px_-6px_rgba(23,23,23,0.5)] hover:bg-foreground/90',
        outline:
          'border border-foreground/15 bg-transparent text-foreground hover:border-foreground/40 hover:bg-foreground/[0.035]',
        ghost: 'bg-transparent text-foreground hover:bg-foreground/[0.06]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_6px_20px_-6px_rgba(229,72,77,0.5)] hover:brightness-95',
        link: 'text-primary-text underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 gap-1.5 px-4 text-sm',
        md: 'h-11 gap-2 px-6 text-sm',
        lg: 'h-14 gap-2.5 px-8 text-base [&_svg:not([class*="size-"])]:size-5',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the styles onto the child element (a `<Link>`, say) instead of a `<button>`. */
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, isLoading = false, leftIcon, rightIcon, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : asChild ? (
          children
        ) : (
          <>
            {leftIcon && (
              <span className="shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5">{leftIcon}</span>
            )}
            {children}
            {rightIcon && (
              <span className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5">{rightIcon}</span>
            )}
          </>
        )}
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button };
