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
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      toast.error(t('contacts.form_fill_all'));
      return;
    }

    setSending(true);
    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(t('contacts.form_sent'));
    setFormData({ name: '', phone: '', message: '' });
    setSending(false);
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
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
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
                    <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <item.icon className="h-6 w-6 text-primary-500" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{item.title}</div>
                      <div className="font-semibold">{item.value}</div>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <item.icon className="h-6 w-6 text-primary-500" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{item.title}</div>
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
                <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <MapPin className="h-6 w-6 text-primary-500" />
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
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
                placeholder={t('contacts.form_name_placeholder')}
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label={t('contacts.form_phone')}
                placeholder={t('contacts.form_phone_placeholder')}
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t('contacts.form_message')}
                </label>
                <textarea
                  placeholder={t('contacts.form_message_placeholder')}
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="flex w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 resize-none"
                />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  t('contacts.form_sending')
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t('contacts.form_send')}
                  </>
                )}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
