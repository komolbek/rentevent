'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, CreditCard, ShoppingCart, Smartphone } from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Reveal } from './Reveal';

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.18-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.31-.89-2.32-3.54ZM14.18 6.13c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.58-2.57 1.32-.56.65-1.06 1.69-.93 2.69.98.08 1.98-.5 2.59-1.23Z" />
    </svg>
  );
}

function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path fill="#34A853" d="M3.6 2.3 13.3 12l-9.7 9.7c-.37-.2-.6-.6-.6-1.07V3.37c0-.47.23-.87.6-1.07Z" />
      <path fill="#FBBC04" d="m16.6 15.3-3.3-3.3 3.3-3.3 3.72 2.15c.92.53.92 1.77 0 2.3L16.6 15.3Z" />
      <path fill="#4285F4" d="M16.6 15.3 13.3 12l-9.7 9.7c.33.18.75.18 1.13-.04L16.6 15.3Z" />
      <path fill="#EA4335" d="M16.6 8.7 4.73 2.34A1.15 1.15 0 0 0 3.6 2.3l9.7 9.7 3.3-3.3Z" />
    </svg>
  );
}

function StoreButton({
  href,
  icon,
  small,
  big,
}: {
  href: string | null;
  icon: React.ReactNode;
  small: string;
  big: string;
}) {
  const body = (
    <>
      {icon}
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] opacity-75">{small}</span>
        <span className="text-base font-semibold">{big}</span>
      </span>
    </>
  );
  const cls =
    'inline-flex h-14 min-w-[10.5rem] items-center gap-3 rounded-2xl px-4 transition-[transform,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} bg-brand-graphite text-white hover:-translate-y-0.5`}>
      {body}
    </a>
  ) : (
    // No link in admin yet: shown as "coming soon", never a dead link.
    <span className={`${cls} cursor-default bg-white/15 text-white/90 ring-1 ring-white/25`} aria-disabled="true">
      {body}
    </span>
  );
}

/**
 * Download-the-app band (fair.rent "Your order in three steps"): the three
 * steps, store badges from admin → Настройки, and one QR code that sends a
 * phone to the right store via /app (or to the site while the app is not
 * published).
 */
export function AppDownload() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: () => settingsApi.getBusinessInfo(),
    staleTime: 10 * 60 * 1000,
  });
  const appStoreUrl = data?.appStoreUrl?.trim() || null;
  const playStoreUrl = data?.playStoreUrl?.trim() || null;
  const hasApp = Boolean(appStoreUrl || playStoreUrl);

  // The QR encodes this site's own /app address, so it is right on every
  // deploy (preview, staging, prod) without configuration.
  const [origin, setOrigin] = useState('https://rentevent.uz');
  useEffect(() => setOrigin(window.location.origin), []);
  const qrValue = hasApp ? `${origin}/app` : origin;

  const steps = [
    { icon: CalendarDays, text: t('app.step_1') },
    { icon: ShoppingCart, text: t('app.step_2') },
    { icon: CreditCard, text: t('app.step_3') },
  ];

  return (
    <section className="container mx-auto px-4 pt-14 sm:pt-20" aria-labelledby="app-download-title">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14"
          style={{ background: 'linear-gradient(125deg, #F2562B 0%, #E9481F 50%, #B83C1C 100%)' }}
        >
          <div className="u-grain pointer-events-none absolute inset-0" aria-hidden="true">
            <div
              className="absolute -right-24 -top-28 h-[26rem] w-[26rem] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.55), transparent 65%)' }}
            />
          </div>
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="eyebrow mb-3 inline-flex items-center gap-2 text-white/85">
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                {t('app.eyebrow')}
              </p>
              <h2 id="app-download-title" className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {t('app.title')}
              </h2>
              <p className="mt-3 max-w-xl text-white/85 sm:text-lg">
                {hasApp ? t('app.subtitle') : t('app.subtitle_soon')}
              </p>

              <ol className="mt-7 grid gap-3 sm:grid-cols-3">
                {steps.map(({ icon: Icon, text }, i) => (
                  <li key={text} className="flex items-center gap-3 rounded-2xl bg-white/12 p-3 ring-1 ring-white/20 backdrop-blur-sm sm:flex-col sm:items-start sm:p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-text">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium leading-snug">
                      <span className="mr-1 font-display font-bold">{i + 1}.</span>
                      {text}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-7 flex flex-wrap gap-3">
                <StoreButton
                  href={appStoreUrl}
                  icon={<AppleMark />}
                  small={appStoreUrl ? t('app.download_on') : t('app.coming_soon')}
                  big="App Store"
                />
                <StoreButton
                  href={playStoreUrl}
                  icon={<PlayMark />}
                  small={playStoreUrl ? t('app.get_it_on') : t('app.coming_soon')}
                  big="Google Play"
                />
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <figure className="w-full max-w-[16rem] rounded-3xl bg-white p-5 text-center text-brand-graphite shadow-[0_30px_60px_-25px_rgba(60,15,5,0.7)]">
                <QRCodeSVG
                  value={qrValue}
                  size={512}
                  level="M"
                  fgColor="#171717"
                  bgColor="#ffffff"
                  marginSize={0}
                  className="h-auto w-full"
                  title={t('app.qr_alt')}
                />
                <figcaption className="mt-4 text-sm font-semibold leading-snug">
                  {hasApp ? t('app.qr_caption') : t('app.qr_caption_site')}
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
