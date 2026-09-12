'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, Grid3X3, LayoutList } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ru as ruLocale } from 'date-fns/locale';
import { categoriesApi, productsApi } from '@/lib/api';
import { useRentalPeriodStore, getStoredPeriod } from '@/stores/rental-period-store';
import { Button, ProductCardSkeleton, EmptyState, DateRangePicker } from '@/components/ui';
import { formatDateForAPI, getTomorrow } from '@/lib/utils';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CategoryIcon } from '@/lib/categoryIcon';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

function getSortOptions(t: (key: string) => string) {
  return [
    { value: 'newest', label: t('catalog.sort_newest') },
    { value: 'popular', label: t('catalog.sort_popular') },
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categoryId = searchParams.get('category') || undefined;
  const search = searchParams.get('q') || undefined;
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', locale],
    queryFn: categoriesApi.getAll,
  });

  // Rental period — a real filter: the API drops products with no free unit
  // on any day of the range and reports free units for the rest. Shared with
  // the product page and the sets dialog through the rental-period store, so
  // dates picked here follow the visitor around the site. The persisted
  // store is empty during SSR, so it is read after mount.
  const setPeriod = useRentalPeriodStore((s) => s.setPeriod);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const stored = getStoredPeriod();
    if (stored.from) setRange({ from: stored.from, to: stored.to ?? stored.from });
    setMounted(true);
  }, []);

  const handleRangeChange = (next: DateRange | undefined) => {
    setRange(next);
    setPeriod(next?.from, next?.to);
  };

  const periodParams =
    range?.from && range?.to
      ? { start_date: formatDateForAPI(range.from), end_date: formatDateForAPI(range.to) }
      : {};

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', categoryId, search, sort, page, periodParams.start_date, periodParams.end_date],
    queryFn: () =>
      productsApi.getAll({
        category_id: categoryId,
        search,
        sort: sort as 'newest' | 'popular' | 'price_asc' | 'price_desc',
        page,
        limit: 12,
        ...periodParams,
      }),
    // Wait for the stored period so the first fetch is already the right one.
    enabled: mounted,
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

  const periodLabel =
    range?.from && range?.to
      ? `${format(range.from, 'd MMM', { locale: ruLocale })} — ${format(range.to, 'd MMM yyyy', { locale: ruLocale })}`
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
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-2"
        >
          {selectedCategory ? getCategoryName(selectedCategory.name, t) : search ? t('catalog.search_prefix', { query: search }) : t('catalog.title')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          {products?.meta.total !== undefined && !productsLoading
            ? periodLabel
              ? t('catalog.products_available_count', { count: products.meta.total, dates: periodLabel })
              : t('catalog.products_count', { count: products.meta.total })
            : t('catalog.loading')}
        </motion.p>
      </div>

      {/* Categories Horizontal Scroll */}
      {!search && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mb-8 -mx-4 px-4"
        >
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
              'pointer-events-none absolute inset-y-0 right-4 z-10 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-200',
              chipFade.right ? 'opacity-100' : 'opacity-0',
            )}
          />
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
        </motion.div>
      )}

      {/* Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center justify-between gap-4 mb-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Rental period filter */}
          <div className="w-full sm:w-72">
            <span className="sr-only">{t('catalog.period_label')}</span>
            <DateRangePicker value={range} onChange={handleRangeChange} minDate={getTomorrow()} />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="appearance-none h-10 pl-4 pr-10 rounded-xl border border-border bg-card text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Active Filters */}
          {search && (
            <button
              onClick={() => updateParams({ q: undefined })}
              aria-label={t('catalog.clear_search')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary-text text-sm"
            >
              &laquo;{search}&raquo;
              <span aria-hidden="true">×</span>
            </button>
          )}
          {selectedCategory && (
            <button
              onClick={() => updateParams({ category: undefined })}
              aria-label={`${t('catalog.reset_filters')}: ${getCategoryName(selectedCategory.name, t)}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary-text text-sm"
            >
              {getCategoryName(selectedCategory.name, t)}
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted" role="group" aria-label={`${t('catalog.grid_view')} / ${t('catalog.list_view')}`}>
          <button
            onClick={() => setViewMode('grid')}
            title={t('catalog.grid_view')}
            aria-label={t('catalog.grid_view')}
            aria-pressed={viewMode === 'grid'}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-lg transition-colors',
              viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:bg-card/50'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title={t('catalog.list_view')}
            aria-label={t('catalog.list_view')}
            aria-pressed={viewMode === 'list'}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-lg transition-colors',
              viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:bg-card/50'
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Products Grid */}
      {productsLoading ? (
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'grid'
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1'
          )}
        >
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              'grid gap-4',
              viewMode === 'grid'
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1'
            )}
          >
            <AnimatePresence mode="popLayout">
              {products?.items.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard product={product} variant={viewMode} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Pagination */}
          {products && products.meta.totalPages > 1 && (
            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap justify-center gap-2 mt-12"
              aria-label="Pagination"
            >
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
            </motion.nav>
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
