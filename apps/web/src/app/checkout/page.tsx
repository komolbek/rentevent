'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MapPin,
  Check,
  Plus,
  CreditCard,
  Banknote,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ru as ruLocale } from 'date-fns/locale';
import { Button, Card, Modal, Input } from '@/components/ui';
import { AddressForm } from '@/components/profile/AddressForm';
import { AuthGuard } from '@/components/auth-guard';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { userApi, ordersApi, paymentsApi, settingsApi } from '@/lib/api';
import { formatPrice, formatDateForAPI, cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { DeliveryType, PaymentMethod } from '@/types';

const paymentMethods: { value: PaymentMethod; labelKey: string; descKey: string; Icon: LucideIcon }[] = [
  { value: 'RAHMAT', labelKey: 'checkout.method_rahmat', descKey: 'checkout.method_rahmat_desc', Icon: CreditCard },
  { value: 'CASH', labelKey: 'checkout.method_cash', descKey: 'checkout.method_cash_desc', Icon: Banknote },
  { value: 'BANK_TRANSFER', labelKey: 'checkout.method_bank_transfer', descKey: 'checkout.method_bank_transfer_desc', Icon: FileText },
];

function CheckoutPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, subtotal, totalSavings, deliveryFee, total, setDeliveryFee, clearCart } =
    useCartStore();

  const deliveryType: DeliveryType = 'DELIVERY';
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('RAHMAT');
  const [companyName, setCompanyName] = useState('');
  const [companyInn, setCompanyInn] = useState('');
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

  // Delivery fee — free in Tashkent for now; keep zone calc as a follow-up.
  useEffect(() => {
    setDeliveryFee(0);
  }, [setDeliveryFee]);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: async (order) => {
      clearCart();
      toast.success(t('checkout.order_success'));

      if (order.paymentMethod === 'RAHMAT') {
        try {
          const { checkout_url } = await paymentsApi.multicardCheckout(order.id);
          window.location.href = checkout_url;
          return;
        } catch {
          toast.error(t('checkout.payment_redirect_error'));
          router.push(`/orders/${order.id}`);
          return;
        }
      }

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

    if (paymentMethod === 'BANK_TRANSFER') {
      if (!companyName.trim()) {
        toast.error(t('checkout.company_name_required'));
        return;
      }
      if (!/^\d{9}$/.test(companyInn.trim())) {
        toast.error(t('checkout.inn_invalid'));
        return;
      }
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
      company_name: paymentMethod === 'BANK_TRANSFER' ? companyName.trim() : undefined,
      company_inn: paymentMethod === 'BANK_TRANSFER' ? companyInn.trim() : undefined,
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
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-8"
      >
        {t('checkout.title')}
      </motion.h1>

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-semibold text-lg mb-4">{t('checkout.payment_method')}</h2>
            <div className="grid sm:grid-cols-3 gap-3">
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

            {paymentMethod === 'BANK_TRANSFER' && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">
                  {t('checkout.bank_transfer_hint')}
                </p>
                <Input
                  label={t('checkout.company_name')}
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t('checkout.company_name_placeholder')}
                />
                <Input
                  label={t('checkout.company_inn')}
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={companyInn}
                  onChange={(e) => setCompanyInn(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456789"
                />
              </div>
            )}
          </motion.div>

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="font-semibold text-lg mb-4">{t('checkout.order_notes')}</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('checkout.notes_placeholder')}
              className="w-full h-24 rounded-xl border-2 border-input bg-card px-4 py-3 text-sm resize-none focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </motion.div>
        </div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <Card className="p-6 sticky top-24">
            <h2 className="font-semibold text-lg mb-4">{t('checkout.your_order')}</h2>

            {/* Items Preview */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto scrollbar-thin">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3">
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.product.photos[0] && (
                      <img
                        src={item.product.photos[0]}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {item.rentalDays} {t('cart.days')}
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    {formatPrice(item.totalPrice)} UZS
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
                <span>{formatPrice(subtotal)} UZS</span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>{t('cart.discount')}</span>
                  <span>-{formatPrice(totalSavings)} UZS</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('cart.delivery')}</span>
                <span>{deliveryFee > 0 ? `${formatPrice(deliveryFee)} UZS` : t('cart.free')}</span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                <span>{t('cart.total')}</span>
                <span className="text-primary-text">{formatPrice(total)} UZS</span>
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
        </motion.div>
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
