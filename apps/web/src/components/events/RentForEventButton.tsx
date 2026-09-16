'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import type { EventItem } from '@/lib/api';
import { eventRentalPeriod } from '@/lib/events';
import { useRentalPeriodStore } from '@/stores/rental-period-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface RentForEventButtonProps {
  event: EventItem;
  size?: 'sm' | 'md';
  /** `quiet` for grids — twenty orange pills on one screen is not one loud colour. */
  variant?: 'primary' | 'quiet';
  className?: string;
}

/**
 * The one action on an event card: set the rental period to the fair's
 * dates and open the catalog, which then shows only what is free for them.
 * The events page used to open the fair's own website — the visitor came
 * here to rent, not to buy a ticket.
 */
export function RentForEventButton({ event, size = 'md', variant = 'quiet', className }: RentForEventButtonProps) {
  const router = useRouter();
  const setPeriod = useRentalPeriodStore((s) => s.setPeriod);
  const { t } = useTranslation();
  const period = eventRentalPeriod(event);

  if (!period) return null;

  const rent = () => {
    setPeriod(period.from, period.to);
    router.push('/catalog');
  };

  return (
    <button
      type="button"
      onClick={rent}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,border-color,color,transform] active:scale-[0.97]',
        'outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_rgba(242,86,41,0.55)] hover:bg-primary/90'
          : 'border border-border bg-card text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground',
        size === 'sm' ? 'h-10 px-4 text-sm' : 'h-11 px-5 text-sm',
        className,
      )}
    >
      {t('events.rent_for_this')}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
