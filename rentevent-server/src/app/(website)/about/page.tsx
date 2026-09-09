'use client';

import { motion } from 'framer-motion';
import { Building2, Users, Award, Clock } from 'lucide-react';
import { useLanguageStore } from '@/stores/languageStore';
import { Card } from '@/components/website/ui';

const stats = [
  { icon: Building2, value: '5+', labelKey: 'yearsExperience' },
  { icon: Users, value: '1000+', labelKey: 'happyClients' },
  { icon: Award, value: '500+', labelKey: 'eventsOrganized' },
  { icon: Clock, value: '24/7', labelKey: 'support' },
];

export default function AboutPage() {
  const { t } = useLanguageStore();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4">{t.about?.title || 'О нас'}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {t.about?.subtitle || 'RentEvent - ваш надежный партнер в организации мероприятий в Ташкенте'}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.labelKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 text-center">
              <stat.icon className="h-8 w-8 text-primary-500 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t.about?.[stat.labelKey as keyof typeof t.about] || stat.labelKey}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* About Content */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 h-full">
            <h2 className="text-2xl font-semibold mb-4">{t.about?.whoWeAre || 'Кто мы'}</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.about?.whoWeAreText ||
                'RentEvent - это сервис аренды инвентаря для мероприятий в Ташкенте. Мы предоставляем широкий выбор оборудования для свадеб, корпоративов, дней рождения и других торжеств. Наша миссия - сделать каждое ваше мероприятие незабываемым.'}
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 h-full">
            <h2 className="text-2xl font-semibold mb-4">{t.about?.whyUs || 'Почему мы'}</h2>
            <ul className="space-y-3 text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">✓</span>
                {t.about?.reason1 || 'Широкий ассортимент качественного оборудования'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">✓</span>
                {t.about?.reason2 || 'Доступные цены и гибкая система скидок'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">✓</span>
                {t.about?.reason3 || 'Быстрая доставка по всему Ташкенту'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">✓</span>
                {t.about?.reason4 || 'Профессиональная консультация и поддержка'}
              </li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
