'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Pill silhouette is a deliberate brand rhyme (it echoed the original
    // pill-shaped wordmark) rather than a stock rounded-xl button.
    const baseStyles =
      'group relative inline-flex items-center justify-center rounded-full font-medium tracking-tight whitespace-nowrap transition-[background-color,color,box-shadow,border-color,filter] duration-300 disabled:pointer-events-none disabled:opacity-50 select-none';

    const variants = {
      // Fire orange — the primary call to action.
      primary:
        'bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_rgba(242,86,41,0.55)] hover:bg-primary-600 hover:shadow-[0_10px_28px_-8px_rgba(242,86,41,0.6)]',
      // Graphite ink — the quiet, editorial companion action.
      secondary:
        'bg-foreground text-background hover:bg-foreground/90 shadow-[0_4px_16px_-6px_rgba(23,23,23,0.5)]',
      outline:
        'border border-foreground/15 bg-transparent text-foreground hover:border-foreground/40 hover:bg-foreground/[0.035]',
      ghost:
        'bg-transparent text-foreground hover:bg-foreground/[0.06]',
      destructive:
        'bg-destructive text-destructive-foreground hover:brightness-95 shadow-[0_6px_20px_-6px_rgba(229,72,77,0.5)]',
      // Fire gradient — orange → amber, on-brand replacement for the old purple.
      gradient:
        'bg-[linear-gradient(100deg,var(--color-primary),var(--color-accent-500))] text-white shadow-[0_8px_24px_-8px_rgba(242,86,41,0.55)] hover:brightness-[1.04] hover:shadow-[0_12px_30px_-8px_rgba(242,86,41,0.6)]',
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm gap-1.5',
      md: 'h-11 px-6 text-sm gap-2',
      lg: 'h-14 px-8 text-base gap-2.5',
      icon: 'h-10 w-10',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {leftIcon && (
              <span className="shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5">
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
