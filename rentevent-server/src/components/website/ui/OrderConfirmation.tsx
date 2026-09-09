'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Package,
  Truck,
  CreditCard,
  Calendar,
  ChevronRight,
  Copy,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from './Button';
import { useLanguageStore } from '@/stores/languageStore';

interface OrderConfirmationProps {
  isOpen: boolean;
  orderId: string | null;
  orderDetails?: {
    totalAmount?: number;
    itemCount?: number;
    deliveryType?: 'DELIVERY' | 'SELF_PICKUP';
    paymentMethod?: string;
    rentalStartDate?: string;
    rentalEndDate?: string;
  };
}

// Confetti particle component
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = Math.random() * 8 + 4;
  const rotation = Math.random() * 360;

  return (
    <motion.div
      className="absolute rounded-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: `${x}%`,
        top: -20,
      }}
      initial={{ y: 0, opacity: 1, rotate: rotation }}
      animate={{
        y: 400,
        opacity: 0,
        rotate: rotation + 720,
        x: (Math.random() - 0.5) * 200,
      }}
      transition={{
        duration: 2 + Math.random(),
        delay: delay,
        ease: 'easeOut',
      }}
    />
  );
}

// Animated checkmark
function AnimatedCheckmark() {
  return (
    <motion.div
      className="relative"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-green-400/30"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.5, 1.2] }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />

      {/* Main circle */}
      <motion.div
        className="relative h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30"
        initial={{ rotate: -180 }}
        animate={{ rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        {/* Checkmark */}
        <motion.div
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Check className="h-12 w-12 text-white" strokeWidth={3} />
        </motion.div>
      </motion.div>

      {/* Sparkles */}
      <motion.div
        className="absolute -top-2 -right-2"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.7, type: 'spring' }}
      >
        <Sparkles className="h-6 w-6 text-yellow-400" />
      </motion.div>
    </motion.div>
  );
}

export function OrderConfirmation({ isOpen, orderId, orderDetails }: OrderConfirmationProps) {
  const { t } = useLanguageStore();
  const [copied, setCopied] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<{ id: number; delay: number; x: number }[]>([]);

  // Generate confetti on open
  useEffect(() => {
    if (isOpen) {
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        x: Math.random() * 100,
      }));
      setConfettiParticles(particles);
    }
  }, [isOpen]);

  const copyOrderId = async () => {
    if (orderId) {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const formatPrice = (price?: number) => {
    if (!price) return '0';
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          {/* Confetti container */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {confettiParticles.map((particle) => (
              <ConfettiParticle key={particle.id} delay={particle.delay} x={particle.x} />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-lg w-full text-center relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20" />

            {/* Content */}
            <div className="relative z-10">
              {/* Animated checkmark */}
              <div className="flex justify-center mb-6">
                <AnimatedCheckmark />
              </div>

              {/* Success text */}
              <motion.h2
                className="text-2xl md:text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {t.checkout.orderSuccess}
              </motion.h2>

              <motion.p
                className="text-slate-600 dark:text-slate-400 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {t.checkout.orderSuccessDescription}
              </motion.p>

              {/* Order ID */}
              {orderId && (
                <motion.div
                  className="mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    {t.orders?.orderNumber || 'Номер заказа'}
                  </p>
                  <button
                    onClick={copyOrderId}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <span className="font-mono font-semibold">#{orderId.slice(0, 8).toUpperCase()}</span>
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </motion.div>
              )}

              {/* Order summary cards */}
              {orderDetails && (
                <motion.div
                  className="grid grid-cols-2 gap-3 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  {/* Items count */}
                  {orderDetails.itemCount && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <Package className="h-5 w-5 text-primary-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {orderDetails.itemCount}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.cart?.items || 'товаров'}
                      </p>
                    </div>
                  )}

                  {/* Delivery type */}
                  {orderDetails.deliveryType && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <Truck className="h-5 w-5 text-primary-500 mx-auto mb-1" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {orderDetails.deliveryType === 'DELIVERY'
                          ? t.checkout?.delivery || 'Доставка'
                          : t.checkout?.selfPickup || 'Самовывоз'}
                      </p>
                    </div>
                  )}

                  {/* Rental period */}
                  {orderDetails.rentalStartDate && orderDetails.rentalEndDate && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <Calendar className="h-5 w-5 text-primary-500 mx-auto mb-1" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatDate(orderDetails.rentalStartDate)} — {formatDate(orderDetails.rentalEndDate)}
                      </p>
                    </div>
                  )}

                  {/* Total */}
                  {orderDetails.totalAmount && (
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                      <CreditCard className="h-5 w-5 text-primary-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {formatPrice(orderDetails.totalAmount)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">UZS</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Action buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Link href="/catalog" className="flex-1">
                  <Button variant="outline" className="w-full">
                    {t.product?.continueShopping || 'Продолжить покупки'}
                  </Button>
                </Link>
                <Link href="/orders" className="flex-1">
                  <Button className="w-full group">
                    {t.checkout.goToOrders}
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>

              {/* Additional info */}
              <motion.p
                className="mt-4 text-xs text-slate-400 dark:text-slate-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                {t.checkout?.orderSuccessDescription || 'Мы свяжемся с вами для подтверждения заказа'}
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
