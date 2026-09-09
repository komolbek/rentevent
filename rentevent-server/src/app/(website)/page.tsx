'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Sparkles, Truck, Shield, Clock, Phone } from 'lucide-react';
import { Button, Card } from '@/components/website/ui';
import { settingsApi } from '@/lib/website/api';
import { useLanguageStore } from '@/stores/languageStore';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const { t } = useLanguageStore();

  const { data: settings } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: settingsApi.getBusinessSettings,
  });

  const phoneNumber = settings?.phone || '+998901234567';

  const features = [
    {
      icon: Sparkles,
      title: t.home.features.quality.title,
      description: t.home.features.quality.description,
    },
    {
      icon: Truck,
      title: t.home.features.delivery.title,
      description: t.home.features.delivery.description,
    },
    {
      icon: Shield,
      title: t.home.features.support.title,
      description: t.home.features.support.description,
    },
    {
      icon: Clock,
      title: t.home.features.pricing.title,
      description: t.home.features.pricing.description,
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 p-8 md:p-12 lg:p-16"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
            >
              {t.home.heroTitle}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-white/80 mb-8 max-w-lg"
            >
              {t.home.heroSubtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <Link href="/catalog">
                <Button
                  size="lg"
                  className="bg-white text-primary-600 hover:bg-white/90 shadow-xl"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  {t.home.viewCatalog}
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-bold text-center mb-8"
        >
          {t.home.whyChooseUs}
        </motion.h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card variant="outline" className="p-6 h-full">
                <div className="h-12 w-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-slate-100 dark:bg-slate-800 p-8 md:p-12 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t.home.readyToStart}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6">
            {t.home.ctaSubtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/catalog">
              <Button size="lg" variant="gradient">
                {t.home.browseProducts}
              </Button>
            </Link>
            <a href={`tel:${phoneNumber}`}>
              <Button size="lg" variant="outline" leftIcon={<Phone className="h-5 w-5" />}>
                {t.nav.contact}
              </Button>
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
