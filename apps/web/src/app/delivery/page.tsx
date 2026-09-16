'use client';

import { Truck, Clock, MapPin, Package, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Reveal } from '@/components/home/Reveal';

export default function DeliveryPage() {
  const { t } = useTranslation();

  const deliverySteps = [
    {
      icon: Package,
      title: t('delivery_page.step1_title'),
      description: t('delivery_page.step1_desc'),
    },
    {
      icon: CheckCircle,
      title: t('delivery_page.step2_title'),
      description: t('delivery_page.step2_desc'),
    },
    {
      icon: Truck,
      title: t('delivery_page.step3_title'),
      description: t('delivery_page.step3_desc'),
    },
    {
      icon: Clock,
      title: t('delivery_page.step4_title'),
      description: t('delivery_page.step4_desc'),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <Reveal className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t('delivery_page.title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('delivery_page.subtitle')}
        </p>
      </Reveal>

      {/* Delivery Info */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Reveal>
          <Card className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('delivery_page.zone_title')}</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('delivery_page.zone_desc')}
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>{t('delivery_page.zone_1')}</li>
              <li>{t('delivery_page.zone_2')}</li>
              <li>{t('delivery_page.zone_3')}</li>
            </ul>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('delivery_page.time_title')}</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('delivery_page.time_desc')}
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>{t('delivery_page.time_1')}</li>
              <li>{t('delivery_page.time_2')}</li>
              <li>{t('delivery_page.time_3')}</li>
            </ul>
          </Card>
        </Reveal>
      </div>

      {/* Process Steps */}
      <h2 className="text-2xl font-bold text-center mb-8">
        {t('delivery_page.how_it_works')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {deliverySteps.map((step, index) => (
          <Reveal key={index}>
            <Card className="p-6 text-center h-full">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-sm font-medium text-primary-text mb-2">
                {t('delivery_page.step')} {index + 1}
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
