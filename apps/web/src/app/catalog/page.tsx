'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, ChevronRight, CalendarDays, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { dateFnsLocale } from '@/lib/i18n/dates';
import { categoriesApi, productsApi, type ProductSort } from '@/lib/api';
import { useRentalPeriodStore } from '@/stores/rental-period-store';
import { EventPicker } from '@/components/events/EventPicker';
import { Button, ProductCardSkeleton, EmptyState, DateRangePicker } from '@/components/ui';
import { formatDateForAPI, getTomorrow } from '@/lib/utils';
import { ProductCard } from '@/components/catalog/ProductCard';
import { Reveal } from '@/components/home/Reveal';
import { CategoryIcon } from '@/lib/categoryIcon';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { countLabel } from '@/lib/i18n';

// The admin's order: pinned products first, then the order dragged into
// place in admin → Товары → Порядок.
const DEFAULT_SORT: ProductSort = 'recommended';

function getSortOptions(t: (key: string) => string) {
  return [
    { value: 'recommended', label: t('catalog.sort_recommended') },
    { value: 'popular', label: t('catalog.sort_popular') },
    { value: 'newest', label: t('catalog.sort_newest') },
    { value: 'price_asc', label: t('catalog.sort_price_asc') },
    { value: 'price_desc', label: t('catalog.sort_price_desc') },
  ];
}

function getCategoryName(name: string, t: (key: string) => string): string {
  const translated = t(`category_name.${name}` as any);
  // If translation returns the key itself, fall back to original name
  return translated.startsWith('category_name.') ? name : translated;
}

function CatalogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();
  const sortOptions = getSortOptions(t);

  const categoryId = searchParams.get('category') || undefined;
  const search = searchParams.get('q') || undefined;
  const sort = searchParams.get('sort') || DEFAULT_SORT;
  const page = parseInt(searchParams.get('page') || '1');

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', locale],
    queryFn: categoriesApi.getAll,
  });

  // Rental period — a real filter: the API drops products with no free unit
  // on any day of the range and reports free units for the rest. It lives in
  // the rental-period store (shared with the product page, sets and the fair
  // picker), so picking a fair here or on the home page fills the dates. The
  // persisted store is empty during SSR, so it is read after mount.
  const setPeriod = useRentalPeriodStore((s) => s.setPeriod);
  const storedFrom = useRentalPeriodStore((s) => s.from);
  const storedTo = useRentalPeriodStore((s) => s.to);
  const selectedEvent = useRentalPeriodStore((s) => s.event);
  const clearEvent = useRentalPeriodStore((s) => s.clearEvent);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const range: DateRange | undefined =
    mounted && storedFrom
      ? { from: new Date(storedFrom), to: new Date(storedTo ?? storedFrom) }
      : undefined;
  const eventId = mounted ? selectedEvent?.id : undefined;

  const handleRangeChange = (next: DateRange | undefined) => {
    setPeriod(next?.from, next?.to ?? next?.from);
  };

  const periodParams =
    range?.from && range?.to
      ? { start_date: formatDateForAPI(range.from), end_date: formatDateForAPI(range.to) }
      : {};

  // `isPending`, not `isLoading`: the query is disabled until the stored
  // period is read, and during that frame there is still nothing to show.
  const { data: products, isPending: productsLoading } = useQuery({
    queryKey: ['products', categoryId, search, sort, page, periodParams.start_date, periodParams.end_date, eventId],
    queryFn: () =>
      productsApi.getAll({
        category_id: categoryId,
        search,
        sort: sort as ProductSort,
        page,
        limit: 12,
        ...periodParams,
        event_id: eventId,
      }),
    // Wait for the stored period so the first fetch is already the right one.
    enabled: mounted,
  });

  // Recommended for the chosen fair (admin → Мероприятия → Цены → ★). An
  // extra row above the full catalog, never a filter: everything else stays.
  const showPicks = !!eventId && !categoryId && !search && page === 1;
  const { data: picks } = useQuery({
    queryKey: ['products', 'event-picks', eventId],
    queryFn: () => productsApi.getAll({ event_id: eventId, event_featured: true, limit: 8, sort: 'recommended' }),
    enabled: showPicks,
  });

  const selectedCategory = categories?.find((c) => c.id === categoryId);

  // Which edges of the category chip row have more content beyond them.
  const chipRowRef = useRef<HTMLDivElement>(null);
  const [chipFade, setChipFade] = useState({ left: false, right: false });
  const updateChipFade = useCallback(() => {
    const el = chipRowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setChipFade({ left: el.scrollLeft > 4, right: max - el.scrollLeft > 4 });
  }, []);
  useEffect(() => {
    updateChipFade();
    const el = chipRowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateChipFade);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateChipFade, categories, search]);

  const dfLocale = dateFnsLocale(locale);
  const periodLabel =
    range?.from && range?.to
      ? `${format(range.from, 'd MMM', { locale: dfLocale })} — ${format(range.to, 'd MMM yyyy', { locale: dfLocale })}`
      : null;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    // Reset page when filters change
    if (!updates.page) {
      newParams.delete('page');
    }
    router.replace(`/catalog?${newParams.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {selectedCategory ? getCategoryName(selectedCategory.name, t) : search ? t('catalog.search_prefix', { query: search }) : t('catalog.title')}
        </h1>
        <p className="text-muted-foreground">
          {products?.meta.total !== undefined && !productsLoading
            ? periodLabel
              ? t('catalog.products_available_count', {
                  count: countLabel(products.meta.total, locale, 'products'),
                  dates: periodLabel,
                })
              : countLabel(products.meta.total, locale, 'products')
            : t('catalog.loading')}
        </p>
      </div>

      {/* Categories Horizontal Scroll */}
      {!search && (
        <div className="relative mb-8 -mx-4 px-4">
          {/* Edge fades tell the eye the row keeps going: right while chips
              are still hidden, left once scrolled, neither at the ends. */}
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-4 z-10 w-10 bg-gradient-to-r from-background to-transparent transition-opacity duration-200',
              chipFade.left ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 right-4 z-10 flex w-12 items-start justify-end bg-gradient-to-l from-background via-background/80 to-transparent transition-opacity duration-200',
              chipFade.right ? 'opacity-100' : 'opacity-0',
            )}
          >
            {/* A "›" so the fade reads as "more chips this way", not as a cut. */}
            <span className="mt-2 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div
            ref={chipRowRef}
            onScroll={updateChipFade}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          >
            <button
              onClick={() => updateParams({ category: undefined })}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
                !categoryId
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {t('catalog.all')}
            </button>
            {categoriesLoading
              ? [...Array(6)].map((_, i) => (
                  <div key={i} className="shrink-0 h-9 w-24 rounded-full bg-muted animate-pulse" />
                ))
              : categories?.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => updateParams({ category: category.id })}
                    className={cn(
                      'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2',
                      categoryId === category.id
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    <CategoryIcon name={category.iconName} />
                    {getCategoryName(category.name, t)}
                  </button>
                ))}
          </div>
        </div>
      )}

      {/* Date bar — the filter that makes this catalog different from a
          furniture shop, so it gets a sentence and a full row, not a small
          grey input. Pre-filled from the rental-period store. */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-text">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold leading-tight">{t('catalog.date_bar_title')}</p>
              <p className="text-sm text-muted-foreground">{t('catalog.date_bar_hint')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
            <div className="w-full sm:w-72">
              <span className="sr-only">{t('event_picker.eyebrow')}</span>
              <EventPicker variant="field" navigateTo={null} />
            </div>
            <div className="w-full sm:w-72">
              <span className="sr-only">{t('catalog.period_label')}</span>
              <DateRangePicker value={range} onChange={handleRangeChange} minDate={getTomorrow()} />
            </div>

            {/* Sort */}
            <div className="relative">
              <label className="sr-only" htmlFor="catalog-sort">
                {t('catalog.sort_label')}
              </label>
              <select
                id="catalog-sort"
                value={sort}
                onChange={(e) => updateParams({ sort: e.target.value })}
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-border bg-card pl-4 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* What the grid is filtered by right now */}
      {(periodLabel || search || selectedCategory || selectedEvent) && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          {mounted && selectedEvent && (
            <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-brand-graphite px-3 py-1.5 font-medium text-white">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('catalog.event_prices_for', { event: selectedEvent.title })}</span>
              <button
                type="button"
                onClick={clearEvent}
                aria-label={t('event_picker.clear')}
                className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          )}
          {periodLabel && (
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary-text">
              {t('catalog.showing_free_on', { dates: periodLabel })}
              <button
                type="button"
                onClick={() => handleRangeChange(undefined)}
                aria-label={t('catalog.period_clear')}
                className="-mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-primary/15"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          )}
          {search && (
            <button
              onClick={() => updateParams({ q: undefined })}
              aria-label={t('catalog.clear_search')}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5"
            >
              &laquo;{search}&raquo;
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          {selectedCategory && (
            <button
              onClick={() => updateParams({ category: undefined })}
              aria-label={`${t('catalog.reset_filters')}: ${getCategoryName(selectedCategory.name, t)}`}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5"
            >
              {getCategoryName(selectedCategory.name, t)}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {showPicks && (picks?.items.length ?? 0) > 0 && (
        <section className="mb-10 rounded-3xl bg-primary-50 p-4 dark:bg-primary/10 sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-primary-text">{t('catalog.picks_eyebrow')}</p>
              <h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">
                {t('catalog.picks_title', { event: selectedEvent?.title ?? '' })}
              </h2>
            </div>
            <Link
              href={`/events/${eventId}`}
              className="hidden shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
            >
              {t('catalog.picks_fair_page')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {picks!.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Products Grid */}
      {productsLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(12)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products?.items.length === 0 ? (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title={t('catalog.nothing_found')}
          description={periodLabel ? t('catalog.nothing_found_for_dates') : t('catalog.nothing_found_desc')}
          action={
            <Button
              onClick={() => {
                handleRangeChange(undefined);
                router.replace('/catalog');
              }}
            >
              {t('catalog.reset_filters')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products?.items.map((product, index) => (
              <Reveal key={product.id} delay={(index % 4) * 0.05}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>

          {/* Pagination */}
          {products && products.meta.totalPages > 1 && (
            <nav className="flex flex-wrap justify-center gap-2 mt-12" aria-label="Pagination">
              {[...Array(products.meta.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => updateParams({ page: String(i + 1) })}
                  aria-current={page === i + 1 ? 'page' : undefined}
                  className={cn(
                    'h-10 w-10 rounded-xl text-sm font-medium transition-colors',
                    page === i + 1
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense>
      <CatalogPageContent />
    </Suspense>
  );
}
