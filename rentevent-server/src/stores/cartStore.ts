'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, CartItem } from '@/lib/website/types';
import { calculatePrice, calculateRentalDays } from '@/lib/website/utils';

interface CartState {
  items: CartItem[];
  deliveryFee: number;

  // Computed
  subtotal: number;
  totalSavings: number;
  total: number;
  itemCount: number;

  // Actions
  addItem: (product: Product, quantity: number, startDate: Date, endDate: Date) => void;
  updateItem: (productId: string, updates: Partial<Pick<CartItem, 'quantity' | 'rentalStartDate' | 'rentalEndDate'>>) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setDeliveryFee: (fee: number) => void;
  recalculateTotals: () => void;
}

const calculateItemPrice = (
  product: Product,
  quantity: number,
  startDate: Date,
  endDate: Date
): Pick<CartItem, 'rentalDays' | 'dailyPrice' | 'totalPrice' | 'savings'> => {
  const rentalDays = calculateRentalDays(startDate, endDate);
  const { totalPrice, dailyPriceUsed, savings } = calculatePrice(
    product.dailyPrice,
    rentalDays,
    quantity,
    product.pricingTiers,
    product.quantityPricing
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

      addItem: (product, quantity, startDate, endDate) => {
        const { items } = get();
        const existingIndex = items.findIndex((item) => item.productId === product.id);

        const priceInfo = calculateItemPrice(product, quantity, startDate, endDate);
        const newItem: CartItem = {
          productId: product.id,
          product,
          quantity,
          rentalStartDate: startDate.toISOString(),
          rentalEndDate: endDate.toISOString(),
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

        const priceInfo = calculateItemPrice(item.product, newQuantity, newStartDate, newEndDate);

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
    }
  )
);
