import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Instagram, Facebook, Send } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function Footer() {
  const { t } = useTranslation();
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
    <footer className="bg-card border-t border-border mt-auto" role="contentinfo">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2" aria-label="RentEvent - Home">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl">4</span>
              </div>
              <span className="font-bold text-xl">RentEvent</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              {t('footer.description')}
            </p>
            <div className="flex gap-3">
              <motion.a
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                aria-label="Telegram"
              >
                <Send className="h-5 w-5" />
              </motion.a>
            </div>
          </div>

          {/* Catalog Links */}
          <nav aria-label={t('footer.catalog')}>
            <h3 className="font-semibold mb-4">{t('footer.catalog')}</h3>
            <ul className="space-y-2">
              {footerLinks.catalog.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company Links */}
          <nav aria-label={t('footer.company')}>
            <h3 className="font-semibold mb-4">{t('footer.company')}</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4">{t('footer.contacts')}</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="tel:+998901234567"
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm"
                  aria-label="Phone: +998 90 123 45 67"
                >
                  <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  +998 90 123 45 67
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@rentevent.uz"
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm"
                  aria-label="Email: info@rentevent.uz"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  info@rentevent.uz
                </a>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t('footer.address')}</span>
              </li>
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
                  to={link.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
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
