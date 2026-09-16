'use client';

import { CalendarCheck, ShoppingCart, Truck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SectionHeader } from './SectionHeader';
import { Reveal } from './Reveal';

/**
 * Three steps, one line each. "Don't Make Me Think": a first-time visitor
 * should know how renting works without opening the FAQ.
 */
export function HowItWorks() {
  const { t } = useTranslation();

  const steps = [
    { icon: CalendarCheck, title: t('home.how_1_title'), description: t('home.how_1_desc') },
    { icon: ShoppingCart, title: t('home.how_2_title'), description: t('home.how_2_desc') },
    { icon: Truck, title: t('home.how_3_title'), description: t('home.how_3_desc') },
  ];

  return (
    <section className="container mx-auto px-4 pt-14 sm:pt-20">
      <SectionHeader eyebrow={t('home.how_eyebrow')} title={t('home.how_title')} />

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.08}>
            <div className="relative h-full overflow-hidden rounded-2xl bg-primary-50 p-6 dark:bg-primary/10 sm:p-7">
              <span className="font-display absolute -right-2 -top-4 select-none text-[6rem] font-semibold leading-none text-primary/10">
                {index + 1}
              </span>
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_20px_-8px_rgba(242,86,41,0.7)]">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
