'use client';

import { motion } from 'framer-motion';
import { Building2, Users, Award, Clock } from 'lucide-react';
import { Card } from '@/components/ui';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function AboutPage() {
  const { t } = useTranslation();

  const stats = [
    { icon: Building2, value: '5+', label: t('about.stat_experience') },
    { icon: Users, value: '1000+', label: t('about.stat_clients') },
    { icon: Award, value: '500+', label: t('about.stat_events') },
    { icon: Clock, value: '24/7', label: t('about.stat_support') },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4">{t('about.title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('about.subtitle')}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 text-center">
              <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
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
            <h2 className="text-2xl font-semibold mb-4">{t('about.who_we_title')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('about.who_we_text')}
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 h-full">
            <h2 className="text-2xl font-semibold mb-4">{t('about.why_us_title')}</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                {t('about.why_us_1')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                {t('about.why_us_2')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                {t('about.why_us_3')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                {t('about.why_us_4')}
              </li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
