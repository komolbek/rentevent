'use client';

import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function ContactsPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: '',
  });
  // There is no contact endpoint on the API, and the old form only pretended
  // to send (a 1s timer and a "sent!" toast). Hand the message to the
  // visitor's email client instead — honest, and it actually reaches us.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      toast.error(t('contacts.form_fill_all'));
      return;
    }

    const subject = `RentEvent — ${formData.name.trim()}`;
    const body = `${formData.message.trim()}\n\n${formData.name.trim()}\n${formData.phone.trim()}`;
    window.location.href = `mailto:info@rentevent.uz?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const contactInfo = [
    {
      icon: Phone,
      title: t('contacts.phone'),
      value: '+998 90 123 45 67',
      href: 'tel:+998901234567',
    },
    {
      icon: Mail,
      title: t('contacts.email'),
      value: 'info@rentevent.uz',
      href: 'mailto:info@rentevent.uz',
    },
    {
      icon: MessageCircle,
      title: t('contacts.telegram'),
      value: '@rentevent_uz',
      href: 'https://t.me/rentevent_uz',
    },
    {
      icon: Clock,
      title: t('contacts.hours'),
      value: t('contacts.hours_value'),
      href: null,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4">{t('contacts.title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('contacts.subtitle')}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Contact Info */}
        <div className="space-y-4">
          {contactInfo.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4">
                {item.href ? (
                  <a
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-4 hover:text-primary-text transition-colors"
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{item.title}</div>
                      <div className="font-semibold">{item.value}</div>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{item.title}</div>
                      <div className="font-semibold">{item.value}</div>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}

          {/* Address */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('contacts.address_label')}
                  </div>
                  <div className="font-semibold">
                    {t('contacts.address_value')}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {t('contacts.write_to_us')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('contacts.form_name')}
                autoComplete="name"
                placeholder={t('contacts.form_name_placeholder')}
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label={t('contacts.form_phone')}
                type="tel"
                autoComplete="tel"
                placeholder={t('contacts.form_phone_placeholder')}
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('contacts.form_message')}
                </label>
                <textarea
                  placeholder={t('contacts.form_message_placeholder')}
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="flex w-full rounded-xl border border-input bg-card px-4 py-3 text-base transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12 resize-none"
                />
              </div>
              <Button type="submit" className="w-full" leftIcon={<Send className="h-4 w-4" />}>
                {t('contacts.form_send')}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t('contacts.form_via_email')}</p>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
