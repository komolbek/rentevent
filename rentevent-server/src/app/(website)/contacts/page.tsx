'use client';

import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';
import { useLanguageStore } from '@/stores/languageStore';
import { Card, Button, Input } from '@/components/website/ui';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function ContactsPage() {
  const { t } = useLanguageStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      toast.error(t.contacts?.fillAllFields || 'Заполните все поля');
      return;
    }

    setSending(true);
    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(t.contacts?.messageSent || 'Сообщение отправлено!');
    setFormData({ name: '', phone: '', message: '' });
    setSending(false);
  };

  const contactInfo = [
    {
      icon: Phone,
      title: t.contacts?.phone || 'Телефон',
      value: '+998 90 123 45 67',
      href: 'tel:+998901234567',
    },
    {
      icon: Mail,
      title: t.contacts?.email || 'Email',
      value: 'info@rentevent.uz',
      href: 'mailto:info@rentevent.uz',
    },
    {
      icon: MessageCircle,
      title: 'Telegram',
      value: '@rentevent_uz',
      href: 'https://t.me/rentevent_uz',
    },
    {
      icon: Clock,
      title: t.contacts?.workingHours || 'Режим работы',
      value: '09:00 - 21:00',
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
        <h1 className="text-4xl font-bold mb-4">{t.contacts?.title || 'Контакты'}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {t.contacts?.subtitle || 'Свяжитесь с нами любым удобным способом'}
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
                    className="flex items-center gap-4 hover:text-primary-500 transition-colors"
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
                    {t.contacts?.address || 'Адрес'}
                  </div>
                  <div className="font-semibold">
                    {t.footer?.address || 'Ташкент, ул. Амира Темура, 1'}
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
              {t.contacts?.writeToUs || 'Напишите нам'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t.contacts?.yourName || 'Ваше имя'}
                placeholder={t.contacts?.namePlaceholder || 'Введите имя'}
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label={t.contacts?.yourPhone || 'Телефон'}
                placeholder="+998 90 123 45 67"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t.contacts?.yourMessage || 'Сообщение'}
                </label>
                <textarea
                  placeholder={t.contacts?.messagePlaceholder || 'Введите сообщение'}
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="flex w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 resize-none"
                />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  t.contacts?.sending || 'Отправка...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t.contacts?.send || 'Отправить'}
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
