'use client';

import { Building2, Users, Award, Clock } from 'lucide-react';
import { Card } from '@/components/ui';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Reveal } from '@/components/home/Reveal';

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
      <Reveal className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t('about.title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('about.subtitle')}
        </p>
      </Reveal>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {stats.map((stat, index) => (
          <Reveal key={stat.label}>
            <Card className="p-6 text-center">
              <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* About Content */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Reveal>
          <Card className="p-6 h-full">
            <h2 className="text-2xl font-semibold mb-4">{t('about.who_we_title')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('about.who_we_text')}
            </p>
          </Card>
        </Reveal>

        <Reveal>
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
        </Reveal>
      </div>
    </div>
  );
}
