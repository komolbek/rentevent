'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Package,
  Calendar,
  Truck,
  MapPin,
  ChevronRight,
  Clock,
} from 'lucide-react';

import { useLanguageStore } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import { ordersApi } from '@/lib/website/api';
import type { Order, OrderStatus } from '@/lib/website/types';
import { formatPrice, formatDate, formatDateShort, cn } from '@/lib/website/utils';
import { Button, Card, Badge } from '@/components/website/ui';

const statusColors: Record<OrderStatus, string> = {
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PREPARING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  RETURNED: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function OrdersPage() {
  const router = useRouter();
  const { t } = useLanguageStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth?from=/orders');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, _hasHydrated, router, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersApi.getMyOrders({ page, limit: 10 });
      setOrders(response.items);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    return t.orders.status[status] || status;
  };

  const getDeliveryTypeLabel = (type: string) => {
    return t.orders.deliveryType[type as keyof typeof t.orders.deliveryType] || type;
  };

  // Show loading state until hydration is complete
  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="h-24 w-24 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
            <Package className="h-12 w-12 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t.orders.empty}</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{t.orders.emptyDescription}</p>
          <Link href="/catalog">
            <Button size="lg">{t.cart.goToCatalog}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">{t.orders.title}</h1>

      <div className="space-y-4">
        {orders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  {/* Order Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-bold text-lg">
                      {t.orders.orderNumber}{order.orderNumber}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[order.status])}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Clock className="h-4 w-4" />
                      <span>{t.orders.orderDate}: {formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {t.orders.rentalPeriod}: {formatDateShort(order.rentalStartDate)} — {formatDateShort(order.rentalEndDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      {order.deliveryType === 'DELIVERY' ? (
                        <Truck className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      <span>{getDeliveryTypeLabel(order.deliveryType)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400">{t.orders.totalAmount}:</span>
                      <span className="font-bold text-primary-500">{formatPrice(order.totalAmount)} UZS</span>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div
                            key={item.id}
                            className="relative h-10 w-10 rounded-lg overflow-hidden border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700"
                          >
                            {item.product?.photos?.[0] ? (
                              <Image
                                src={item.product.photos[0]}
                                alt=""
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-medium">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {order.items.length} {order.items.length === 1 ? t.cart.item : t.cart.items}
                      </span>
                    </div>
                  )}
                </div>

                <Link href={`/orders/${order.id}`}>
                  <Button variant="outline" size="sm">
                    {t.orders.viewDetails}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setPage(pageNum)}
              className={cn(
                'h-10 w-10 rounded-lg font-medium transition-colors',
                pageNum === page
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {pageNum}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
