'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Calendar,
  Package,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useLanguageStore } from '@/stores/languageStore';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice, formatDateShort, cn } from '@/lib/website/utils';
import { Button, Card } from '@/components/website/ui';

export default function CartPage() {
  const router = useRouter();
  const { t } = useLanguageStore();
  const { items, subtotal, totalSavings, total, deliveryFee, removeItem, updateItem, clearCart } = useCartStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateItem(productId, { quantity: newQuantity });
  };

  const handleRemoveItem = (productId: string) => {
    removeItem(productId);
    toast.success(t.cart.remove);
  };

  const handleCheckout = () => {
    // Wait for auth hydration before checking
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth?from=/checkout');
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="h-24 w-24 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
            <ShoppingCart className="h-12 w-12 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t.cart.empty}</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{t.cart.emptyDescription}</p>
          <Link href="/catalog">
            <Button size="lg">{t.cart.goToCatalog}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t.cart.title}</h1>
        <button
          onClick={() => {
            clearCart();
            toast.success(t.cart.clearCart);
          }}
          className="text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          {t.cart.clearCart}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.productId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link href={`/product/${item.productId}`} className="shrink-0">
                      <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                        {item.product.photos?.[0] ? (
                          <Image
                            src={item.product.photos[0]}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${item.productId}`}>
                        <h3 className="font-semibold hover:text-primary-500 transition-colors line-clamp-1">
                          {item.product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDateShort(item.rentalStartDate)} — {formatDateShort(item.rentalEndDate)}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span>{item.rentalDays} {t.product.days}</span>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.product.totalStock}
                            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Price & Remove */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-primary-500">
                              {formatPrice(item.totalPrice)} UZS
                            </p>
                            {item.savings > 0 && (
                              <p className="text-xs text-green-600 dark:text-green-400">
                                -{formatPrice(item.savings)} UZS
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">{t.cart.title}</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>
                  {items.length} {items.length === 1 ? t.cart.item : t.cart.items}
                </span>
                <span>{formatPrice(subtotal)} UZS</span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>{t.cart.savings}</span>
                  <span>-{formatPrice(totalSavings)} UZS</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t.cart.delivery}</span>
                <span>{deliveryFee > 0 ? `${formatPrice(deliveryFee)} UZS` : t.cart.free}</span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>{t.cart.total}</span>
                  <span className="text-primary-500">{formatPrice(total)} UZS</span>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full mt-6"
              onClick={handleCheckout}
            >
              {t.cart.checkout}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            <Link href="/catalog" className="block mt-4">
              <Button variant="outline" className="w-full">
                {t.product.continueShopping}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
