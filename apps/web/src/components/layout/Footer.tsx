'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, Send, Clock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useBusinessContacts } from '@/lib/business';
import { LogoLockup } from './Logo';

export function Footer() {
  const { t } = useTranslation();
  const contacts = useBusinessContacts();
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    catalog: [
      { label: t('footer.all_categories'), href: '/catalog' },
      { label: t('footer.popular'), href: '/catalog?sort=popular' },
      { label: t('footer.new_arrivals'), href: '/catalog?sort=newest' },
    ],
    company: [
      { label: t('footer.about'), href: '/about' },
      { label: t('footer.delivery'), href: '/delivery' },
      { label: t('footer.payment'), href: '/payment' },
      { label: t('footer.contacts'), href: '/contacts' },
    ],
    support: [
      { label: t('footer.faq'), href: '/faq' },
      { label: t('footer.rental_terms'), href: '/terms' },
      { label: t('footer.privacy_policy'), href: '/privacy' },
    ],
  };

  return (
    <footer className="relative mt-24 border-t border-border bg-card" role="contentinfo">
      {/* The old full-width tagline repeated the H1 (~300 px of nothing on
          every page). A one-line "talk to us" strip instead — only when
          Business Settings actually has a phone or Telegram to offer. */}
      {(contacts.phone || contacts.telegramUrl) && (
        <div className="container mx-auto px-4 pt-10">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">{t('footer.help_strip')}</p>
            <div className="flex flex-wrap gap-2">
              {contacts.phone && (
                <a
                  href={contacts.phoneHref}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-primary hover:text-primary-text"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" /> {contacts.phone}
                </a>
              )}
              {contacts.telegramUrl && (
                <a
                  href={contacts.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-primary hover:text-primary-text"
                >
                  <Send className="h-4 w-4" aria-hidden="true" /> Telegram
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4">
        <hr className="u-rule my-10" />
      </div>
      <div className="container mx-auto px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex h-11 items-center" aria-label="Rent Event — Home">
              <LogoLockup tagline={t('header.tagline')} />
            </Link>
            {/* Only real profiles: a dead social icon reads as an abandoned
                site. Telegram comes from Business Settings. */}
            {contacts.telegramUrl && (
              <>
                <p className="eyebrow text-muted-foreground">{t('footer.social')}</p>
                <div className="flex gap-3">
                  <a
                    href={contacts.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-white"
                    aria-label="Telegram"
                  >
                    <Send className="h-5 w-5" />
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Catalog Links */}
          <nav aria-label={t('footer.catalog')}>
            <h3 className="eyebrow text-muted-foreground mb-4">{t('footer.catalog')}</h3>
            <ul className="space-y-2">
              {footerLinks.catalog.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary-text transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company Links */}
          <nav aria-label={t('footer.company')}>
            <h3 className="eyebrow text-muted-foreground mb-4">{t('footer.company')}</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary-text transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact Info */}
          <div>
            <h3 className="eyebrow text-muted-foreground mb-4">{t('footer.contacts')}</h3>
            <ul className="space-y-3">
              {contacts.phone && (
                <li>
                  <a
                    href={contacts.phoneHref}
                    className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary-text"
                  >
                    <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {contacts.phone}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`mailto:${contacts.email}`}
                  className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary-text"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {contacts.email}
                </a>
              </li>
              {contacts.address && (
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{contacts.address}</span>
                </li>
              )}
              {contacts.workingHours && (
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{contacts.workingHours}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {t('footer.copyright', { year: currentYear })}
          </p>
          <nav aria-label={t('footer.support')}>
            <div className="flex gap-6">
              {footerLinks.support.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-primary-text transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
