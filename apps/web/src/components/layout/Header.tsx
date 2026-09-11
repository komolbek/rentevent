'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  Phone,
  Mail,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { useThemeStore } from '@/stores/theme-store';
import { useLanguageStore } from '@/stores/language-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import type { Locale } from '@/lib/i18n';

const LOCALES: { code: Locale; label: string; full: string }[] = [
  { code: 'ru', label: 'RU', full: 'Русский' },
  { code: 'uz', label: 'UZ', full: 'O‘zbekcha' },
  { code: 'en', label: 'EN', full: 'English' },
];

export const CONTACT_PHONE_HREF = 'tel:+998901234567';
export const CONTACT_PHONE_LABEL = '+998 90 123 45 67';
export const CONTACT_EMAIL = 'info@rentevent.uz';

/**
 * Site header, proportioned after the Fair.Rent reference the client sent:
 * one ~80px bar — logo lockup left, small uppercase nav with a hairline
 * search underneath in the centre, a compact icon cluster over a phone/email
 * row on the right — and the language switch as a small tab hanging from the
 * top edge instead of a full-width utility strip.
 */
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const mobileSearchRef = useRef<HTMLInputElement>(null);

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

  // Keep the search box in step with the catalog's ?q= so the query the
  // visitor is looking at is the one shown in the box. Read from
  // window.location rather than useSearchParams: the header renders in the
  // root layout, where useSearchParams would force a Suspense boundary.
  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    if (pathname === '/catalog') {
      const q = new URLSearchParams(window.location.search).get('q') || '';
      setQuery(q);
    } else {
      setQuery('');
    }
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  }, [logout, router]);

  const toggleTheme = useCallback(() => {
    if (theme === 'system') setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    else setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, resolvedTheme, setTheme]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setIsMenuOpen(false);
    router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog');
  };

  // Sections only — favourites, cart and account are utilities and live in
  // the icon cluster. The catalog is not here either: on desktop it is the
  // red "Арендовать" tab on the right edge (the fair.rent pattern), so
  // listing it twice would just be noise. The phone menu, where the tab is
  // hidden, keeps a Catalog entry.
  const navLinks = [
    { href: '/sets', label: t('nav.sets') },
    { href: '/events', label: t('nav.events') },
    { href: '/delivery', label: t('nav.delivery') },
    { href: '/about', label: t('footer.about') },
    { href: '/contacts', label: t('nav.contacts') },
  ];
  const mobileNavLinks = [{ href: '/catalog', label: t('nav.catalog') }, ...navLinks];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const iconBtn =
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground';

  const contactLink =
    'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/70 transition-colors hover:text-primary-text';

  const localeSelect = (className?: string) => (
    <label className={cn('relative inline-flex items-center', className)}>
      <span className="sr-only">{t('header.language')}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="cursor-pointer appearance-none bg-transparent py-1 pl-1 pr-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} title={l.full}>
            {l.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0.5 h-3 w-3 text-muted-foreground" aria-hidden="true" />
    </label>
  );

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-border bg-background transition-shadow duration-300',
        scrolled ? 'shadow-[0_8px_30px_-24px_rgba(23,23,23,0.6)]' : '',
      )}
      role="banner"
    >
      <div className="container relative mx-auto px-4">
        {/* Language + theme tab, hanging from the top edge (desktop) */}
        <div className="absolute right-4 top-0 hidden items-center gap-0.5 rounded-b-lg border border-t-0 border-border bg-muted pl-2 pr-1.5 lg:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label={t('header.toggle_theme')}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
          </button>
          {localeSelect()}
        </div>

        <div className="flex h-16 items-center gap-6 lg:h-20 lg:items-stretch">
          {/* Logo lockup — the mark plus the name, so a first-time visitor
              can tell what the site is without reading the hero. */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 self-center"
            aria-label="RentEvent — Home"
          >
            <Logo className="h-8 w-auto text-primary dark:text-white lg:h-9" />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-[1.35rem] font-semibold tracking-tight text-foreground">RentEvent</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('header.tagline')}
              </span>
            </span>
          </Link>

          {/* Centre column — nav over search (desktop) */}
          <div className="hidden flex-1 flex-col items-center justify-center gap-2.5 lg:flex">
            <nav className="flex items-center gap-7" aria-label="Main navigation">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
                      active ? 'text-foreground' : 'text-foreground/70 hover:text-foreground',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.label}
                    {active && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <form onSubmit={submitSearch} role="search" className="w-full max-w-[22rem]">
              <label className="flex items-center gap-2 border-b border-foreground/50 pb-1 transition-colors focus-within:border-primary">
                <span className="sr-only">{t('header.search_label')}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('header.search_placeholder')}
                  className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
                <button type="submit" className="shrink-0 text-foreground/70 hover:text-foreground" aria-label={t('header.search_submit')}>
                  <Search className="h-3.5 w-3.5" />
                </button>
              </label>
            </form>
          </div>

          {/* Right column — icon cluster over contact row (desktop) */}
          <div className="ml-auto flex items-center gap-1 lg:flex-col lg:items-end lg:justify-center lg:gap-1.5 lg:pt-4">
            <div className="flex items-center">
              <Link href="/favorites" className={cn(iconBtn, 'hidden sm:inline-flex')} aria-label={t('header.favorites')}>
                <Heart className="h-[18px] w-[18px]" />
              </Link>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className={iconBtn}
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    aria-label={t('header.user_menu')}
                  >
                    <User className="h-[18px] w-[18px]" />
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
                            <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted" role="menuitem">
                              <User className="h-4 w-4 text-muted-foreground" /> <span>{t('header.profile')}</span>
                            </Link>
                            <Link href="/orders" className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted" role="menuitem">
                              <Package className="h-4 w-4 text-muted-foreground" /> <span>{t('header.my_orders')}</span>
                            </Link>
                            <Link href="/favorites" className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted" role="menuitem">
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
                  <User className="h-[18px] w-[18px]" />
                </Link>
              )}

              <Link href="/cart" className={cn(iconBtn, 'relative')} aria-label={t('header.cart')}>
                <ShoppingCart className="h-[18px] w-[18px]" />
                {itemCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => {
                  setIsMenuOpen((v) => !v);
                  setTimeout(() => mobileSearchRef.current?.focus(), 150);
                }}
                className={cn(iconBtn, 'lg:hidden')}
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? t('header.close_menu') : t('header.open_menu')}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            {/* Contact row — direct links, no reveal step */}
            <div className="hidden items-center gap-1.5 lg:flex">
              <a href={CONTACT_PHONE_HREF} className={contactLink} aria-label={`${t('header.phone')}: ${CONTACT_PHONE_LABEL}`}>
                <Phone className="h-3 w-3" /> {t('header.phone')} <ChevronRight className="h-3 w-3" />
              </a>
              <span className="text-[11px] text-muted-foreground">{t('header.or')}</span>
              <a href={`mailto:${CONTACT_EMAIL}`} className={contactLink} aria-label={`${t('header.email')}: ${CONTACT_EMAIL}`}>
                <Mail className="h-3 w-3" /> {t('header.email')} <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* "Rent now" tab — fixed to the right edge of the viewport, the way
          fair.rent does it. This is the one route into the catalog on
          desktop, so it stays in view on every page and every scroll
          position. Hidden below md, where it would sit on top of content. */}
      <Link
        href="/catalog"
        className={cn(
          // rounded-r + rotate(180deg) = rounded on the visible left edge.
          'fixed right-0 top-1/2 z-30 hidden items-center gap-2 rounded-r-lg bg-rent px-2.5 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] transition-colors hover:bg-rent-hover md:flex',
          pathname === '/catalog' && 'md:hidden',
        )}
        style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
        aria-label={t('header.rent_now')}
      >
        <ShoppingCart className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
        {t('header.rent_now')}
      </Link>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border lg:hidden"
          >
            <div className="container mx-auto space-y-4 px-4 py-4">
              <form onSubmit={submitSearch} role="search">
                <label className="flex h-11 items-center gap-3 rounded-xl border border-border bg-card px-3">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="sr-only">{t('header.search_label')}</span>
                  <input
                    ref={mobileSearchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('header.search_placeholder')}
                    className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </form>

              <nav className="space-y-0.5" aria-label="Mobile navigation">
                {mobileNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold uppercase tracking-[0.08em] transition-colors',
                      isActive(link.href) ? 'bg-primary/10 text-primary-text' : 'hover:bg-muted',
                    )}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
                <Link
                  href="/favorites"
                  className="flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-muted sm:hidden"
                >
                  {t('header.favorites')}
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </Link>
              </nav>

              <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
                <a href={CONTACT_PHONE_HREF} className="flex min-h-11 items-center gap-2 rounded-xl bg-muted px-3 text-sm font-medium">
                  <Phone className="h-4 w-4 text-primary" /> {CONTACT_PHONE_LABEL}
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex min-h-11 items-center gap-2 truncate rounded-xl bg-muted px-3 text-sm font-medium">
                  <Mail className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{CONTACT_EMAIL}</span>
                </a>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-xs font-medium"
                    aria-label={t('header.toggle_theme')}
                  >
                    {resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    {t('header.theme')}
                  </button>
                  <div className="inline-flex h-9 items-center rounded-full border border-border px-2">
                    {localeSelect()}
                  </div>
                </div>
                {!isAuthenticated && (
                  <Link
                    href="/auth"
                    className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
                  >
                    {t('header.login')}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
