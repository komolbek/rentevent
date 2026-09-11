'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Button, Card, EmptyState, QuantitySelector, ConfirmModal } from '@/components/ui';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { formatPrice } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function CartPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, subtotal, totalSavings, deliveryFee, total, removeItem, updateItem, clearCart } =
    useCartStore();
  const [confirmClear, setConfirmClear] = useState(false);

  const handleQuantityChange = (productId: string, quantity: number) => {
    updateItem(productId, { quantity });
  };

  const handleRemoveItem = (productId: string, productName: string) => {
    removeItem(productId);
    toast.success(t('cart.removed', { name: productName }));
  };

  const handleCheckout = () => {
    // Check localStorage directly to avoid hydration timing issues
    let authed = isAuthenticated;
    if (!authed && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
          const parsed = JSON.parse(raw);
          authed = !!parsed?.state?.token;
        }
      } catch {}
    }
    if (!authed) {
      toast.error(t('cart.login_for_checkout'));
      // Come back to checkout after login instead of landing on the home page.
      router.push('/auth?redirect=/checkout');
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={<ShoppingCart className="h-16 w-16" />}
          title={t('cart.empty_title')}
          description={t('cart.empty_description')}
          action={
            <Link href="/catalog">
              <Button size="lg" variant="gradient">
                {t('cart.go_to_catalog')}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-8"
      >
        {t('cart.title')}
      </motion.h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div
                key={item.productId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link
                      href={`/product/${item.productId}`}
                      className="shrink-0 h-24 w-24 rounded-xl overflow-hidden bg-muted"
                    >
                      {item.product.photos[0] ? (
                        <img
                          src={item.product.photos[0]}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.productId}`}
                        className="font-medium hover:text-primary-text transition-colors line-clamp-2"
                      >
                        {item.product.name}
                      </Link>

                      <div className="mt-1 text-sm text-muted-foreground">
                        {format(new Date(item.rentalStartDate), 'd MMM', { locale: ru })} —{' '}
                        {format(new Date(item.rentalEndDate), 'd MMM', { locale: ru })} •{' '}
                        {item.rentalDays} {t('cart.days')}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        {/* Quantity */}
                        <QuantitySelector
                          value={item.quantity}
                          onChange={(qty) => handleQuantityChange(item.productId, qty)}
                          min={1}
                          max={item.product.totalStock}
                          size="sm"
                        />

                        {/* Remove */}
                        <button
                          onClick={() => handleRemoveItem(item.productId, item.product.name)}
                          aria-label={`${t('cart.remove_item')}: ${item.product.name}`}
                          title={t('cart.remove_item')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">{t('common.delete')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">
                        {formatPrice(item.totalPrice)} UZS
                      </p>
                      {item.savings > 0 && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          -{formatPrice(item.savings)} UZS
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Clear Cart */}
          <div className="flex justify-end">
            <button
              onClick={() => setConfirmClear(true)}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              {t('cart.clear')}
            </button>
          </div>
          <ConfirmModal
            isOpen={confirmClear}
            onClose={() => setConfirmClear(false)}
            onConfirm={() => {
              clearCart();
              setConfirmClear(false);
            }}
            title={t('cart.clear_confirm_title')}
            message={t('cart.clear_confirm_message')}
            confirmText={t('cart.clear')}
            variant="destructive"
          />
        </div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <Card className="p-6 sticky top-24">
            <h2 className="font-semibold text-lg mb-4">{t('cart.order_summary')}</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('cart.items_count', { count: items.length })}</span>
                <span>{formatPrice(subtotal)} UZS</span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>{t('cart.discount')}</span>
                  <span>-{formatPrice(totalSavings)} UZS</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('cart.delivery')}</span>
                <span>{deliveryFee > 0 ? `${formatPrice(deliveryFee)} UZS` : t('cart.free')}</span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                <span>{t('cart.total')}</span>
                <span className="text-primary-text">{formatPrice(total)} UZS</span>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              size="lg"
              variant="gradient"
              className="w-full"
              rightIcon={<ArrowRight className="h-5 w-5" />}
            >
              {t('cart.checkout')}
            </Button>

            <p className="mt-4 text-xs text-center text-muted-foreground">
              {t('cart.free_delivery_note')}
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
