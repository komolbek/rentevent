'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  ShoppingCart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Truck,
  Shield,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { DateRange } from 'react-day-picker';
import { productsApi } from '@/lib/api';
import {
  Button,
  Card,
  Badge,
  ProductDetailSkeleton,
  QuantitySelector,
  DateRangePicker,
} from '@/components/ui';
import { ProductCard } from '@/components/catalog/ProductCard';
import {
  formatPrice,
  calculatePrice,
  calculateRentalDays,
  getTomorrow,
  addDays,
  cn,
} from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useRentalPeriodStore, getStoredPeriod } from '@/stores/rental-period-store';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { localizedName, localizedDescription } from '@/lib/i18n/product';

export default function ProductDetailPage() {
  const { t, locale } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const setRentalPeriod = useRentalPeriodStore((s) => s.setPeriod);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: getTomorrow(),
    to: addDays(getTomorrow(), 0),
  });

  // Adopt the period the visitor already chose on the home page so they don't
  // re-pick dates on every product. Applied after mount, not in the initial
  // state, because the persisted store is empty during SSR — reading it while
  // rendering would make the server and client markup disagree.
  useEffect(() => {
    const stored = getStoredPeriod();
    if (stored.from) setDateRange({ from: stored.from, to: stored.to ?? stored.from });
  }, []);

  const handleDateRangeChange = (next: DateRange | undefined) => {
    setDateRange(next);
    setRentalPeriod(next?.from, next?.to);
  };

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ['products', 'related', product?.categoryId],
    queryFn: () =>
      productsApi.getAll({ category_id: product?.categoryId, limit: 4 }),
    enabled: !!product?.categoryId,
  });

  const isFav = product ? isFavorite(product.id) : false;

  // Calculate pricing with useMemo to ensure recalculation on date/quantity change
  const rentalDays = useMemo(() => {
    return dateRange?.from && dateRange?.to
      ? calculateRentalDays(dateRange.from, dateRange.to)
      : 1;
  }, [dateRange]);

  const priceInfo = useMemo(() => {
    return product
      ? calculatePrice(
          product.dailyPrice,
          rentalDays,
          quantity,
          product.pricingTiers,
          product.quantityPricing
        )
      : { totalPrice: 0, dailyPriceUsed: 0, savings: 0 };
  }, [product, rentalDays, quantity]);

  const handleAddToCart = () => {
    if (!product || !dateRange?.from || !dateRange?.to) {
      toast.error(t('product.select_dates'));
      return;
    }

    addItem(product, quantity, dateRange.from, dateRange.to);
    toast.success(t('product.added_to_cart'));
  };

  const handleFavoriteToggle = async () => {
    if (!product) return;

    if (!isAuthenticated) {
      toast.error(t('product_card.login_for_favorites'));
      return;
    }

    try {
      await toggleFavorite(product.id);
      toast.success(isFav ? t('product_card.removed_from_favorites') : t('product_card.added_to_favorites'));
    } catch (error) {
      toast.error(t('product_card.favorites_error'));
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product?.name,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t('product.link_copied'));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('product.not_found')}</h1>
        <Button onClick={() => router.push('/catalog')}>{t('product.back_to_catalog')}</Button>
      </div>
    );
  }

  const name = localizedName(product, locale);
  const description = localizedDescription(product, locale);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <Link href="/catalog" className="hover:text-primary-text transition-colors">
          {t('product.catalog')}
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <Link
              href={`/catalog?category=${product.categoryId}`}
              className="hover:text-primary-text transition-colors"
            >
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground truncate">{name}</span>
      </motion.nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Main Image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedImageIndex}
                src={product.photos[selectedImageIndex] || '/placeholder.png'}
                alt={name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full object-cover"
              />
            </AnimatePresence>

            {/* Navigation Arrows */}
            {product.photos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setSelectedImageIndex((prev) =>
                      prev === 0 ? product.photos.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() =>
                    setSelectedImageIndex((prev) =>
                      prev === product.photos.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.totalStock === 0 && (
                <Badge variant="destructive">{t('product_card.out_of_stock')}</Badge>
              )}
              {product.totalStock > 0 && product.totalStock <= 3 && (
                <Badge variant="warning">{t('product_card.remaining', { count: product.totalStock })}</Badge>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {product.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {product.photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    'shrink-0 h-20 w-20 rounded-xl overflow-hidden border-2 transition-all',
                    selectedImageIndex === index
                      ? 'border-primary'
                      : 'border-transparent hover:border-border'
                  )}
                >
                  <img
                    src={photo}
                    alt={`${name} ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Product Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Title & Actions */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">{name}</h1>
              {product.category && (
                <Link
                  href={`/catalog?category=${product.categoryId}`}
                  className="text-muted-foreground hover:text-primary-text transition-colors"
                >
                  {product.category.name}
                </Link>
              )}
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFavoriteToggle}
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
                  isFav
                    ? 'bg-red-500 text-white'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                <Heart className={cn('h-5 w-5', isFav && 'fill-current')} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="h-10 w-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              >
                <Share2 className="h-5 w-5" />
              </motion.button>
            </div>
          </div>

          {/* Price */}
          <Card className="p-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(priceInfo.totalPrice)} UZS
              </span>
              {priceInfo.savings > 0 && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.dailyPrice * rentalDays * quantity)} UZS
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {t('product.price_breakdown', { price: formatPrice(priceInfo.dailyPriceUsed), days: rentalDays, qty: quantity })}
            </p>
            {priceInfo.savings > 0 && (
              <p className="text-green-600 dark:text-green-400 font-medium mt-1">
                {t('product.savings', { amount: formatPrice(priceInfo.savings) })}
              </p>
            )}
          </Card>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('product.rental_dates')}</label>
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              minDate={getTomorrow()}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('product.quantity')}</label>
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={product.totalStock}
              size="lg"
            />
          </div>

          {/* Add to Cart */}
          <Button
            onClick={handleAddToCart}
            disabled={product.totalStock === 0}
            size="lg"
            variant="gradient"
            className="w-full h-14"
            leftIcon={<ShoppingCart className="h-5 w-5" />}
          >
            {product.totalStock === 0 ? t('product_card.out_of_stock') : t('product.add_to_cart')}
          </Button>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Truck className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">{t('product.delivery_tashkent')}</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">{t('product.quality_guarantee')}</span>
            </div>
          </div>

          {/* Specifications */}
          {(product.specWidth || product.specHeight || product.specDepth || product.specWeight || product.specColor || product.specMaterial) && (
            <div>
              <h3 className="font-semibold mb-3">{t('product.specifications')}</h3>
              <Card className="divide-y divide-border">
                {product.specWidth && (
                  <div className="flex justify-between py-3 px-4">
                    <span className="text-muted-foreground">{t('product.width')}</span>
                    <span>{product.specWidth} {t('product.cm')}</span>
                  </div>
                )}
                {product.specHeight && (
                  <div className="flex justify-between py-3 px-4">
                    <span className="text-muted-foreground">{t('product.height')}</span>
                    <span>{product.specHeight} {t('product.cm')}</span>
                  </div>
                )}
                {product.specDepth && (
                  <div className="flex justify-between py-3 px-4">
                    <span className="text-muted-foreground">{t('product.depth')}</span>
                    <span>{product.specDepth} {t('product.cm')}</span>
                  </div>
                )}
                {product.specWeight && (
                  <div className="flex justify-between py-3 px-4">
                    <span className="text-muted-foreground">{t('product.weight')}</span>
                    <span>{product.specWeight} {t('product.kg')}</span>
                  </div>
                )}
                {product.specColor && (
                  <div className="flex justify-between py-3 px-4">
                    <span className="text-muted-foreground">{t('product.color')}</span>
                    <span>{product.specColor}</span>
                  </div>
                )}
                {product.specMaterial && (
                  <div className="flex justify-between py-3 px-4">
                    <span className="text-muted-foreground">{t('product.material')}</span>
                    <span>{product.specMaterial}</span>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Pricing Tiers */}
          {product.pricingTiers.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">{t('product.discount_tiers')}</h3>
              <Card className="divide-y divide-border">
                {product.pricingTiers.map((tier) => (
                  <div key={tier.id} className="flex justify-between py-3 px-4">
                    <span className="text-muted-foreground">
                      {t('product.days_plus', { count: tier.days })}
                    </span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatPrice(tier.totalPrice / tier.days)} {t('product.per_day')}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </motion.div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.items.length > 1 && (
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold mb-6">{t('product.related')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.items
              .filter((p) => p.id !== product.id)
              .slice(0, 4)
              .map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
