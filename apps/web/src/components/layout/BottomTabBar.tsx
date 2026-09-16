'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Search, ShoppingCart, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

/** Fired by the Search tab; the header listens and opens its search field. */
export const OPEN_SEARCH_EVENT = 'rentevent:open-search';

/**
 * Persistent way into the catalog on phones (spec §3.4). The desktop has the
 * fixed "Арендовать" tab; below `md` that is hidden and the burger used to
 * be the only route to the product — the catalog. Four tabs, 56 px plus the
 * home-indicator safe area. `body` reserves the same height at the bottom
 * (app/layout.tsx) so nothing ends up underneath it.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const itemCount = useCartStore((s) => s.itemCount);

  // The gate page is a single field on an empty screen; no chrome there.
  if (pathname === '/coming-soon') return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const tabClass = (active: boolean) =>
    cn(
      'relative flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium leading-none outline-none transition-colors',
      'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50',
      active ? 'text-primary-text' : 'text-muted-foreground hover:text-foreground',
    );

  const openSearch = () => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));

  return (
    <nav
      aria-label={t('nav.mobile_tabs')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex items-stretch">
        <Link href="/catalog" className={tabClass(isActive('/catalog'))} aria-current={isActive('/catalog') ? 'page' : undefined}>
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          {t('nav.catalog')}
        </Link>
        <button type="button" onClick={openSearch} className={tabClass(false)}>
          <Search className="h-5 w-5" aria-hidden="true" />
          {t('nav.search')}
        </button>
        <Link href="/cart" className={tabClass(isActive('/cart'))} aria-current={isActive('/cart') ? 'page' : undefined}>
          <span className="relative">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </span>
          {t('header.cart')}
        </Link>
        <Link
          href={isAuthenticated ? '/profile' : '/auth'}
          className={tabClass(isActive('/profile') || isActive('/auth'))}
          aria-current={isActive('/profile') || isActive('/auth') ? 'page' : undefined}
        >
          <User className="h-5 w-5" aria-hidden="true" />
          {t('header.profile')}
        </Link>
      </div>
    </nav>
  );
}
