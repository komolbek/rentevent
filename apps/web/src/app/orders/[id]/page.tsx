'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  ArrowLeft,
  Calendar,
  MapPin,
  Truck,
  CreditCard,
  FileText,
  CheckCircle2,
  Clock,
  Box,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button, Card, Badge, Skeleton } from '@/components/ui';
import { AuthGuard } from '@/components/auth-guard';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  formatPrice,
  getOrderStatusLabel,
  getOrderStatusColor,
  getDeliveryTypeLabel,
  getPaymentMethodLabel,
  cn,
} from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { OrderStatus } from '@/types';

function OrderDetailPageContent() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const statusSteps: { status: OrderStatus; label: string; icon: typeof CheckCircle2 }[] = [
    { status: 'CONFIRMED', label: t('status.confirmed'), icon: CheckCircle2 },
    { status: 'PREPARING', label: t('status.preparing'), icon: Clock },
    { status: 'DELIVERED', label: t('status.delivered'), icon: Box },
    { status: 'RETURNED', label: t('status.returned'), icon: RotateCcw },
  ];

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: isAuthenticated && !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('order_detail.not_found')}</h1>
        <Button onClick={() => router.push('/orders')}>{t('order_detail.back_to_orders')}</Button>
      </div>
    );
  }

  const currentStatusIndex = statusSteps.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <button
          onClick={() => router.push('/orders')}
          aria-label={t('order_detail.back_to_orders')}
          title={t('order_detail.back_to_orders')}
          className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{t('order_detail.order_number', { number: order.orderNumber })}</h1>
            <Badge className={getOrderStatusColor(order.status)}>
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {format(new Date(order.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
          </p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          {!isCancelled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6">
                <h2 className="font-semibold mb-6">{t('order_detail.order_status')}</h2>
                <div className="flex items-center justify-between relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%`,
                      }}
                    />
                  </div>

                  {statusSteps.map((step, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;

                    return (
                      <div key={step.status} className="flex flex-col items-center relative z-10">
                        <div
                          className={cn(
                            'h-10 w-10 rounded-full flex items-center justify-center transition-colors',
                            isCompleted
                              ? 'bg-primary text-white'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <step.icon className="h-5 w-5" />
                        </div>
                        <span
                          className={cn(
                            'text-xs mt-2 text-center',
                            isCurrent ? 'font-medium text-primary-text' : 'text-muted-foreground'
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}

          {isCancelled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6 border-destructive bg-destructive/5">
                <div className="flex items-center gap-3 text-destructive">
                  <XCircle className="h-6 w-6" />
                  <span className="font-medium">{t('order_detail.order_cancelled')}</span>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Order Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-semibold">{t('order_detail.items')}</h2>
              </div>
              <div className="divide-y divide-border">
                {order.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/product/${item.productId}`}
                    className="flex gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted shrink-0">
                      {item.productPhoto ? (
                        <img
                          src={item.productPhoto}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {t('availability.units')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.dailyPrice)} {t('product.per_day')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold">{formatPrice(item.totalPrice)} UZS</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Delivery Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <h2 className="font-semibold mb-4">{t('order_detail.delivery')}</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {order.deliveryType === 'DELIVERY' ? (
                      <Truck className="h-5 w-5 text-primary" />
                    ) : (
                      <MapPin className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{getDeliveryTypeLabel(order.deliveryType)}</p>
                    {order.deliveryAddress && (
                      <p className="text-sm text-muted-foreground">
                        {order.deliveryAddress.fullAddress}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('order_detail.rental_period')}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.rentalStartDate), 'd MMMM', { locale: ru })} —{' '}
                      {format(new Date(order.rentalEndDate), 'd MMMM yyyy', { locale: ru })}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Notes */}
          {order.notes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('order_detail.comment')}</p>
                    <p className="text-sm text-muted-foreground">{order.notes}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 sticky top-24">
            <h2 className="font-semibold mb-4">{t('order_detail.order_total')}</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('checkout.items')}</span>
                <span>{formatPrice(order.subtotal)} UZS</span>
              </div>

              {order.totalSavings > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>{t('cart.discount')}</span>
                  <span>-{formatPrice(order.totalSavings)} UZS</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('cart.delivery')}</span>
                <span>
                  {order.deliveryFee > 0 ? `${formatPrice(order.deliveryFee)} UZS` : t('cart.free')}
                </span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                <span>{t('cart.total')}</span>
                <span className="text-primary-text">{formatPrice(order.totalAmount)} UZS</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="p-4 rounded-xl bg-muted mb-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {getPaymentMethodLabel(order.paymentMethod)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.paymentStatus === 'PAID' ? t('order_detail.paid') : t('order_detail.awaiting_payment')}
                  </p>
                </div>
              </div>
            </div>

            {order.paymentMethod === 'BANK_TRANSFER' && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-4 space-y-3">
                <h3 className="text-sm font-semibold">{t('order.corporate.title')}</h3>
                {order.companyName && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('order.corporate.company_label')}: </span>
                    <span className="font-medium">{order.companyName}</span>
                  </div>
                )}
                {order.companyInn && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('order.corporate.inn_label')}: </span>
                    <span className="font-medium">{order.companyInn}</span>
                  </div>
                )}
                <div className="text-sm">
                  {order.corporateInvoiceStatus === 'PAID' && (
                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 font-medium text-green-700 dark:text-green-400">
                      {t('order.corporate.status_paid')}
                    </span>
                  )}
                  {order.corporateInvoiceStatus === 'OFFER_SENT' && (
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 font-medium text-blue-700 dark:text-blue-400">
                      {t('order.corporate.status_offer_sent')}
                    </span>
                  )}
                  {(!order.corporateInvoiceStatus || order.corporateInvoiceStatus === 'PENDING') && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 font-medium text-amber-700 dark:text-amber-400">
                      {t('order.corporate.status_pending')}
                    </span>
                  )}
                  {order.corporateInvoiceStatus === 'CANCELLED' && (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive">
                      {t('order.corporate.status_cancelled')}
                    </span>
                  )}
                </div>
                {order.corporateInvoiceNote && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {order.corporateInvoiceNote}
                  </p>
                )}
              </div>
            )}

            <Link href="/catalog">
              <Button variant="outline" className="w-full">
                {t('order_detail.continue_shopping')}
              </Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <AuthGuard>
      <OrderDetailPageContent />
    </AuthGuard>
  );
}
