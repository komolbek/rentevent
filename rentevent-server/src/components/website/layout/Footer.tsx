'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Instagram, Facebook, Send } from 'lucide-react';
import { useLanguageStore } from '@/stores/languageStore';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguageStore();

  const footerLinks = {
    catalog: [
      { label: t.footer.allCategories, href: '/catalog' },
      { label: t.footer.popular, href: '/catalog?sort=popular' },
      { label: t.footer.newest, href: '/catalog?sort=newest' },
    ],
    company: [
      { label: t.footer.aboutUs, href: '/about' },
      { label: t.footer.delivery, href: '/delivery' },
      { label: t.footer.payment, href: '/payment' },
      { label: t.footer.contacts, href: '/contacts' },
    ],
    support: [
      { label: t.footer.faq, href: '/faq' },
      { label: t.footer.rentalTerms, href: '/terms' },
      { label: t.footer.privacyPolicy, href: '/privacy' },
    ],
  };

  return (
    <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/logo-horizontal.svg"
                alt="RentEvent"
                width={200}
                height={58}
                className="h-[58px] w-auto"
              />
            </Link>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t.footer.description}
            </p>
            <div className="flex gap-3">
              <motion.a
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-primary-500 hover:text-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-primary-500 hover:text-white transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-primary-500 hover:text-white transition-colors"
              >
                <Send className="h-5 w-5" />
              </motion.a>
            </div>
          </div>

          {/* Catalog Links */}
          <div>
            <h3 className="font-semibold mb-4">{t.footer.catalog}</h3>
            <ul className="space-y-2">
              {footerLinks.catalog.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-4">{t.footer.company}</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4">{t.footer.contacts}</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="tel:+998901234567"
                  className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-colors text-sm"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  +998 90 123 45 67
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@rentevent.uz"
                  className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-colors text-sm"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  info@rentevent.uz
                </a>
              </li>
              <li className="flex items-start gap-3 text-slate-500 dark:text-slate-400 text-sm">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t.footer.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-200 dark:border-slate-700 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © {currentYear} RentEvent. {t.footer.allRightsReserved}.
          </p>
          <div className="flex gap-6">
            {footerLinks.support.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
