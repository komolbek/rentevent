import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { Header, Footer, BottomTabBar } from '@/components/layout';
import { themeInitScript } from '@/lib/theme';
import './globals.css';

const SITE_URL = 'https://rentevent.uz';
// Russian by default: it is the site's default locale (`<html lang="ru">`);
// the UI language itself is a client-side store, so the document metadata
// cannot follow it — RU is what search engines and link previews get.
// The browser tab reads "Rent Event"; the longer line is the description.
const SITE_TITLE = 'Rent Event';
const SITE_DESCRIPTION =
  'Аренда мебели и оборудования для выставок и мероприятий в Ташкенте — от 1 дня, с доставкой.';

// Icons, apple-touch-icon and the OG image come from the file conventions in
// this directory (favicon.ico, icon.svg, apple-icon.png, opengraph-image.png);
// Next emits the <link>/<meta> tags for them, so none are hand-written here.
// metadataBase makes the generated og:image URL absolute — relative paths
// break link previews.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s — Rent Event' },
  description: SITE_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Rent Event',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

// No maximumScale: locking pinch-zoom is a WCAG 1.4.4 failure and hurts
// anyone reading small type on a phone.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the bottom tab bar pad itself with env(safe-area-inset-bottom).
  viewportFit: 'cover',
  themeColor: '#F2562B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Theme (system / light / dark): applied before paint so there is no
            flash; src/lib/theme.ts holds the script text. The CSP allows
            inline scripts ('unsafe-inline'), no hash to update. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      {/* Bottom padding reserves the mobile tab bar's height (56 px + safe area). */}
      <body className="min-h-screen bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))] font-sans text-foreground antialiased md:pb-0">
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
          >
            Перейти к содержимому
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <BottomTabBar />
        </Providers>
      </body>
    </html>
  );
}
