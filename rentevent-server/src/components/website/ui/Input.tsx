'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/website/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, type, required, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <span className="text-slate-500 dark:text-slate-400">{leftIcon}</span>
            </div>
          )}
          <input
            type={type}
            required={required}
            className={cn(
              'flex h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-base transition-all duration-200',
              'placeholder:text-slate-400',
              'focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <span className="text-slate-500 dark:text-slate-400">{rightIcon}</span>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
