import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The fair the visitor is renting for — its dates fill the period and its prices apply. */
export interface SelectedEvent {
  id: string;
  title: string;
  /** ISO, for the chip; the period itself lives in from/to. */
  startDate: string;
  endDate: string | null;
}

/**
 * The rental period the visitor picked — directly, or by choosing a fair —
 * carried across the session: the catalog filters by it, every product page
 * opens pre-filled with it, and a chosen fair's prices follow it to checkout.
 *
 * Dates are stored as ISO strings so they survive localStorage rehydration.
 */
interface RentalPeriodState {
  from: string | null;
  to: string | null;
  event: SelectedEvent | null;
  setPeriod: (from: Date | null | undefined, to: Date | null | undefined) => void;
  /** Pick a fair: remembers it and sets the period to its days. */
  selectEvent: (event: SelectedEvent, from: Date, to: Date) => void;
  clearEvent: () => void;
  clearPeriod: () => void;
}

function atMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const useRentalPeriodStore = create<RentalPeriodState>()(
  persist(
    (set) => ({
      from: null,
      to: null,
      event: null,
      // Stored at local midnight: rental dates are whole days, and a
      // time-of-day here made day counts differ between the picker and the
      // cart for the same range. Moving the dates keeps the fair (stands are
      // often built the day before it opens); clearing them drops it.
      setPeriod: (from, to) =>
        set((state) => ({
          from: from ? atMidnight(from).toISOString() : null,
          to: to ? atMidnight(to).toISOString() : null,
          event: from ? state.event : null,
        })),
      selectEvent: (event, from, to) =>
        set({
          event,
          from: atMidnight(from).toISOString(),
          to: atMidnight(to).toISOString(),
        }),
      clearEvent: () => set({ event: null }),
      clearPeriod: () => set({ from: null, to: null, event: null }),
    }),
    { name: 'rental-period-storage' },
  ),
);

/** Read the stored period back as Dates, dropping anything unparseable. */
export function getStoredPeriod(): { from?: Date; to?: Date } {
  const { from, to } = useRentalPeriodStore.getState();
  const parse = (value: string | null) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  return { from: parse(from), to: parse(to) };
}
