'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { CalendarDays, Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import { eventsApi, type EventItem } from '@/lib/api';
import { formatEventRange, localizeEvent, upcomingEvents } from '@/lib/events';
import { useRentalPeriodStore } from '@/stores/rental-period-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { useSelectEvent } from './useSelectEvent';

interface EventPickerProps {
  /** Where to go after a fair is picked; `null` stays on the page (catalog). */
  navigateTo?: string | null;
  /** `band` is the full-width home bar; `field` is a form-height control. */
  variant?: 'band' | 'field';
  className?: string;
}

/**
 * "Select your exhibition event" — the fair.rent entry point. Picking a fair
 * sets the rental period to its days and switches prices to that fair's, so
 * the visitor never types dates for an exhibition we already know.
 */
export function EventPicker({ navigateTo = '/catalog', variant = 'band', className }: EventPickerProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const selectEvent = useSelectEvent();
  const selected = useRentalPeriodStore((s) => s.event);
  const clearEvent = useRentalPeriodStore((s) => s.clearEvent);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['events', 'picker'],
    queryFn: () => eventsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const events = useMemo(() => {
    const list = upcomingEvents(data?.items ?? []);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) =>
      [localizeEvent(e, locale, 'title'), e.venue, e.city].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, query, locale]);

  const pick = (e: EventItem) => {
    if (!selectEvent(e)) return;
    setOpen(false);
    setQuery('');
    if (navigateTo) router.push(navigateTo);
  };

  const label = selected ? selected.title : t('event_picker.placeholder');

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <PopoverPrimitive.Trigger
          className={cn(
            'group flex w-full items-center gap-3 text-left outline-none transition-colors',
            'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            variant === 'band'
              ? 'min-h-16 rounded-2xl bg-card px-4 shadow-[0_18px_50px_-20px_rgba(23,23,23,0.45)] ring-1 ring-border hover:ring-primary/60 sm:min-h-[4.5rem] sm:px-6'
              : cn('min-h-12 rounded-xl border-2 border-input bg-card px-4 hover:border-primary/50', selected && 'pr-3'),
          )}
        >
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_6px_16px_-6px_rgba(242,86,41,0.8)]',
              variant === 'band' ? 'h-10 w-10 sm:h-11 sm:w-11' : 'h-8 w-8',
            )}
          >
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className={cn('min-w-0 flex-1', selected && variant === 'field' && 'pr-8')}>
            {variant === 'band' && (
              <span className="eyebrow block text-primary-text">{t('event_picker.eyebrow')}</span>
            )}
            <span
              className={cn(
                'block truncate font-semibold',
                variant === 'band' ? 'text-base sm:text-lg' : 'text-sm',
                !selected && variant === 'field' && 'font-medium text-muted-foreground',
              )}
            >
              {label}
            </span>
          </span>
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </PopoverPrimitive.Trigger>
        {/* A sibling, not a child of the trigger (no button in a button). */}
        {selected && variant === 'field' && (
          <button
            type="button"
            onClick={clearEvent}
            className="absolute right-11 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('event_picker.clear')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[min(26rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="border-b border-border p-3">
            <label className="flex h-11 items-center gap-2 rounded-xl bg-muted px-3 focus-within:ring-2 focus-within:ring-primary/30">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">{t('event_picker.search')}</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('event_picker.search')}
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
          <ul className="max-h-[22rem] overflow-y-auto p-1.5" role="listbox" aria-label={t('event_picker.eyebrow')}>
            {isLoading &&
              [0, 1, 2].map((i) => <li key={i} className="m-1.5 h-14 animate-pulse rounded-xl bg-muted" />)}
            {!isLoading && events.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">{t('event_picker.empty')}</li>
            )}
            {events.map((e) => {
              const isSelected = selected?.id === e.id;
              const place = [e.venue, e.city].filter(Boolean).join(', ');
              return (
                <li key={e.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => pick(e)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
                      isSelected && 'bg-primary/10 hover:bg-primary/15',
                    )}
                  >
                    <span className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1.5">
                      {e.image_url ? (
                        <Image src={e.image_url} alt="" fill sizes="64px" className="object-contain p-1.5" />
                      ) : (
                        <CalendarDays className="h-5 w-5 text-primary/60" aria-hidden="true" />
                      )}
                    </span>
                    {/* Title, then dates (never wrapped), then venue on its own line. */}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold leading-snug">{localizeEvent(e, locale, 'title')}</span>
                      <span className="mt-1 block whitespace-nowrap text-xs font-semibold text-primary-text">
                        {formatEventRange(e.start_date, e.end_date, locale, 'short')}
                      </span>
                      {place && (
                        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{place}</span>
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
