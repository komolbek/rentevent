'use client';

import { useState, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import type { Product } from '@/lib/website/types';
import { Card, Badge } from '@/components/website/ui';
import { formatPrice, cn } from '@/lib/website/utils';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { toast } from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  className?: string;
  variant?: 'grid' | 'list';
}

export const ProductCard = memo(function ProductCard({ product, className, variant = 'grid' }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { t } = useLanguageStore();

  const isFav = isFavorite(product.id);
  const hasDiscount = (product.pricingTiers?.length ?? 0) > 0 || (product.quantityPricing?.length ?? 0) > 0;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Wait for hydration before checking auth - if not hydrated yet, just return silently
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

  if (variant === 'list') {
    return (
      <Link href={`/product/${product.id}`}>
        <Card hover className={cn('overflow-hidden group', className)}>
          <div className="flex gap-4 p-3">
            {/* Compact Image */}
            <div className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
              {product.photos?.[0] ? (
                <Image
                  src={product.photos![0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-xl font-bold text-slate-300 dark:text-slate-600">
                    {product.name.charAt(0)}
                  </span>
                </div>
              )}
              {product.totalStock === 0 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Badge variant="destructive" size="sm">{t.common.notAvailable}</Badge>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h3 className="font-medium line-clamp-1 group-hover:text-primary-500 transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {hasDiscount && (
                    <Badge variant="success" size="sm">{t.common.discount}</Badge>
                  )}
                  {product.totalStock <= 3 && product.totalStock > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {product.totalStock} {t.common.itemsLeft}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-lg font-bold text-primary-500">
                    {formatPrice(product.dailyPrice)} UZS
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">/ {t.common.perDay}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleFavoriteClick}
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center transition-colors',
                    isFav ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700'
                  )}
                >
                  <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
                </motion.button>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/product/${product.id}`}>
      <motion.div
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.98 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card hover className={cn('overflow-hidden group', className)}>
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
            {product.photos?.[0] ? (
              <motion.div
                className="h-full w-full"
                animate={{ scale: isHovered ? 1.05 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <Image
                  src={product.photos![0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
              </motion.div>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700">
                <span className="text-4xl font-bold text-slate-300 dark:text-slate-600">
                  {product.name.charAt(0)}
                </span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {hasDiscount && (
                <Badge variant="success" size="sm">
                  {t.common.discount}
                </Badge>
              )}
              {product.totalStock <= 3 && product.totalStock > 0 && (
                <Badge variant="warning" size="sm">
                  {product.totalStock} {t.common.itemsLeft}
                </Badge>
              )}
              {product.totalStock === 0 && (
                <Badge variant="destructive" size="sm">
                  {t.common.notAvailable}
                </Badge>
              )}
            </div>

            {/* Favorite Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isHovered || isFav ? 1 : 0, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFavoriteClick}
              aria-label={isFav ? t.favorites.removeFromFavorites : t.favorites.addToFavorites}
              className={cn(
                'absolute top-3 right-3 h-11 w-11 rounded-full flex items-center justify-center transition-colors',
                isFav
                  ? 'bg-red-500 text-white'
                  : 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800'
              )}
            >
              <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
            </motion.button>

            {/* Quick View Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              className="absolute inset-0 bg-black/20 flex items-center justify-center"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: isHovered ? 0 : 20, opacity: isHovered ? 1 : 0 }}
                className="flex gap-2"
              >
                <span className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg">
                  <Eye className="h-5 w-5" />
                </span>
              </motion.div>
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary-500 transition-colors">
              {product.name}
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-primary-500">
                  {formatPrice(product.dailyPrice)} UZS
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.common.perDay}</p>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                role="img"
                aria-label={t.product.addToCart}
                className="h-11 w-11 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 hover:bg-primary-500 hover:text-white transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  );
});
