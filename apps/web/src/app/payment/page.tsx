'use client';

import { Banknote, CreditCard, Shield, HelpCircle, Wallet, FileText } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Reveal } from '@/components/home/Reveal';

type PaymentMethod = {
  id: string;
  title: string;
  description: string;
  logo?: string;
  icon?: React.ReactNode;
};

export default function PaymentPage() {
  const { t } = useTranslation();

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'rahmat',
      title: 'Rahmat',
      description: t('payment.rahmat_desc'),
      icon: <CreditCard className="h-10 w-10 text-primary" />,
    },
    {
      id: 'cash',
      title: t('payment.cash_title'),
      description: t('payment.cash_desc'),
      icon: <Wallet className="h-10 w-10 text-primary" />,
    },
    // Checkout offers this too; the page used to list only two of the three.
    {
      id: 'bank',
      title: t('payment.bank_title'),
      description: t('payment.bank_desc'),
      icon: <FileText className="h-10 w-10 text-primary" />,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <Reveal className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t('payment.title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('payment.subtitle')}
        </p>
      </Reveal>

      {/* Payment Methods */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {paymentMethods.map((method, index) => (
          <Reveal key={method.id}>
            <Card className="p-6 text-center h-full">
              <div className="h-16 flex items-center justify-center mb-4">
                {method.logo ? (
                  <Image
                    src={method.logo}
                    alt={method.title}
                    width={120}
                    height={48}
                    className="h-12 w-auto object-contain"
                  />
                ) : (
                  method.icon
                )}
              </div>
              <h3 className="font-semibold mb-2">{method.title}</h3>
              <p className="text-sm text-muted-foreground">{method.description}</p>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Payment Info */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Reveal>
          <Card className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('payment.deposit_title')}</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('payment.deposit_desc')}
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>{t('payment.deposit_1')}</li>
              <li>{t('payment.deposit_2')}</li>
              <li>{t('payment.deposit_3')}</li>
            </ul>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('payment.security_title')}</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('payment.security_desc')}
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>{t('payment.security_1')}</li>
              <li>{t('payment.security_2')}</li>
              <li>{t('payment.security_3')}</li>
            </ul>
          </Card>
        </Reveal>
      </div>

      {/* FAQ */}
      <Reveal>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">{t('payment.faq_title')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">{t('payment.faq_q1')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('payment.faq_a1')}
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">{t('payment.faq_q2')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('payment.faq_a2')}
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">{t('payment.faq_q3')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('payment.faq_a3')}
              </p>
            </div>
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
