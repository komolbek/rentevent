import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Button, Card, EmptyState, QuantitySelector } from '@/components/ui';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/lib/utils';

export function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { items, subtotal, totalSavings, deliveryFee, total, removeItem, updateItem, clearCart } =
    useCartStore();

  const handleQuantityChange = (productId: string, quantity: number) => {
    updateItem(productId, { quantity });
  };

  const handleRemoveItem = (productId: string, productName: string) => {
    removeItem(productId);
    toast.success(`${productName} удалён из корзины`);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Войдите в аккаунт для оформления заказа');
      navigate('/auth', { state: { from: '/checkout' } });
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={<ShoppingCart className="h-16 w-16" />}
          title="Корзина пуста"
          description="Добавьте товары из каталога, чтобы оформить заказ"
          action={
            <Link to="/catalog">
              <Button size="lg" variant="gradient">
                Перейти в каталог
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
        Корзина
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
                      to={`/product/${item.productId}`}
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
                        to={`/product/${item.productId}`}
                        className="font-medium hover:text-primary transition-colors line-clamp-2"
                      >
                        {item.product.name}
                      </Link>

                      <div className="mt-1 text-sm text-muted-foreground">
                        {format(new Date(item.rentalStartDate), 'd MMM', { locale: ru })} —{' '}
                        {format(new Date(item.rentalEndDate), 'd MMM', { locale: ru })} •{' '}
                        {item.rentalDays} дней
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
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
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
              onClick={clearCart}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              Очистить корзину
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <Card className="p-6 sticky top-24">
            <h2 className="font-semibold text-lg mb-4">Сумма заказа</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Товары ({items.length})</span>
                <span>{formatPrice(subtotal)} UZS</span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Скидка</span>
                  <span>-{formatPrice(totalSavings)} UZS</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Доставка</span>
                <span>{deliveryFee > 0 ? `${formatPrice(deliveryFee)} UZS` : 'Бесплатно'}</span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                <span>Итого</span>
                <span className="text-primary">{formatPrice(total)} UZS</span>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              size="lg"
              variant="gradient"
              className="w-full"
              rightIcon={<ArrowRight className="h-5 w-5" />}
            >
              Оформить заказ
            </Button>

            <p className="mt-4 text-xs text-center text-muted-foreground">
              Доставка по Ташкенту бесплатно
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
