'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Calendar,
  Package,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { productsApi } from '@/lib/website/api';
import type { Product } from '@/lib/website/types';
import { formatPrice, calculatePrice, calculateRentalDays, getTomorrow, addDays, cn } from '@/lib/website/utils';
import { useLanguageStore } from '@/stores/languageStore';
import { useCartStore } from '@/stores/cartStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useAuthStore } from '@/stores/authStore';
import { Button, Card, Badge } from '@/components/website/ui';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const { t } = useLanguageStore();
  const { addItem } = useCartStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState<Date>(getTomorrow());
  const [endDate, setEndDate] = useState<Date>(addDays(getTomorrow(), 2));
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const isFav = product ? isFavorite(product.id) : false;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productsApi.getById(productId);
        setProduct(data);
      } catch (error) {
        console.error('Failed to fetch product:', error);
        toast.error(t.common.error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, t.common.error]);

  const rentalDays = useMemo(() => calculateRentalDays(startDate, endDate), [startDate, endDate]);

  const priceCalculation = useMemo(() => {
    if (!product) return null;
    return calculatePrice(
      product.dailyPrice,
      rentalDays,
      quantity,
      product.pricingTiers || [],
      product.quantityPricing || []
    );
  }, [product, rentalDays, quantity]);

  const handleFavoriteClick = async () => {
    if (!product) return;

    // Wait for hydration before checking auth
    if (!_hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      toast.error(t.favorites.loginRequired);
      return;
    }

    try {
      await toggleFavorite(product);
      toast.success(isFav ? t.favorites.removedFromFavorites : t.favorites.addedToFavorites);
    } catch (error) {
      toast.error(t.favorites.updateError);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (quantity > product.totalStock) {
      toast.error(t.product.notEnoughStock);
      return;
    }

    if (rentalDays < product.minRentalDays) {
      toast.error(`${t.orders.minRentalDays}: ${product.minRentalDays} ${t.product.days}`);
      return;
    }

    if (rentalDays > product.maxRentalDays) {
      toast.error(`${t.orders.maxRentalDays}: ${product.maxRentalDays} ${t.product.days}`);
      return;
    }

    addItem(product, quantity, startDate, endDate);
    setShowSuccessModal(true);
  };

  const nextImage = () => {
    if (product?.photos) {
      setCurrentImageIndex((prev) => (prev + 1) % product.photos.length);
    }
  };

  const prevImage = () => {
    if (product?.photos) {
      setCurrentImageIndex((prev) => (prev - 1 + product.photos.length) % product.photos.length);
    }
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">{t.catalog.noResults}</h1>
          <Link href="/catalog">
            <Button>{t.catalog.title}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const specs = product.specifications || {};
  const hasSpecs = Object.values(specs).some((v) => v !== undefined && v !== null);

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-500 mb-6 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>{t.nav.catalog}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              {product.photos?.[0] ? (
                <Image
                  src={product.photos[currentImageIndex]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-slate-300 dark:text-slate-600" />
                </div>
              )}

              {/* Navigation arrows */}
              {product.photos && product.photos.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    aria-label="Previous image"
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    aria-label="Next image"
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Favorite button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleFavoriteClick}
                aria-label={isFav ? t.favorites.removeFromFavorites : t.favorites.addToFavorites}
                className={cn(
                  'absolute top-4 right-4 h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-colors',
                  isFav
                    ? 'bg-red-500 text-white'
                    : 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100'
                )}
              >
                <Heart className={cn('h-6 w-6', isFav && 'fill-current')} />
              </motion.button>
            </div>

            {/* Thumbnail gallery */}
            {product.photos && product.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'relative h-20 w-20 rounded-lg overflow-hidden shrink-0 border-2 transition-colors',
                      index === currentImageIndex
                        ? 'border-primary-500'
                        : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <Image src={photo} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-3">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <p className="text-2xl font-bold text-primary-500">
                  {formatPrice(product.dailyPrice)} UZS
                  <span className="text-base font-normal text-slate-500 dark:text-slate-400 ml-2">
                    / {t.common.perDay}
                  </span>
                </p>
              </div>
              {/* Stock indicator - modern inline style */}
              <div className="flex items-center gap-2">
                {product.totalStock > 0 ? (
                  <>
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {t.product.inStock} — {product.totalStock} {t.product.pcs}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {t.product.outOfStock}
                    </span>
                  </>
                )}
              </div>

              {/* Rental constraints & deposit info */}
              <div className="flex flex-wrap gap-2 mt-3">
                {product.minRentalDays > 1 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {t.orders.minRentalDays}: {product.minRentalDays} {t.product.days}
                  </span>
                )}
                {product.maxRentalDays < 30 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {t.orders.maxRentalDays}: {product.maxRentalDays} {t.product.days}
                  </span>
                )}
                {product.depositAmount > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {t.orders.depositRequired}: {formatPrice(product.depositAmount)} UZS
                  </span>
                )}
              </div>
            </div>

            {/* Date Selection */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                {t.product.selectDates}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    {t.product.startDate}
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(startDate)}
                    min={formatDateForInput(getTomorrow())}
                    onChange={(e) => {
                      const newStart = new Date(e.target.value);
                      setStartDate(newStart);
                      if (newStart >= endDate) {
                        setEndDate(addDays(newStart, 1));
                      }
                    }}
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    {t.product.endDate}
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(endDate)}
                    min={formatDateForInput(addDays(startDate, 1))}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {rentalDays} {rentalDays === 1 ? t.product.day : t.product.days}
              </p>
            </Card>

            {/* Quantity Selection */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">{t.product.quantity}</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="h-11 w-11 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-xl font-semibold w-12 text-center" aria-live="polite">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.totalStock, q + 1))}
                  disabled={quantity >= product.totalStock}
                  aria-label="Increase quantity"
                  className="h-11 w-11 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </Card>

            {/* Price Summary */}
            {priceCalculation && (
              <Card className="p-4 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t.product.pricePerDay}</span>
                    <span>{formatPrice(priceCalculation.dailyPriceUsed)} UZS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      {quantity} {t.product.pcs} × {rentalDays} {t.product.days}
                    </span>
                  </div>
                  {priceCalculation.savings > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>{t.product.youSave}</span>
                      <span>-{formatPrice(priceCalculation.savings)} UZS</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-primary-200 dark:border-primary-800">
                    <span>{t.product.totalPrice}</span>
                    <span className="text-primary-600 dark:text-primary-400">
                      {formatPrice(priceCalculation.totalPrice)} UZS
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={product.totalStock === 0}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {t.product.addToCart}
            </Button>

            {/* Pricing Tiers */}
            {product.pricingTiers && product.pricingTiers.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">{t.product.pricingTiers}</h3>
                <div className="space-y-2">
                  {product.pricingTiers.map((tier, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600 dark:text-slate-400">
                        {tier.days} {t.product.days}
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatPrice(tier.totalPrice)} UZS
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Quantity Pricing */}
            {product.quantityPricing && product.quantityPricing.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">{t.product.quantityDiscounts}</h3>
                <div className="space-y-2">
                  {product.quantityPricing.map((qp, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600 dark:text-slate-400">
                        {qp.quantity} {t.product.pcs}
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatPrice(qp.totalPrice)} UZS
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Specifications */}
            {hasSpecs && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">{t.product.specifications}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {specs.width && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t.product.width}</span>
                      <span>{specs.width} {t.product.cm}</span>
                    </div>
                  )}
                  {specs.height && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t.product.height}</span>
                      <span>{specs.height} {t.product.cm}</span>
                    </div>
                  )}
                  {specs.depth && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t.product.depth}</span>
                      <span>{specs.depth} {t.product.cm}</span>
                    </div>
                  )}
                  {specs.weight && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t.product.weight}</span>
                      <span>{specs.weight} {t.product.kg}</span>
                    </div>
                  )}
                  {specs.color && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t.product.color}</span>
                      <span>{specs.color}</span>
                    </div>
                  )}
                  {specs.material && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t.product.material}</span>
                      <span>{specs.material}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-6 shadow-lg shadow-green-500/30"
                >
                  <Check className="h-10 w-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-2">{t.product.addedToCart}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 line-clamp-2">{product?.name}</p>
                <div className="flex flex-col gap-3">
                  <Link href="/cart" className="w-full">
                    <Button size="lg" className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {t.product.goToCart}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-14 text-base font-semibold rounded-xl border-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    onClick={() => setShowSuccessModal(false)}
                  >
                    {t.product.continueShopping}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
