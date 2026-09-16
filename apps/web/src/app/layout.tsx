import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { Header, Footer } from '@/components/layout';
import './globals.css';

const SITE_URL = 'https://rentevent.uz';
// Russian by default: it is the site's default locale (`<html lang="ru">`);
// the UI language itself is a client-side store, so the document metadata
// cannot follow it — RU is what search engines and link previews get.
const SITE_TITLE = 'RentEvent — аренда оборудования для мероприятий в Ташкенте';
const SITE_DESCRIPTION = 'Мебель, декор, свет и звук — от 1 дня, с доставкой по Ташкенту.';

// Icons, apple-touch-icon and the OG image come from the file conventions in
// this directory (favicon.ico, icon.svg, apple-icon.png, opengraph-image.png);
// Next emits the <link>/<meta> tags for them, so none are hand-written here.
// metadataBase makes the generated og:image URL absolute — relative paths
// break link previews.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s — RentEvent' },
  description: SITE_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'RentEvent',
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
        {/* Colour scheme follows the OS, nothing else: there is no manual
            toggle (spec §3.3). Runs before paint so a dark-OS visitor never
            sees a light flash; the listener follows live OS changes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mq = window.matchMedia('(prefers-color-scheme: dark)');
                  var apply = function(dark) { document.documentElement.classList.toggle('dark', dark); };
                  apply(mq.matches);
                  mq.addEventListener('change', function(e) { apply(e.matches); });
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
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
        </Providers>
      </body>
    </html>
  );
}
