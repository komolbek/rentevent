import { useState, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import type { Product } from '@/types';
import { Card, Badge } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export const ProductCard = memo(function ProductCard({ product, className }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { t } = useTranslation();

  const isFav = isFavorite(product.id);
  const hasDiscount = product.pricingTiers.length > 0 || product.quantityPricing.length > 0;

  const handleFavoriteClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error(t('product_card.login_for_favorites'));
      return;
    }

    try {
      await toggleFavorite(product);
      toast.success(isFav ? t('product_card.removed_from_favorites') : t('product_card.added_to_favorites'));
    } catch (error) {
      toast.error(t('product_card.favorites_error'));
    }
  }, [isAuthenticated, isFav, product, toggleFavorite, t]);

  return (
    <Link
      to={`/product/${product.id}`}
      aria-label={`${product.name} - ${formatPrice(product.dailyPrice)} UZS ${t('product_card.per_day')}`}
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
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                animate={{ scale: isHovered ? 1.05 : 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50" role="img" aria-label={product.name}>
                <span className="text-4xl font-bold text-muted-foreground/30">
                  {product.name.charAt(0)}
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

            {/* Favorite Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isHovered || isFav ? 1 : 0, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFavoriteClick}
              aria-label={isFav ? t('product_card.remove_from_favorites') : t('product_card.add_to_favorites')}
              aria-pressed={isFav}
              className={cn(
                'absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center transition-colors',
                isFav
                  ? 'bg-red-500 text-white'
                  : 'bg-white/90 dark:bg-slate-800/90 text-foreground hover:bg-white dark:hover:bg-slate-800'
              )}
            >
              <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
            </motion.button>

            {/* Quick View Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              className="absolute inset-0 bg-black/20 flex items-center justify-center"
              aria-hidden="true"
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
            <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-primary">
                  {formatPrice(product.dailyPrice)} UZS
                </p>
                <p className="text-xs text-muted-foreground">{t('product_card.per_day')}</p>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                role="img"
                aria-label={t('product_card.add_to_cart')}
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
