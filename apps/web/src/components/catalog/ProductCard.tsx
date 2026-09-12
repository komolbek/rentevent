'use client';

import { useState, memo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ArrowUpRight } from 'lucide-react';
import type { Product } from '@/types';
import { Card, Badge } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { localizedName } from '@/lib/i18n/product';

interface ProductCardProps {
  product: Product;
  className?: string;
  variant?: 'grid' | 'list';
}

export const ProductCard = memo(function ProductCard({ product, className, variant = 'grid' }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const { t, locale } = useTranslation();
  const name = localizedName(product, locale);

  const isFav = isFavorite(product.id);
  const hasDiscount = (product.pricingTiers?.length ?? 0) > 0 || (product.quantityPricing?.length ?? 0) > 0;

  const handleFavoriteClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error(t('product_card.login_for_favorites'));
      return;
    }

    try {
      if (isFav) {
        removeFavorite(product.id);
      } else {
        addFavorite(product.id);
      }
      toast.success(isFav ? t('product_card.removed_from_favorites') : t('product_card.added_to_favorites'));
    } catch (error) {
      toast.error(t('product_card.favorites_error'));
    }
  }, [isAuthenticated, isFav, product.id, addFavorite, removeFavorite, t]);

  if (variant === 'list') {
    return (
      <Link href={`/product/${product.id}`}>
        <Card hover className={cn('overflow-hidden group', className)}>
          <div className="flex gap-4 p-3">
            <div className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden bg-muted">
              {product.photos[0] ? (
                <img src={product.photos[0]} alt={name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-xl font-bold text-muted-foreground/30">{name.charAt(0)}</span>
                </div>
              )}
              {product.totalStock === 0 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Badge variant="destructive" size="sm">{t('product_card.out_of_stock')}</Badge>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h3 className="font-medium line-clamp-1 group-hover:text-primary-text transition-colors">{name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {hasDiscount && <Badge variant="success" size="sm">{t('product_card.discount')}</Badge>}
                  {product.totalStock <= 3 && product.totalStock > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">{t('product_card.remaining', { count: product.totalStock })}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-lg font-bold text-primary">{formatPrice(product.dailyPrice)} {t('common.currency')}</span>
                  <span className="text-xs text-muted-foreground ml-1">/ {t('product_card.per_day')}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleFavoriteClick}
                  aria-label={isFav ? t('product_card.remove_from_favorites') : t('product_card.add_to_favorites')}
                  aria-pressed={isFav}
                  className={cn('h-9 w-9 rounded-full flex items-center justify-center transition-colors', isFav ? 'bg-red-500 text-white' : 'bg-muted')}
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
    <Link
      href={`/product/${product.id}`}
      aria-label={`${name} - ${formatPrice(product.dailyPrice)} ${t('common.currency')} ${t('product_card.per_day')}`}
    >
      <motion.div
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.98 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card hover className={cn('overflow-hidden group', className)}>
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {product.photos[0] ? (
              <motion.img
                src={product.photos[0]}
                alt={name}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                animate={{ scale: isHovered ? 1.05 : 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50" role="img" aria-label={name}>
                <span className="text-4xl font-bold text-muted-foreground/30">
                  {name.charAt(0)}
                </span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {hasDiscount && (
                <Badge variant="success" size="sm">
                  {t('product_card.discount')}
                </Badge>
              )}
              {product.totalStock <= 3 && product.totalStock > 0 && (
                <Badge variant="warning" size="sm">
                  {t('product_card.remaining', { count: product.totalStock })}
                </Badge>
              )}
              {product.totalStock === 0 && (
                <Badge variant="destructive" size="sm">
                  {t('product_card.out_of_stock')}
                </Badge>
              )}
            </div>

            {/* Favorite button — always visible, so it exists on touch
                screens too (a hover-only control is invisible on a phone). */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFavoriteClick}
              aria-label={isFav ? t('product_card.remove_from_favorites') : t('product_card.add_to_favorites')}
              aria-pressed={isFav}
              className={cn(
                'absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center shadow-sm transition-colors',
                isFav
                  ? 'bg-red-500 text-white'
                  : 'bg-card/90 text-foreground/70 hover:bg-card hover:text-foreground'
              )}
            >
              <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-medium leading-snug line-clamp-2 mb-3 min-h-[2.6em] group-hover:text-primary-text transition-colors">
              {name}
            </h3>

            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="eyebrow whitespace-nowrap text-muted-foreground mb-1.5">{t('product_card.per_day')}</p>
                <p className="text-lg font-semibold text-foreground truncate">
                  {formatPrice(product.dailyPrice)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{t('common.currency')}</span>
                </p>
              </div>

              {/* The whole card is the link; this is the "go" affordance,
                  not a cart button — a cart icon here promised a one-click
                  add that the card never did (dates are chosen on the
                  product page). Same arrow chip as the category tiles. */}
              {/* Two cards share a 375px phone screen, and even an arrow-only
                  chip leaves the price ~87px and clips it. Below md the card
                  itself (image + name + price) is the affordance. */}
              <span
                className="hidden h-9 shrink-0 items-center gap-1 rounded-full bg-muted pl-3 pr-2 text-xs font-medium text-foreground/80 transition-colors group-hover:bg-primary group-hover:text-white md:inline-flex"
                aria-hidden="true"
              >
                {t('product_card.view')}
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  );
});
