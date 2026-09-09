import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Header } from './Header';
import { Footer } from './Footer';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // Focus management on route changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Scroll to top and move focus to main content on navigation
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {t('header.skip_to_content')}
      </a>

      <Header />
      <main
        id="main-content"
        ref={mainRef}
        className="flex-1"
        tabIndex={-1}
        role="main"
        style={{ outline: 'none' }}
      >
        <Outlet />
      </main>
      <Footer />

      {/* Live region for dynamic notifications */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="notification-region" />

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          className: 'bg-card text-foreground border border-border shadow-xl',
          success: {
            iconTheme: {
              primary: 'rgb(var(--primary))',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'rgb(var(--destructive))',
              secondary: 'white',
            },
          },
        }}
      />
    </div>
  );
}
