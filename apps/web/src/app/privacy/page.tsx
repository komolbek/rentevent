'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Card } from '@/components/ui';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function PrivacyPage() {
  const { t } = useTranslation();

  const sections = [
    { title: t('privacy.s1_title'), content: t('privacy.s1_content') },
    { title: t('privacy.s2_title'), content: t('privacy.s2_content') },
    { title: t('privacy.s3_title'), content: t('privacy.s3_content') },
    { title: t('privacy.s4_title'), content: t('privacy.s4_content') },
    { title: t('privacy.s5_title'), content: t('privacy.s5_content') },
    { title: t('privacy.s6_title'), content: t('privacy.s6_content') },
    { title: t('privacy.s7_title'), content: t('privacy.s7_content') },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">{t('privacy.title')}</h1>
        <p className="text-muted-foreground">
          {t('privacy.last_updated')}
        </p>
      </motion.div>

      {/* Content */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
              <div className="text-muted-foreground whitespace-pre-line">
                {section.content}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
