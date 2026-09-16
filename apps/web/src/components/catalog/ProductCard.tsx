'use client';

import Image from 'next/image';
import { memo, useCallback } from 'react';
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
}

export const ProductCard = memo(function ProductCard({ product, className }: ProductCardProps) {
  const { isAuthenticated } = useAuthStore();
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const { t, locale } = useTranslation();
  const name = localizedName(product, locale);
  // When the catalog was asked for a rental period the API reports units free
  // for that period; otherwise fall back to the total stock.
  const stock = product.availableStock ?? product.totalStock;

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

  return (
    <Link
      href={`/product/${product.id}`}
      aria-label={`${name} - ${formatPrice(product.dailyPrice)} ${t('common.currency')} ${t('product_card.per_day')}`}
    >
      <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
        <Card hover className={cn('overflow-hidden group', className)}>
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {product.photos[0] ? (
              <Image
                src={product.photos[0]}
                alt={name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
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
              {stock <= 3 && stock > 0 && (
                <Badge variant="warning" size="sm">
                  {t('product_card.remaining', { count: stock })}
                </Badge>
              )}
              {stock === 0 && (
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

            {/* One line, no eyebrow: "300 000 сум / день" (spec §3.5). */}
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-base font-semibold text-foreground">
                {formatPrice(product.dailyPrice)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {t('common.currency')} / {t('product_card.per_day')}
                </span>
              </p>

              {/* The whole card is the link, so no "Подробнее" button (Krug:
                  needless choice). A quiet arrow appears on hover, desktop
                  only — phones have no hover and no room. */}
              <span
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:inline-flex"
                aria-hidden="true"
              >
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  );
});
