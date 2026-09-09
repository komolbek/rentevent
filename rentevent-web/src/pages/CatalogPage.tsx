import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ChevronDown, Grid3X3, LayoutList } from 'lucide-react';
import { categoriesApi, productsApi } from '@/lib/api';
import { Button, ProductCardSkeleton, EmptyState } from '@/components/ui';
import { ProductCard } from '@/components/catalog/ProductCard';
import { cn } from '@/lib/utils';

const sortOptions = [
  { value: 'newest', label: 'Сначала новые' },
  { value: 'popular', label: 'По популярности' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
];

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categoryId = searchParams.get('category') || undefined;
  const search = searchParams.get('q') || undefined;
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
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

  const selectedCategory = categories?.find((c) => c.id === categoryId);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
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
    setSearchParams(newParams);
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
          {selectedCategory ? selectedCategory.name : search ? `Поиск: "${search}"` : 'Каталог'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          {products?.total
            ? `${products.total} товаров`
            : 'Загрузка...'}
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
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              Все
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
                    {category.icon && <span>{category.icon}</span>}
                    {category.name}
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
          {selectedCategory && (
            <button
              onClick={() => updateParams({ category: undefined })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
            >
              {selectedCategory.name}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid' ? 'bg-card shadow-sm' : 'hover:bg-card/50'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'list' ? 'bg-card shadow-sm' : 'hover:bg-card/50'
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
          title="Ничего не найдено"
          description="Попробуйте изменить параметры поиска или выбрать другую категорию"
          action={
            <Button onClick={() => setSearchParams({})}>
              Сбросить фильтры
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
                  <ProductCard product={product} />
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
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
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
