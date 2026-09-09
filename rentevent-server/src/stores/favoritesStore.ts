'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/lib/website/types';
import { userApi } from '@/lib/website/api';

interface FavoritesState {
  favorites: Product[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFavorites: () => Promise<void>;
  addToFavorites: (product: Product) => Promise<void>;
  removeFromFavorites: (productId: string) => Promise<void>;
  toggleFavorite: (product: Product) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  clearError: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      favoriteIds: new Set(),
      isLoading: false,
      error: null,

      fetchFavorites: async () => {
        set({ isLoading: true, error: null });
        try {
          const favorites = await userApi.getFavorites();
          const favoriteIds = new Set(favorites.map((p) => p.id));
          set({ favorites, favoriteIds, isLoading: false });
        } catch (error) {
          set({ isLoading: false, error: 'Failed to fetch favorites' });
        }
      },

      addToFavorites: async (product) => {
        const { favorites, favoriteIds } = get();

        // Optimistic update
        const newFavorites = [...favorites, product];
        const newFavoriteIds = new Set(favoriteIds);
        newFavoriteIds.add(product.id);
        set({ favorites: newFavorites, favoriteIds: newFavoriteIds });

        try {
          await userApi.addToFavorites(product.id);
        } catch (error) {
          // Rollback on error
          set({ favorites, favoriteIds });
          throw error;
        }
      },

      removeFromFavorites: async (productId) => {
        const { favorites, favoriteIds } = get();

        // Optimistic update
        const newFavorites = favorites.filter((p) => p.id !== productId);
        const newFavoriteIds = new Set(favoriteIds);
        newFavoriteIds.delete(productId);
        set({ favorites: newFavorites, favoriteIds: newFavoriteIds });

        try {
          await userApi.removeFromFavorites(productId);
        } catch (error) {
          // Rollback on error
          set({ favorites, favoriteIds });
          throw error;
        }
      },

      toggleFavorite: async (product) => {
        const { isFavorite, addToFavorites, removeFromFavorites } = get();

        if (isFavorite(product.id)) {
          await removeFromFavorites(product.id);
        } else {
          await addToFavorites(product);
        }
      },

      isFavorite: (productId) => {
        return get().favoriteIds.has(productId);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'favorites-storage',
      partialize: (state) => ({
        favorites: state.favorites,
        favoriteIds: Array.from(state.favoriteIds),
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<FavoritesState>),
        favoriteIds: new Set((persisted as { favoriteIds?: string[] })?.favoriteIds || []),
      }),
    }
  )
);
