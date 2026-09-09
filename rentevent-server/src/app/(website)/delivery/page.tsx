'use client';

import { motion } from 'framer-motion';
import { Truck, Clock, MapPin, Package, CheckCircle } from 'lucide-react';
import { useLanguageStore } from '@/stores/languageStore';
import { Card } from '@/components/website/ui';

export default function DeliveryPage() {
  const { t } = useLanguageStore();

  const deliverySteps = [
    {
      icon: Package,
      title: t.delivery?.step1Title || 'Оформите заказ',
      description: t.delivery?.step1Desc || 'Выберите товары и укажите даты аренды',
    },
    {
      icon: CheckCircle,
      title: t.delivery?.step2Title || 'Подтверждение',
      description: t.delivery?.step2Desc || 'Мы свяжемся с вами для подтверждения',
    },
    {
      icon: Truck,
      title: t.delivery?.step3Title || 'Доставка',
      description: t.delivery?.step3Desc || 'Привезем в удобное для вас время',
    },
    {
      icon: Clock,
      title: t.delivery?.step4Title || 'Возврат',
      description: t.delivery?.step4Desc || 'Заберем после окончания аренды',
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
        <h1 className="text-4xl font-bold mb-4">{t.delivery?.title || 'Доставка'}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {t.delivery?.subtitle || 'Мы доставляем оборудование по всему Ташкенту'}
        </p>
      </motion.div>

      {/* Delivery Info */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary-500" />
              </div>
              <h2 className="text-xl font-semibold">{t.delivery?.zoneTitle || 'Зона доставки'}</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t.delivery?.zoneText ||
                'Мы осуществляем доставку по всему Ташкенту. Доставка бесплатная при заказе от 500 000 сум.'}
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• {t.delivery?.zone1 || 'Центр города - бесплатно'}</li>
              <li>• {t.delivery?.zone2 || 'Спальные районы - от 30 000 сум'}</li>
              <li>• {t.delivery?.zone3 || 'Пригород - договорная'}</li>
            </ul>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary-500" />
              </div>
              <h2 className="text-xl font-semibold">{t.delivery?.timeTitle || 'Время доставки'}</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t.delivery?.timeText ||
                'Доставляем в удобное для вас время. Рекомендуем заказывать за 1-2 дня до мероприятия.'}
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• {t.delivery?.time1 || 'Стандартная доставка: 09:00 - 21:00'}</li>
              <li>• {t.delivery?.time2 || 'Срочная доставка: в течение 3 часов'}</li>
              <li>• {t.delivery?.time3 || 'Ночная доставка: по договоренности'}</li>
            </ul>
          </Card>
        </motion.div>
      </div>

      {/* Process Steps */}
      <h2 className="text-2xl font-bold text-center mb-8">
        {t.delivery?.howItWorks || 'Как это работает'}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {deliverySteps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 text-center h-full">
              <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-6 w-6 text-primary-500" />
              </div>
              <div className="text-sm font-medium text-primary-500 mb-2">
                {t.delivery?.step || 'Шаг'} {index + 1}
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{step.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
