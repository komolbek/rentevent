'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  User,
  Menu,
  X,
  Sun,
  Moon,
  Heart,
  Package,
  LogOut,
  Globe,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { useThemeStore } from '@/stores/theme-store';
import { useLanguageStore } from '@/stores/language-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { Logo } from './Logo';
import type { Locale } from '@/lib/i18n';

const LOCALE_LABELS: Record<Locale, string> = { ru: 'RU', en: 'EN', uz: 'UZ' };

const CONTACT_PHONE_HREF = 'tel:+998901234567';
const CONTACT_PHONE_LABEL = '+998 90 123 45 67';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount);
  const { resolvedTheme, setTheme, theme } = useThemeStore();
  const { locale, setLocale } = useLanguageStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  }, [logout, router]);

  const toggleTheme = useCallback(() => {
    if (theme === 'system') setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    else setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, resolvedTheme, setTheme]);

  const cycleLocale = useCallback(() => {
    const locales: Locale[] = ['ru', 'en', 'uz'];
    setLocale(locales[(locales.indexOf(locale) + 1) % locales.length]);
  }, [locale, setLocale]);

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/catalog', label: t('nav.catalog') },
    { href: '/sets', label: t('nav.sets') },
    { href: '/events', label: t('nav.events') },
    { href: '/favorites', label: t('header.favorites') },
  ];

  const iconBtn =
    'inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground';

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full bg-background transition-shadow duration-300',
        scrolled ? 'shadow-[0_8px_30px_-24px_rgba(23,23,23,0.6)]' : '',
      )}
      role="banner"
    >
      {/* Tier 1 — utility strip. Tokenised warm neutral rather than graphite, so
          it sits with the light hero instead of reading as a leftover black bar
          (and still inverts correctly under the dark theme). */}
      <div className="border-b border-border bg-muted text-muted-foreground">
        <div className="container mx-auto flex h-9 items-center justify-end gap-3 px-4 text-xs">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:text-foreground"
            aria-label={t('header.toggle_theme')}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={cycleLocale}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            aria-label={`Language: ${LOCALE_LABELS[locale]}`}
          >
            <Globe className="h-3.5 w-3.5" />
            {LOCALE_LABELS[locale]}
          </button>
        </div>
      </div>

      {/* Tier 2 — main bar */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex h-20 items-center gap-6">
            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center" aria-label="rent event — Home">
              <motion.span whileHover={{ scale: 1.03 }} className="flex">
                <Logo className="h-9 w-auto block dark:hidden" />
                <Logo inverted className="h-9 w-auto hidden dark:block" />
              </motion.span>
            </Link>

            {/* Center column — nav (desktop) */}
            <div className="hidden flex-1 items-center justify-center lg:flex">
              <nav className="flex items-center justify-center gap-9" aria-label="Main navigation">
                {navLinks.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'relative text-sm font-semibold uppercase tracking-wide transition-colors',
                        active ? 'text-foreground' : 'text-foreground/70 hover:text-foreground',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      {link.label}
                      {active && (
                        <motion.span
                          layoutId="nav-indicator"
                          className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-primary"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right column — icon cluster over contact (desktop) */}
            <div className="ml-auto flex items-center gap-1 lg:flex-col lg:items-end lg:gap-1.5">
              <div className="flex items-center gap-0.5">
                <Link href="/favorites" className={cn(iconBtn, 'hidden sm:inline-flex')} aria-label={t('header.favorites')}>
                  <Heart className="h-5 w-5" />
                </Link>

                {/* Account */}
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen((v) => !v)}
                      className={iconBtn}
                      aria-expanded={isUserMenuOpen}
                      aria-haspopup="true"
                      aria-label={t('header.user_menu')}
                    >
                      <User className="h-5 w-5" />
                    </button>
                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} aria-hidden="true" />
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.97 }}
                            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card py-2 shadow-xl"
                            role="menu"
                          >
                            <div className="border-b border-border px-4 py-3">
                              <p className="truncate font-medium">{user?.name || t('header.user_default_name')}</p>
                              <p className="truncate text-sm text-muted-foreground">{user?.phoneNumber}</p>
                            </div>
                            <div className="py-1">
                              <Link href="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted" role="menuitem">
                                <User className="h-4 w-4 text-muted-foreground" /> <span>{t('header.profile')}</span>
                              </Link>
                              <Link href="/orders" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted" role="menuitem">
                                <Package className="h-4 w-4 text-muted-foreground" /> <span>{t('header.my_orders')}</span>
                              </Link>
                              <Link href="/favorites" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted" role="menuitem">
                                <Heart className="h-4 w-4 text-muted-foreground" /> <span>{t('header.favorites')}</span>
                              </Link>
                            </div>
                            <div className="border-t border-border pt-1">
                              <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-destructive transition-colors hover:bg-muted" role="menuitem">
                                <LogOut className="h-4 w-4" /> <span>{t('header.logout')}</span>
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link href="/auth" className={iconBtn} aria-label={t('header.login')}>
                    <User className="h-5 w-5" />
                  </Link>
                )}

                {/* Cart */}
                <Link href="/cart" className={cn(iconBtn, 'relative')} aria-label={t('header.cart')}>
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Link>

                {/* Mobile menu */}
                <button onClick={() => setIsMenuOpen((v) => !v)} className={cn(iconBtn, 'lg:hidden')} aria-expanded={isMenuOpen} aria-label={isMenuOpen ? t('header.close_menu') : t('header.open_menu')}>
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>

              {/* Contact — tap to reveal the phone number (desktop) */}
              <div className="hidden items-center text-xs font-semibold uppercase tracking-wide text-foreground/70 lg:flex">
                {showPhone ? (
                  <a
                    href={CONTACT_PHONE_HREF}
                    className="inline-flex items-center gap-1.5 text-primary-text"
                    aria-label={`Phone: ${CONTACT_PHONE_LABEL}`}
                  >
                    <Phone className="h-3.5 w-3.5" /> {CONTACT_PHONE_LABEL}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPhone(true)}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-primary-text"
                    aria-label={t('header.phone')}
                  >
                    <Phone className="h-3.5 w-3.5" /> {t('header.phone')} <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-border lg:hidden"
          >
            <div className="container mx-auto space-y-3 px-4 py-4">
              <nav className="space-y-1" aria-label="Mobile navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'block rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors',
                      pathname === link.href ? 'bg-primary/10 text-primary-text' : 'hover:bg-muted',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-4 border-t border-border px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                <a href={CONTACT_PHONE_HREF} className="inline-flex items-center gap-1.5 hover:text-primary-text">
                  <Phone className="h-3.5 w-3.5" /> {CONTACT_PHONE_LABEL}
                </a>
              </div>
              {!isAuthenticated && (
                <Link href="/auth" onClick={() => setIsMenuOpen(false)} className="block">
                  <Button size="sm" variant="primary" className="w-full">
                    {t('header.login')}
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
