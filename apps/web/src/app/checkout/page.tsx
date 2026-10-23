'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MapPin,
  Check,
  Plus,
  CreditCard,
  CalendarDays,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ru as ruLocale } from 'date-fns/locale';
import { Button, Card, Modal } from '@/components/ui';
import { AddressForm } from '@/components/profile/AddressForm';
import { AuthGuard } from '@/components/auth-guard';
import { useCartStore, getDeliveryStatus, cartEventId } from '@/stores/cart-store';
import { useRentalPeriodStore } from '@/stores/rental-period-store';
import { useAuthStore } from '@/stores/auth-store';
import { userApi, ordersApi, settingsApi } from '@/lib/api';
import { formatPrice, formatDateForAPI, cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { countLabel } from '@/lib/i18n';
import type { DeliveryType, PaymentMethod } from '@/types';
import { Reveal } from '@/components/home/Reveal';

// Payme is the only method for now, and its checkout is not connected yet:
// the order is created as PAYME / PENDING and the manager sends the payment
// link. When the Payme merchant API is wired up, redirect after the order is
// created (the way the Multicard flow used to) — see `onSuccess` below.
const paymentMethods: { value: PaymentMethod; labelKey: string; descKey: string; Icon: LucideIcon }[] = [
  { value: 'PAYME', labelKey: 'checkout.method_payme', descKey: 'checkout.method_payme_desc', Icon: CreditCard },
];

function CheckoutPageContent() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, subtotal, totalSavings, deliveryFee, total, setDeliveryFee, clearCart } =
    useCartStore();

  const deliveryType: DeliveryType = 'DELIVERY';
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYME');
  const selectedEvent = useRentalPeriodStore((s) => s.event);
  const eventId = cartEventId(items);
  const [notes, setNotes] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Redirect if not authenticated or cart is empty
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    } else if (items.length === 0) {
      router.push('/cart');
    }
  }, [isAuthenticated, items.length, router]);

  // Fetch addresses
  const { data: addresses, refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: userApi.getAddresses,
    enabled: isAuthenticated,
  });

  // Fetch business settings for self-pickup address
  const { data: businessSettings } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: () => settingsApi.getBusinessInfo(),
  });

  // Set default address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddress.id);
    }
  }, [addresses, selectedAddressId]);

  // No fee is charged online: delivery is free from FREE_DELIVERY_THRESHOLD,
  // and below it the district fee is agreed when the order is confirmed.
  useEffect(() => {
    setDeliveryFee(0);
  }, [setDeliveryFee]);
  const delivery = getDeliveryStatus(subtotal);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: async (order) => {
      clearCart();
      toast.success(t('checkout.order_success'));

      // Payme placeholder: no redirect yet, the order page says a payment
      // link will follow.
      router.push(`/orders/${order.id}`);
    },
    onError: () => {
      toast.error(t('checkout.order_error'));
    },
  });

  const handleSubmit = () => {
    if (deliveryType === 'DELIVERY' && !selectedAddressId) {
      toast.error(t('checkout.select_address'));
      return;
    }

    // Get rental dates from first cart item (assuming all items have same dates)
    const firstItem = items[0];
    if (!firstItem) return;

    createOrderMutation.mutate({
      items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      rental_start_date: formatDateForAPI(new Date(firstItem.rentalStartDate)),
      rental_end_date: formatDateForAPI(new Date(firstItem.rentalEndDate)),
      delivery_type: deliveryType,
      delivery_address_id: deliveryType === 'DELIVERY' ? selectedAddressId || undefined : undefined,
      payment_method: paymentMethod,
      event_id: eventId,
      notes: notes || undefined,
    });
  };

  const handleAddressCreated = () => {
    refetchAddresses();
    setShowAddressModal(false);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {t('checkout.title')}
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <AnimatePresence mode="wait">
            {true && (
              <motion.div
                key="delivery-address"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h2 className="font-semibold text-lg mb-4">{t('checkout.delivery_address')}</h2>

                {addresses && addresses.length > 0 ? (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <button
                        key={address.id}
                        onClick={() => setSelectedAddressId(address.id)}
                        className={cn(
                          'flex items-start gap-4 p-4 rounded-xl border-2 w-full text-left transition-all',
                          selectedAddressId === address.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div
                          className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                            selectedAddressId === address.id ? 'bg-primary text-white' : 'bg-muted'
                          )}
                        >
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{address.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {address.fullAddress}
                          </p>
                        </div>
                        {selectedAddressId === address.id && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}

                    <button
                      onClick={() => setShowAddressModal(true)}
                      className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border w-full hover:border-primary/50 transition-colors"
                    >
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground">{t('checkout.add_new_address')}</span>
                    </button>
                  </div>
                ) : (
                  <Card className="p-6 text-center">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="mb-4">{t('checkout.no_addresses')}</p>
                    <Button onClick={() => setShowAddressModal(true)}>
                      {t('checkout.add_address')}
                    </Button>
                  </Card>
                )}
              </motion.div>
            )}

          </AnimatePresence>

          {/* Payment Method */}
          <Reveal>
            <h2 className="font-semibold text-lg mb-4">{t('checkout.payment_method')}</h2>
            <div className="grid gap-3 sm:max-w-md">
              {paymentMethods.map((method) => {
                const { Icon } = method;
                const isActive = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <span
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block font-medium">{t(method.labelKey)}</span>
                      <span className="block text-xs text-muted-foreground">{t(method.descKey)}</span>
                    </span>
                    {isActive && <Check className="h-5 w-5 text-primary ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{t('checkout.payme_placeholder_hint')}</p>
          </Reveal>

          {/* Notes */}
          <Reveal>
            <h2 className="font-semibold text-lg mb-4">{t('checkout.order_notes')}</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('checkout.notes_placeholder')}
              className="w-full h-24 rounded-xl border-2 border-input bg-card px-4 py-3 text-sm resize-none focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </Reveal>
        </div>

        {/* Order Summary */}
        <Reveal className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h2 className="font-semibold text-lg mb-4">{t('checkout.your_order')}</h2>
            {eventId && selectedEvent?.id === eventId && (
              <p className="mb-4 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary-text">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{t('checkout.for_event', { event: selectedEvent.title })}</span>
              </p>
            )}

            {/* Items Preview */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto scrollbar-thin">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.product.photos[0] && (
                      <Image
                        src={item.product.photos[0]}
                        alt={item.product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {countLabel(item.rentalDays, locale, 'days')}
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    {formatPrice(item.totalPrice)} {t('common.currency')}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-3 mb-6">
              {/* The dates the order will be placed for — they were chosen on
                  the product page and were nowhere on this screen. */}
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{t('checkout.rental_period')}</span>
                <span className="text-right">
                  {format(new Date(items[0].rentalStartDate), 'd MMM', { locale: ruLocale })} —{' '}
                  {format(new Date(items[0].rentalEndDate), 'd MMM yyyy', { locale: ruLocale })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('checkout.items')}</span>
                <span>{formatPrice(subtotal)} {t('common.currency')}</span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>{t('cart.discount')}</span>
                  <span>-{formatPrice(totalSavings)} {t('common.currency')}</span>
                </div>
              )}

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{t('cart.delivery')}</span>
                <span className="text-right">
                  {deliveryFee > 0
                    ? `${formatPrice(deliveryFee)} ${t('common.currency')}`
                    : delivery.free
                      ? t('cart.free')
                      : t('cart.delivery_on_confirmation')}
                </span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                <span>{t('cart.total')}</span>
                <span className="text-primary-text">{formatPrice(total)} {t('common.currency')}</span>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              isLoading={createOrderMutation.isPending}
              disabled={deliveryType === 'DELIVERY' && !selectedAddressId}
              size="lg"
              variant="gradient"
              className="w-full"
            >
              {t('checkout.place_order')}
            </Button>

            {!selectedAddressId && (
              <p className="mt-3 text-center text-sm text-primary-text" role="status">
                {t('checkout.address_required_hint')}
              </p>
            )}

            <p className="mt-4 text-xs text-center text-muted-foreground">
              {t('checkout.terms_agreement')}
            </p>
          </Card>
        </Reveal>
      </div>

      {/* Add Address Modal */}
      <Modal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        title={t('checkout.new_address')}
        size="lg"
      >
        <AddressForm
          onSuccess={handleAddressCreated}
          onCancel={() => setShowAddressModal(false)}
        />
      </Modal>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutPageContent />
    </AuthGuard>
  );
}
