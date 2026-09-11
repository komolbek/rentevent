'use client';

import { useState, useEffect } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, X, CalendarDays, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  error?: string;
  className?: string;
  /**
   * `bare` drops the bordered trigger so the picker can sit inside a composed
   * control (the home-page search bar) without a box-inside-a-box.
   */
  variant?: 'default' | 'bare';
}

export function DateRangePicker({
  value,
  onChange,
  minDate = new Date(),
  maxDate,
  label,
  error,
  className,
  variant = 'default',
}: DateRangePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // Two months side by side is ~600px wide — wider than a phone. Show one
  // month below `sm` so the popover never overflows the viewport.
  const [monthsToShow, setMonthsToShow] = useState(2);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const sync = () => setMonthsToShow(query.matches ? 2 : 1);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  // Calculate rental days
  const rentalDays = value?.from && value?.to
    ? differenceInDays(value.to, value.from) + 1
    : 0;

  const handleSelect = (range: DateRange | undefined) => {
    // Update parent immediately; keep the picker open so the user can adjust
    // either endpoint and explicitly confirm with the Apply button.
    onChange(range);
  };

  const formatDisplayDate = () => {
    if (!value?.from) return t('date_picker.select_dates');
    if (!value.to) return format(value.from, 'd MMM yyyy', { locale: ru });
    // Most rentals start and end in the same month, so naming it twice just
    // makes the label wide enough to clip. "23 – 26 авг. 2026", not
    // "23 авг. - 26 авг. 2026". The popover header still shows both in full.
    const sameMonth =
      value.from.getFullYear() === value.to.getFullYear() &&
      value.from.getMonth() === value.to.getMonth();
    const start = sameMonth
      ? format(value.from, 'd', { locale: ru })
      : format(value.from, 'd MMM', { locale: ru });
    return `${start} – ${format(value.to, 'd MMM yyyy', { locale: ru })}`;
  };

  const handleClearDates = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group flex w-full items-center text-left transition-all duration-200',
          variant === 'default'
            ? [
                'gap-3 rounded-xl border-2 border-input bg-card px-4 py-3',
                'hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10',
                error && 'border-destructive focus:border-destructive focus:ring-destructive/10',
                isOpen && 'border-primary ring-4 ring-primary/10',
              ]
            : 'gap-2 rounded-xl px-2.5 py-2.5 hover:bg-muted/60 focus:outline-none'
        )}
      >
        <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <span className={cn('block truncate', !value?.from && 'text-muted-foreground')}>
            {formatDisplayDate()}
          </span>
          {rentalDays > 0 && (
            <span className="text-xs text-muted-foreground mt-0.5 block">
              {rentalDays} {rentalDays === 1 ? t('date_picker.day_one') : rentalDays < 5 ? t('date_picker.day_few') : t('date_picker.day_many')}
            </span>
          )}
        </div>
        {/* Hover-revealed, so it never appears on touch — and in the compact
            `bare` trigger it was still reserving 36px that the date label
            needed. Keep it only where there is room; the popover's "clear"
            action covers both variants. */}
        {variant === 'default' && value?.from && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClearDates}
            className="h-6 w-6 rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </motion.button>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            {/* Positioning lives on a plain wrapper: framer writes an inline
                `transform` on the animated element, which would override any
                translate-based centring. Below `sm` the popover is centred in
                the viewport (a phone is narrower than the calendar); from `sm`
                up it hangs under the trigger. */}
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="pointer-events-auto w-max max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:max-w-[calc(100vw-3rem)]"
              >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{t('date_picker.select_period')}</h3>
                      {rentalDays > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t('date_picker.selected_days', { count: rentalDays })}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Selected Range Display */}
                {value?.from && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-2 text-sm"
                  >
                    <div className="flex-1 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-0.5">{t('date_picker.start')}</p>
                      <p className="font-medium">{format(value.from, 'd MMMM yyyy', { locale: ru })}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-0.5">{t('date_picker.end')}</p>
                      <p className="font-medium">
                        {value.to ? format(value.to, 'd MMMM yyyy', { locale: ru }) : '—'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Calendar */}
              <div className="p-4 sm:p-6">
                <DayPicker
                  mode="range"
                  selected={value}
                  onSelect={handleSelect}
                  locale={ru}
                  disabled={{ before: minDate, after: maxDate }}
                  numberOfMonths={monthsToShow}
                  showOutsideDays
                  classNames={{
                    months: 'flex gap-6',
                    month: 'space-y-4',
                    month_caption: 'flex justify-center pt-1 relative items-center mb-4',
                    caption_label: 'text-sm font-semibold',
                    nav: 'absolute inset-x-0 top-0 flex items-center justify-between px-1',
                    button_previous:
                      'h-8 w-8 bg-transparent p-0 hover:bg-muted rounded-lg flex items-center justify-center transition-colors',
                    button_next:
                      'h-8 w-8 bg-transparent p-0 hover:bg-muted rounded-lg flex items-center justify-center transition-colors',
                    weekday: 'text-muted-foreground w-10 font-medium text-xs uppercase',
                    day: 'text-center text-sm p-0',
                    day_button: cn(
                      'h-10 w-10 p-0 font-medium rounded-lg transition-all duration-200',
                      'hover:bg-primary/10',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2'
                    ),
                    selected: 'bg-primary text-primary-foreground hover:bg-primary',
                    range_start: 'bg-primary text-primary-foreground rounded-l-lg',
                    range_end: 'bg-primary text-primary-foreground rounded-r-lg',
                    range_middle: 'bg-primary/20 text-foreground rounded-none',
                    today: 'font-bold text-primary-text',
                    outside: 'text-muted-foreground/30 opacity-30',
                    disabled: 'text-muted-foreground/20 opacity-30 cursor-not-allowed line-through',
                    hidden: 'invisible',
                  }}
                  components={{
                    Chevron: ({ orientation }) =>
                      orientation === 'left' ? (
                        <ChevronLeft className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      ),
                  }}
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                <button
                  onClick={handleClearDates}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('date_picker.clear')}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={!value?.from || !value?.to}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-all',
                    value?.from && value?.to
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {t('date_picker.apply')}
                </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
