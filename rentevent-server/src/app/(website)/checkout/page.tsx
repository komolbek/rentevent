'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Truck,
  MapPin,
  CreditCard,
  Package,
  Check,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useLanguageStore } from '@/stores/languageStore';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { ordersApi, userApi, settingsApi } from '@/lib/website/api';
import type { Address, DeliveryType } from '@/lib/website/types';

type CheckoutPaymentMethod = 'PAYME' | 'CLICK' | 'UZUM';
import { formatPrice, formatDateShort, cn } from '@/lib/website/utils';
import { Button, Card, OrderConfirmation } from '@/components/website/ui';

const paymentMethods: { id: CheckoutPaymentMethod; name: string; logo: string }[] = [
  { id: 'PAYME', name: 'Payme', logo: '/images/payments/payme.svg' },
  { id: 'CLICK', name: 'Click', logo: '/images/payments/click.svg' },
  { id: 'UZUM', name: 'Uzum', logo: '/images/payments/uzum.svg' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useLanguageStore();
  const { items, subtotal, totalSavings, total, deliveryFee, clearCart, setDeliveryFee } = useCartStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('DELIVERY');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<CheckoutPaymentMethod>('PAYME');
  const [notes, setNotes] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pickupAddress, setPickupAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth state to be hydrated from localStorage
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth?from=/checkout');
      return;
    }

    if (items.length === 0) {
      router.push('/cart');
      return;
    }

    fetchData();
  }, [isAuthenticated, _hasHydrated, router, items.length]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [addressesData, settingsData] = await Promise.all([
        userApi.getAddresses(),
        settingsApi.getBusinessSettings(),
      ]);

      // Ensure addressesData is an array
      const safeAddresses = Array.isArray(addressesData) ? addressesData : [];
      setAddresses(safeAddresses);
      setPickupAddress(settingsData.address || '');

      // Set default address if available
      const defaultAddr = safeAddresses.find((a) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else if (safeAddresses.length > 0) {
        setSelectedAddressId(safeAddresses[0].id);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch data:', error);
      // If 401 error, redirect to login
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          router.push('/auth?from=/checkout');
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Update delivery fee based on delivery type
    if (deliveryType === 'SELF_PICKUP') {
      setDeliveryFee(0);
    } else {
      // Could fetch from delivery zones, using 0 for now
      setDeliveryFee(0);
    }
  }, [deliveryType, setDeliveryFee]);

  const handleSubmit = async () => {
    if (deliveryType === 'DELIVERY' && !selectedAddressId) {
      toast.error(t.checkout.selectAddress);
      return;
    }

    const firstItem = items[0];
    if (!firstItem) return;

    try {
      setSubmitting(true);

      const orderData = {
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
        rental_start_date: firstItem.rentalStartDate.split('T')[0],
        rental_end_date: firstItem.rentalEndDate.split('T')[0],
        delivery_type: deliveryType,
        address_id: deliveryType === 'DELIVERY' ? selectedAddressId || undefined : undefined,
        payment_method: selectedPayment,
        notes: notes || undefined,
      };

      const order = await ordersApi.create(orderData);
      setOrderId(order.id);
      setShowSuccess(true);
      clearCart();
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error(t.checkout.orderError);
    } finally {
      setSubmitting(false);
    }
  };

  if (!_hasHydrated || !isAuthenticated || items.length === 0) {
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

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t.checkout.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Method */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary-500" />
                {t.checkout.deliveryMethod}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeliveryType('DELIVERY')}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    deliveryType === 'DELIVERY'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Truck className={cn('h-6 w-6', deliveryType === 'DELIVERY' ? 'text-primary-500' : 'text-slate-400')} />
                    <span className="font-medium">{t.checkout.delivery}</span>
                  </div>
                </button>

                <button
                  onClick={() => setDeliveryType('SELF_PICKUP')}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    deliveryType === 'SELF_PICKUP'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className={cn('h-6 w-6', deliveryType === 'SELF_PICKUP' ? 'text-primary-500' : 'text-slate-400')} />
                    <span className="font-medium">{t.checkout.selfPickup}</span>
                  </div>
                </button>
              </div>
            </Card>

            {/* Delivery Address or Pickup Location */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary-500" />
                {deliveryType === 'DELIVERY' ? t.checkout.deliveryAddress : t.checkout.pickupAddress}
              </h2>

              {deliveryType === 'DELIVERY' ? (
                <>
                  {addresses.length === 0 ? (
                    <div className="text-center py-6">
                      <MapPin className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 mb-4">{t.profile.noAddresses}</p>
                      <Link href="/profile">
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          {t.checkout.addNewAddress}
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((address) => (
                        <button
                          key={address.id}
                          onClick={() => setSelectedAddressId(address.id)}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 text-left transition-all',
                            selectedAddressId === address.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{address.title}</span>
                                {address.isDefault && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">
                                    {t.profile.defaultAddress}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{address.fullAddress}</p>
                            </div>
                            {selectedAddressId === address.id && (
                              <Check className="h-5 w-5 text-primary-500 shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-slate-600 dark:text-slate-400">{pickupAddress}</p>
                </div>
              )}
            </Card>

            {/* Payment Method */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary-500" />
                {t.checkout.paymentMethod}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-center transition-all',
                      selectedPayment === method.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <div className="relative h-10 w-full mb-2">
                      <Image
                        src={method.logo}
                        alt={method.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="font-medium text-sm">{method.name}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Order Notes */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t.checkout.orderNotes}</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.checkout.notesPlaceholder}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
              />
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">{t.checkout.orderSummary}</h2>

              {/* Items Preview */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                      {item.product.photos?.[0] ? (
                        <Image
                          src={item.product.photos[0]}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.quantity} × {item.rentalDays} {t.product.days}
                      </p>
                      <p className="text-sm font-semibold text-primary-500">
                        {formatPrice(item.totalPrice)} UZS
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rental Period */}
              {items[0] && (
                <div className="py-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t.cart.rentalPeriod}</p>
                  <p className="font-medium">
                    {formatDateShort(items[0].rentalStartDate)} — {formatDateShort(items[0].rentalEndDate)}
                  </p>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 py-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t.cart.subtotal}</span>
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
              </div>

              <div className="flex justify-between text-xl font-bold pt-3 border-t border-slate-200 dark:border-slate-700">
                <span>{t.cart.total}</span>
                <span className="text-primary-500">{formatPrice(total)} UZS</span>
              </div>

              <Button
                size="lg"
                className="w-full mt-6"
                onClick={handleSubmit}
                disabled={submitting || (deliveryType === 'DELIVERY' && !selectedAddressId)}
              >
                {submitting ? t.checkout.processing : t.checkout.placeOrder}
              </Button>

              {deliveryType === 'DELIVERY' && addresses.length > 0 && !selectedAddressId && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {t.checkout.selectAddress}
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      <OrderConfirmation
        isOpen={showSuccess}
        orderId={orderId}
        orderDetails={{
          totalAmount: total,
          itemCount: items.length,
          deliveryType: deliveryType,
          paymentMethod: selectedPayment,
          rentalStartDate: items[0]?.rentalStartDate,
          rentalEndDate: items[0]?.rentalEndDate,
        }}
      />
    </>
  );
}
