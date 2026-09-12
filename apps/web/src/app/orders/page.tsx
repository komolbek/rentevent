'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowLeft, ChevronRight, Calendar, MapPin, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button, Card, Badge, EmptyState, OrderCardSkeleton } from '@/components/ui';
import { AuthGuard } from '@/components/auth-guard';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatPrice, getOrderStatusLabel, getOrderStatusColor, getDeliveryTypeLabel } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

function OrdersPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getMyOrders({ limit: 20 }),
    enabled: isAuthenticated,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <button
          onClick={() => router.back()}
          aria-label={t('orders.back')}
          title={t('orders.back')}
          className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">{t('orders.title')}</h1>
          <p className="text-muted-foreground">
            {t('orders.count', { count: ordersData?.meta.total || 0 })}
          </p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      ) : !ordersData?.items.length ? (
        <EmptyState
          icon={<Package className="h-16 w-16" />}
          title={t('orders.empty_title')}
          description={t('orders.empty_description')}
          action={
            <Link href="/catalog">
              <Button size="lg" variant="gradient">
                {t('orders.go_to_catalog')}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {ordersData.items.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/orders/${order.id}`}>
                <Card hover className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">
                          {t('orders.order_number', { number: order.orderNumber })}
                        </h3>
                        <Badge className={getOrderStatusColor(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(order.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Items Preview */}
                  <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                    {order.items.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="shrink-0 h-16 w-16 rounded-lg overflow-hidden bg-muted"
                      >
                        {item.productPhoto ? (
                          <img
                            src={item.productPhoto}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="shrink-0 h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">
                          +{order.items.length - 4}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(order.rentalStartDate), 'd MMM', { locale: ru })} —{' '}
                      {format(new Date(order.rentalEndDate), 'd MMM', { locale: ru })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {order.deliveryType === 'DELIVERY' ? (
                        <Truck className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      {getDeliveryTypeLabel(order.deliveryType)}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-muted-foreground">
                      {t('orders.items_count', { count: order.items.length })}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(order.totalAmount)} {t('common.currency')}
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersPageContent />
    </AuthGuard>
  );
}
