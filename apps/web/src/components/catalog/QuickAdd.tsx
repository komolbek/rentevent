'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Minus, CalendarDays } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'react-hot-toast';
import type { IProduct } from '@rentevent/types';
import { Button, Modal, RangeCalendar } from '@/components/ui';
import { cn, formatDateShort, getTomorrow, calculateRentalDays } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useCartStore, useCartHydrated, cartEventId } from '@/stores/cart-store';
import { useRentalPeriodStore } from '@/stores/rental-period-store';
import { quickAddCap, quickAddOutcome, resolveQuickAddPeriod } from '@/lib/quick-add';
import { productsApi } from '@/lib/api';

interface QuickAddProps {
  product: IProduct;
  name: string;
}

/**
 * "+" on a product card that turns into a [ − n + ] stepper once the item is
 * in the cart. Cart-only (no API): the period comes from the cart or the
 * stored rental period; with neither, the first "+" asks for dates once.
 * Lives inside the card's <Link>, so every handler stops the navigation.
 */
export function QuickAdd({ product, name }: QuickAddProps) {
  const { t } = useTranslation();
  const hydrated = useCartHydrated();
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0);
  const quantity = hydrated ? inCart : 0;
  const cap = quickAddCap(product);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // framer-motion's whileTap on the card listens natively on the card, so a
  // React stopPropagation is too late: stop the native pointerdown here.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener('pointerdown', stop);
    return () => el.removeEventListener('pointerdown', stop);
  }, []);
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  const showHint = useCallback((text: string) => {
    setHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 2500);
  }, []);

  const addAt = useCallback(
    async (from: Date, to: Date, fromCart: boolean) => {
      const { items } = useCartStore.getState();
      const stored = useRentalPeriodStore.getState().event;
      const event = fromCart ? cartEventId(items) ?? stored?.id : stored?.id;
      // The catalog list carries no pricing tiers and, without a fair, no
      // fair price: read the full product once so the cart prices it exactly
      // like the product page. If that fails, say so instead of staying silent.
      let full: IProduct = product;
      try {
        const res = await productsApi.getById(product.id, event ? { event_id: event } : undefined);
        if (res?.id) full = res;
      } catch {
        // fall back to the list item below
      }
      try {
        useCartStore.getState().addItem(full, 1, from, to, full.eventPrice != null ? event ?? null : null);
        toast.success(t('quick_add.added', { from: formatDateShort(from), to: formatDateShort(to) }));
      } catch {
        toast.error(t('quick_add.error'));
      }
    },
    [product, t],
  );

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleStep = (delta: 1 | -1) => (e: React.MouseEvent) => {
    stop(e);
    const { items, updateItem, removeItem } = useCartStore.getState();
    const { from, to } = useRentalPeriodStore.getState();
    const period = resolveQuickAddPeriod(items, { from, to });
    const outcome = quickAddOutcome(quantity, delta, cap, period, { from });
    switch (outcome.kind) {
      case 'add':
        if (period) void addAt(period.from, period.to, period.source === 'cart');
        return;
      case 'pick_dates':
        // A stored period that is not bookable (e.g. a fair already running
        // or over 90 days) is explained, then the picker lets the visitor choose.
        if (outcome.stale) toast(t('quick_add.period_invalid'));
        setRange(undefined);
        setPickerOpen(true);
        return;
      case 'set':
        updateItem(product.id, { quantity: outcome.quantity });
        return;
      case 'remove':
        removeItem(product.id);
        return;
      case 'message':
        showHint(t(outcome.key));
        return;
      default:
        return;
    }
  };

  const confirmPicker = () => {
    if (!range?.from || !range?.to) return;
    const { from, to } = range;
    // One period per order: if the cart still holds lines on a stale period,
    // move them to the new one so checkout never sees two.
    const { items, updateItem } = useCartStore.getState();
    for (const line of items) {
      updateItem(line.productId, { rentalStartDate: from.toISOString(), rentalEndDate: to.toISOString() });
    }
    useRentalPeriodStore.getState().setPeriod(from, to);
    void addAt(from, to, false);
    setPickerOpen(false);
  };

  const days = range?.from && range?.to ? calculateRentalDays(range.from, range.to) : 0;
  const hintId = `quick-add-hint-${product.id}`;

  let control: React.ReactNode;
  if (cap <= 0) {
    control = (
      <button
        type="button"
        aria-disabled="true"
        aria-label={`${t('quick_add.add', { name })}. ${t('quick_add.no_stock')}`}
        title={t('quick_add.no_stock')}
        onClick={(e) => {
          stop(e);
          showHint(t('quick_add.no_stock'));
        }}
        className={cn('inline-flex h-11 w-11 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-foreground', 'rounded-xl')}
      >
        <span className={cn('inline-flex h-9 w-9 items-center justify-center bg-muted text-muted-foreground/60', 'rounded-xl')}>
          <Plus className="h-5 w-5" aria-hidden="true" />
        </span>
      </button>
    );
  } else if (quantity > 0) {
    const atCap = quantity >= cap;
    control = (
      <div
        role="group"
        aria-label={t('quick_add.group', { name, count: quantity })}
        className={cn('inline-flex h-11 items-center bg-rent text-white', 'rounded-xl')}
      >
        <button
          type="button"
          onClick={handleStep(-1)}
          aria-label={t('quick_add.dec')}
          className={cn('inline-flex h-11 w-11 items-center justify-center outline-none hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-foreground', 'rounded-xl')}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span aria-live="polite" className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
          {quantity}
        </span>
        <button
          type="button"
          onClick={handleStep(1)}
          aria-label={t('quick_add.inc')}
          aria-disabled={atCap}
          aria-describedby={atCap ? hintId : undefined}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center outline-none hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-foreground',
            'rounded-xl',
            atCap && 'opacity-40',
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        {atCap && <span id={hintId} className="sr-only">{t('quick_add.max')}</span>}
      </div>
    );
  } else {
    control = (
      <button
        type="button"
        onClick={handleStep(1)}
        aria-label={t('quick_add.add', { name })}
        className={cn('inline-flex h-11 w-11 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-foreground', 'rounded-xl')}
      >
        <span className={cn('inline-flex h-9 w-9 items-center justify-center bg-rent text-white transition-colors hover:bg-rent/85', 'rounded-xl')}>
          <Plus className="h-5 w-5" aria-hidden="true" />
        </span>
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      {hint && (
        <span
          role="status"
          className="pointer-events-none absolute bottom-full right-0 mb-1 whitespace-nowrap rounded-lg bg-brand-graphite px-2.5 py-1 text-xs text-white shadow-lg"
        >
          {hint}
        </span>
      )}
      {control}

      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('quick_add.pick_title')}
        description={name}
        size="md"
      >
        <p className="mb-4 text-sm text-muted-foreground">{t('quick_add.pick_hint')}</p>
        <div className="flex justify-center rounded-xl border border-border bg-background p-3">
          <RangeCalendar value={range} onChange={setRange} minDate={getTomorrow()} months={1} />
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {range?.from && range?.to ? (
            <p className="font-medium">
              {formatDateShort(range.from)} – {formatDateShort(range.to)}
              <span className="ml-2 text-muted-foreground">· {t('date_picker.selected_days', { count: days })}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">{t('date_picker.select_dates')}</p>
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setPickerOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="primary" className="flex-1" disabled={!range?.from || !range?.to} onClick={confirmPicker}>
            {t('quick_add.pick_confirm')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
