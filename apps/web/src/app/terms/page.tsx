'use client';

import { FileText } from 'lucide-react';
import { Card } from '@/components/ui';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Reveal } from '@/components/home/Reveal';

export default function TermsPage() {
  const { t } = useTranslation();

  const sections = [
    { title: t('terms.s1_title'), content: t('terms.s1_content') },
    { title: t('terms.s2_title'), content: t('terms.s2_content') },
    { title: t('terms.s3_title'), content: t('terms.s3_content') },
    { title: t('terms.s4_title'), content: t('terms.s4_content') },
    { title: t('terms.s5_title'), content: t('terms.s5_content') },
    { title: t('terms.s6_title'), content: t('terms.s6_content') },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Hero */}
      <Reveal className="text-center mb-12">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">{t('terms.title')}</h1>
        <p className="text-muted-foreground">
          {t('terms.last_updated')}
        </p>
      </Reveal>

      {/* Content */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <Reveal key={index}>
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
              <div className="text-muted-foreground whitespace-pre-line">
                {section.content}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
