'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

import { useLanguageStore } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { ProductCard } from '@/components/website/catalog/ProductCard';
import { Button } from '@/components/website/ui';

export default function FavoritesPage() {
  const router = useRouter();
  const { t } = useLanguageStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { favorites, isLoading, fetchFavorites } = useFavoritesStore();

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth?from=/favorites');
      return;
    }

    fetchFavorites();
  }, [isAuthenticated, _hasHydrated, router, fetchFavorites]);

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="h-24 w-24 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
            <Heart className="h-12 w-12 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t.favoritesPage.empty}</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{t.favoritesPage.emptyDescription}</p>
          <Link href="/catalog">
            <Button size="lg">{t.cart.goToCatalog}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t.favoritesPage.title}</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {favorites.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
