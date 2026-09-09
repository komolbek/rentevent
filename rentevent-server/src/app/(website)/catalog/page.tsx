'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  X,
  ChevronDown,
  Monitor,
  Tv,
  Flower2,
  Armchair,
  Sofa,
  Lamp,
  Music,
  UtensilsCrossed,
  PartyPopper,
  Tent,
  Camera,
  Wine,
  ChefHat,
  Table,
  Sparkles,
  Grid3X3,
  LayoutList,
  type LucideIcon
} from 'lucide-react';
import { categoriesApi, productsApi } from '@/lib/website/api';
import { Button, ProductCardSkeleton, EmptyState } from '@/components/website/ui';
import { ProductCard } from '@/components/website/catalog';
import { cn } from '@/lib/website/utils';
import { useLanguageStore } from '@/stores/languageStore';

// Icon name to component mapping
const iconMap: Record<string, LucideIcon> = {
  monitor: Monitor,
  tv: Tv,
  television: Tv,
  flower: Flower2,
  flower2: Flower2,
  sprout: Flower2,
  armchair: Armchair,
  chair: Armchair,
  sofa: Sofa,
  couch: Sofa,
  lamp: Lamp,
  light: Lamp,
  music: Music,
  audio: Music,
  sound: Music,
  utensils: UtensilsCrossed,
  food: UtensilsCrossed,
  catering: UtensilsCrossed,
  party: PartyPopper,
  celebration: PartyPopper,
  tent: Tent,
  outdoor: Tent,
  camera: Camera,
  photo: Camera,
  wine: Wine,
  drinks: Wine,
  bar: Wine,
  chef: ChefHat,
  kitchen: ChefHat,
  table: Table,
  furniture: Table,
  sparkles: Sparkles,
  decor: Sparkles,
  decoration: Sparkles,
};

function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  if (!name) return null;
  const IconComponent = iconMap[name.toLowerCase()];
  if (!IconComponent) return null;
  return <IconComponent className={className || 'h-4 w-4'} />;
}

// Helper to get translated category name
function getCategoryName(name: string, categoryNames: Record<string, string>): string {
  return categoryNames[name] || name;
}

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, locale } = useLanguageStore();

  const categoryId = searchParams?.get('category') || undefined;
  const search = searchParams?.get('q') || undefined;
  const sort = searchParams?.get('sort') || 'newest';
  const page = parseInt(searchParams?.get('page') || '1');

  const sortOptions = [
    { value: 'newest', label: t.catalog.sort.newest },
    { value: 'popular', label: t.catalog.sort.popular },
    { value: 'price_asc', label: t.catalog.sort.priceAsc },
    { value: 'price_desc', label: t.catalog.sort.priceDesc },
  ];

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', locale],
    queryFn: categoriesApi.getAll,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', categoryId, search, sort, page],
    queryFn: () =>
      productsApi.getAll({
        category_id: categoryId,
        search,
        sort,
        page,
        limit: 12,
      }),
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const selectedCategory = categories?.find((c) => c.id === categoryId);
  const selectedCategoryName = selectedCategory ? getCategoryName(selectedCategory.name, t.catalog.categoryNames) : undefined;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams?.toString() || '');
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
    router.push(`/catalog?${newParams.toString()}`);
  };

  const getTitle = () => {
    if (selectedCategoryName) return selectedCategoryName;
    if (search) return t.catalog.searchResults.replace('{query}', search);
    return t.catalog.title;
  };

  const getProductsCount = () => {
    if (products?.total) {
      return t.catalog.productsCount.replace('{count}', String(products.total));
    }
    return t.common.loading;
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
          {getTitle()}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 dark:text-slate-400"
        >
          {getProductsCount()}
        </motion.p>
      </div>

      {/* Categories Horizontal Scroll */}
      {!search && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 -mx-4 px-4"
        >
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => updateParams({ category: undefined })}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
                !categoryId
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {t.common.all}
            </button>
            {categoriesLoading
              ? [...Array(6)].map((_, i) => (
                  <div key={i} className="shrink-0 h-9 w-24 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))
              : categories?.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => updateParams({ category: category.id })}
                    className={cn(
                      'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2',
                      categoryId === category.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    <CategoryIcon name={category.icon} className="h-4 w-4" />
                    {getCategoryName(category.name, t.catalog.categoryNames)}
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
        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="appearance-none h-10 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Active Filters */}
          {selectedCategory && (
            <button
              onClick={() => updateParams({ category: undefined })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-500/10 text-primary-500 text-sm"
            >
              {selectedCategoryName}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>

      </motion.div>

      {/* Products Grid */}
      {productsLoading ? (
        <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1')}>
          {[...Array(12)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products?.items.length === 0 ? (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title={t.catalog.noResults}
          description={t.catalog.noResultsDescription}
          action={
            <Button onClick={() => router.push('/catalog')}>
              {t.catalog.clearFilters}
            </Button>
          }
        />
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1')}
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
          {products && products.totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center gap-2 mt-12"
            >
              {[...Array(products.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => updateParams({ page: String(i + 1) })}
                  className={cn(
                    'h-10 w-10 rounded-xl text-sm font-medium transition-colors',
                    page === i + 1
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
