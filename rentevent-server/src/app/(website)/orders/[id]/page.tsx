'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Package,
  Calendar,
  Truck,
  MapPin,
  CreditCard,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useLanguageStore } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import { ordersApi } from '@/lib/website/api';
import type { Order, OrderStatus } from '@/lib/website/types';
import { formatPrice, formatDate, formatDateShort, cn } from '@/lib/website/utils';
import { Button, Card, Badge, Modal } from '@/components/website/ui';

const statusColors: Record<OrderStatus, string> = {
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PREPARING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  RETURNED: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const { t } = useLanguageStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth?from=/orders');
      return;
    }
    fetchOrder();
  }, [isAuthenticated, _hasHydrated, orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getById(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  const getCancellationFeeMessage = () => {
    if (!order) return '';
    const now = new Date();
    const rentalStart = new Date(order.rentalStartDate);
    const hoursUntil = (rentalStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil >= 48) return t.orders.cancelFree;
    if (hoursUntil >= 24) return t.orders.cancelFee30;
    return t.orders.cancelFee50;
  };

  const handleCancel = async () => {
    if (!order) return;
    try {
      setCancelling(true);
      await ordersApi.cancel(order.id);
      toast.success(t.orders.cancelled);
      setShowCancelModal(false);
      fetchOrder();
    } catch (error) {
      toast.error(t.orders.cancelError);
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = order && ['CONFIRMED', 'PREPARING'].includes(order.status);

  if (!_hasHydrated || !isAuthenticated || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Package className="h-16 w-16 mx-auto text-slate-400 mb-4" />
        <h1 className="text-2xl font-bold mb-4">{t.common.error}</h1>
        <Link href="/orders">
          <Button>{t.orders.title}</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-500 mb-6 transition-colors"
          aria-label={t.orders.title}
        >
          <ChevronLeft className="h-5 w-5" />
          <span>{t.orders.title}</span>
        </button>

        {/* Order Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              {t.orders.orderNumber}{order.orderNumber}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t.orders.orderDate}: {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn('px-3 py-1 rounded-full text-sm font-medium', statusColors[order.status])}>
              {t.orders.status[order.status] || order.status}
            </span>
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                aria-label={t.orders.cancelOrder}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {t.orders.cancelOrder}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <Card className="p-4">
              <h2 className="font-semibold mb-4">{t.orders.items}</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                      {item.product?.photos?.[0] ? (
                        <Image
                          src={item.product.photos[0]}
                          alt={item.product?.name || ''}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {(item as any).productName || item.product?.name || 'Product'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {item.quantity} x {formatPrice(item.dailyPrice)} UZS
                      </p>
                      <p className="font-semibold text-primary-500">
                        {formatPrice(item.totalPrice)} UZS
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Rental Period */}
            <Card className="p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                {t.orders.rentalPeriod}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {formatDateShort(order.rentalStartDate)} — {formatDateShort(order.rentalEndDate)}
              </p>
            </Card>

            {/* Delivery */}
            <Card className="p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                {order.deliveryType === 'DELIVERY' ? (
                  <Truck className="h-5 w-5 text-primary-500" />
                ) : (
                  <MapPin className="h-5 w-5 text-primary-500" />
                )}
                {t.orders.deliveryInfo}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t.orders.deliveryType[order.deliveryType as keyof typeof t.orders.deliveryType]}
              </p>
              {order.deliveryAddress && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {(order.deliveryAddress as any).full_address || (order.deliveryAddress as any).fullAddress}
                </p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="p-4 sticky top-24">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary-500" />
                {t.orders.paymentInfo}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{t.orders.subtotal}</span>
                  <span>{formatPrice(order.subtotal)} UZS</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t.orders.deliveryFee}</span>
                    <span>{formatPrice(order.deliveryFee)} UZS</span>
                  </div>
                )}
                {order.totalSavings > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>{t.orders.savings}</span>
                    <span>-{formatPrice(order.totalSavings)} UZS</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>{t.orders.totalAmount}</span>
                  <span className="text-primary-500">{formatPrice(order.totalAmount)} UZS</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {order.paymentMethod}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={t.orders.cancelOrder}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {t.orders.cancelConfirm}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {getCancellationFeeMessage()}
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
            >
              {t.common.close}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? t.common.loading : t.orders.cancelOrder}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
