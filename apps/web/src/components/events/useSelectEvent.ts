'use client';

import { useCallback } from 'react';
import type { EventItem } from '@/lib/api';
import { eventRentalPeriod, localizeEvent } from '@/lib/events';
import { useRentalPeriodStore } from '@/stores/rental-period-store';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Choose a fair: remember it (so its event prices apply in the catalog, cart
 * and order) and set the rental period to its days. Returns false for a fair
 * that is already over.
 */
export function useSelectEvent() {
  const selectEvent = useRentalPeriodStore((s) => s.selectEvent);
  const { locale } = useTranslation();
  return useCallback(
    (event: EventItem): boolean => {
      const period = eventRentalPeriod(event);
      if (!period) return false;
      selectEvent(
        {
          id: event.id,
          title: localizeEvent(event, locale, 'title'),
          startDate: event.start_date,
          endDate: event.end_date,
        },
        period.from,
        period.to,
      );
      return true;
    },
    [selectEvent, locale],
  );
}
