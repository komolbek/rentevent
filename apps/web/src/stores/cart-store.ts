'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IProduct } from '@rentevent/types';
import { calculatePrice, calculateRentalDays } from '@/lib/utils';

/**
 * Delivery in Tashkent is free from this order subtotal (the /delivery page
 * and FAQ both say so). Below it the fee depends on the district and is
 * agreed when the order is confirmed, so the cart never guesses a number —
 * it says "calculated on confirmation" and how far the free threshold is.
 */
export const FREE_DELIVERY_THRESHOLD = 500_000;

export interface DeliveryStatus {
  /** Subtotal has reached the free-delivery threshold. */
  free: boolean;
  /** Сум still missing to reach it (0 when free). */
  remaining: number;
}

export function getDeliveryStatus(subtotal: number): DeliveryStatus {
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  return { free: remaining === 0, remaining };
}

export interface CartItem {
  productId: string;
  product: IProduct;
  quantity: number;
  rentalStartDate: string;
  rentalEndDate: string;
  rentalDays: number;
  dailyPrice: number;
  totalPrice: number;
  savings: number;
  /**
   * The fair this item was added for. Its event price (`product.eventPrice`,
   * fetched with that event) replaces the normal price and tiers, the same
   * rule the API applies when the order names the event.
   */
  eventId?: string | null;
}

/** The fair the cart is being rented for, if any item was added for one. */
export function cartEventId(items: CartItem[]): string | undefined {
  return items.find((i) => i.eventId)?.eventId ?? undefined;
}

interface CartState {
  items: CartItem[];
  deliveryFee: number;

  // Computed
  subtotal: number;
  totalSavings: number;
  total: number;
  itemCount: number;

  // Actions
  addItem: (product: IProduct, quantity: number, startDate: Date, endDate: Date, eventId?: string | null) => void;
  updateItem: (productId: string, updates: Partial<Pick<CartItem, 'quantity' | 'rentalStartDate' | 'rentalEndDate'>>) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setDeliveryFee: (fee: number) => void;
  recalculateTotals: () => void;
}

const calculateItemPrice = (
  product: IProduct,
  quantity: number,
  startDate: Date,
  endDate: Date,
  eventId?: string | null,
): Pick<CartItem, 'rentalDays' | 'dailyPrice' | 'totalPrice' | 'savings'> => {
  const rentalDays = calculateRentalDays(startDate, endDate);
  if (eventId && product.eventPrice != null) {
    // FLAT: one price per item for the whole fair, whatever the day count.
    const flat = product.eventPriceMode === 'FLAT';
    const totalPrice = flat ? product.eventPrice * quantity : product.eventPrice * rentalDays * quantity;
    return {
      rentalDays,
      dailyPrice: flat ? Math.round(product.eventPrice / rentalDays) : product.eventPrice,
      totalPrice,
      savings: 0,
    };
  }
  const { totalPrice, dailyPriceUsed, savings } = calculatePrice(
    product.dailyPrice,
    rentalDays,
    quantity,
    product.pricingTiers,
    product.quantityPricing,
  );

  return {
    rentalDays,
    dailyPrice: dailyPriceUsed,
    totalPrice,
    savings,
  };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      deliveryFee: 0,
      subtotal: 0,
      totalSavings: 0,
      total: 0,
      itemCount: 0,

      addItem: (product, quantity, startDate, endDate, eventId) => {
        const { items } = get();
        const existingIndex = items.findIndex((item) => item.productId === product.id);

        const priceInfo = calculateItemPrice(product, quantity, startDate, endDate, eventId);
        const newItem: CartItem = {
          productId: product.id,
          product,
          quantity,
          rentalStartDate: startDate.toISOString(),
          rentalEndDate: endDate.toISOString(),
          eventId: eventId ?? null,
          ...priceInfo,
        };

        let newItems: CartItem[];
        if (existingIndex >= 0) {
          newItems = [...items];
          newItems[existingIndex] = newItem;
        } else {
          newItems = [...items, newItem];
        }

        const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalSavings = newItems.reduce((sum, item) => sum + item.savings, 0);
        const { deliveryFee } = get();

        set({
          items: newItems,
          subtotal,
          totalSavings,
          total: subtotal + deliveryFee,
          itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        });
      },

      updateItem: (productId, updates) => {
        const { items, deliveryFee } = get();
        const itemIndex = items.findIndex((item) => item.productId === productId);

        if (itemIndex < 0) return;

        const item = items[itemIndex];
        const newQuantity = updates.quantity ?? item.quantity;
        const newStartDate = updates.rentalStartDate
          ? new Date(updates.rentalStartDate)
          : new Date(item.rentalStartDate);
        const newEndDate = updates.rentalEndDate
          ? new Date(updates.rentalEndDate)
          : new Date(item.rentalEndDate);

        const priceInfo = calculateItemPrice(item.product, newQuantity, newStartDate, newEndDate, item.eventId);

        const newItems = [...items];
        newItems[itemIndex] = {
          ...item,
          quantity: newQuantity,
          rentalStartDate: newStartDate.toISOString(),
          rentalEndDate: newEndDate.toISOString(),
          ...priceInfo,
        };

        const subtotal = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
        const totalSavings = newItems.reduce((sum, i) => sum + i.savings, 0);

        set({
          items: newItems,
          subtotal,
          totalSavings,
          total: subtotal + deliveryFee,
          itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
        });
      },

      removeItem: (productId) => {
        const { items, deliveryFee } = get();
        const newItems = items.filter((item) => item.productId !== productId);

        const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalSavings = newItems.reduce((sum, item) => sum + item.savings, 0);

        set({
          items: newItems,
          subtotal,
          totalSavings,
          total: subtotal + deliveryFee,
          itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        });
      },

      clearCart: () => {
        set({
          items: [],
          subtotal: 0,
          totalSavings: 0,
          total: 0,
          itemCount: 0,
          deliveryFee: 0,
        });
      },

      setDeliveryFee: (fee) => {
        const { subtotal } = get();
        set({ deliveryFee: fee, total: subtotal + fee });
      },

      recalculateTotals: () => {
        const { items, deliveryFee } = get();
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const totalSavings = items.reduce((sum, item) => sum + item.savings, 0);

        set({
          subtotal,
          totalSavings,
          total: subtotal + deliveryFee,
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        });
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        deliveryFee: state.deliveryFee,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.recalculateTotals();
        }
      },
    },
  ),
);

/**
 * True once the persisted cart has been read from localStorage. Starts false
 * on both server and client so the first paint matches; pages show a
 * skeleton instead of an empty cart (or nothing) for that one frame.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true));
    if (useCartStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}
