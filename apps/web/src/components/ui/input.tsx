'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Field styles alone — what shadcn's `Input` is. Compose with a label yourself, or use `Input`. */
export const inputClassName = cn(
  'flex h-12 w-full min-w-0 rounded-xl border border-input bg-card px-4 py-2 text-base text-foreground transition-[border-color,box-shadow] duration-200',
  'placeholder:text-muted-foreground/70 file:border-0 file:bg-transparent file:text-sm file:font-medium',
  'outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/12',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/10',
);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, type, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const messageId = error || helperText ? `${inputId}-message` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            data-slot="input"
            aria-invalid={error ? true : undefined}
            aria-describedby={messageId}
            className={cn(inputClassName, leftIcon && 'pl-11', rightIcon && 'pr-11', className)}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground">{rightIcon}</div>
          )}
        </div>
        {error ? (
          <p id={messageId} className="mt-1.5 text-sm text-destructive">
            {error}
          </p>
        ) : helperText ? (
          <p id={messageId} className="mt-1.5 text-sm text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
