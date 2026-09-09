'use client';

import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/website/utils';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  disabled = false,
  className,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const sizes = {
    sm: {
      button: 'h-8 w-8',
      text: 'text-sm w-8',
      icon: 'h-3.5 w-3.5',
    },
    md: {
      button: 'h-10 w-10',
      text: 'text-base w-10',
      icon: 'h-4 w-4',
    },
    lg: {
      button: 'h-12 w-12',
      text: 'text-lg w-12',
      icon: 'h-5 w-5',
    },
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1',
        disabled && 'opacity-50',
        className
      )}
    >
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={cn(
          'flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 transition-colors',
          sizes[size].button,
          value <= min ? 'text-slate-400 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-600',
          disabled && 'cursor-not-allowed'
        )}
        onClick={handleDecrement}
        disabled={disabled || value <= min}
      >
        <Minus className={sizes[size].icon} />
      </motion.button>

      <span
        className={cn(
          'text-center font-semibold tabular-nums',
          sizes[size].text
        )}
      >
        {value}
      </span>

      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={cn(
          'flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 transition-colors',
          sizes[size].button,
          value >= max ? 'text-slate-400 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-600',
          disabled && 'cursor-not-allowed'
        )}
        onClick={handleIncrement}
        disabled={disabled || value >= max}
      >
        <Plus className={sizes[size].icon} />
      </motion.button>
    </div>
  );
}
