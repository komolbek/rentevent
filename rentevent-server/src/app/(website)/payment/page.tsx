'use client';

import { motion } from 'framer-motion';
import { Banknote, Shield, HelpCircle, Wallet } from 'lucide-react';
import Image from 'next/image';
import { useLanguageStore } from '@/stores/languageStore';
import { Card } from '@/components/website/ui';

type PaymentMethod = {
  id: string;
  title: string;
  description: string;
  logo?: string;
  icon?: React.ReactNode;
};

export default function PaymentPage() {
  const { t } = useLanguageStore();

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'payme',
      title: 'Payme',
      description: t.payment?.paymeDesc || 'Оплата через приложение Payme',
      logo: '/images/payments/payme.svg',
    },
    {
      id: 'click',
      title: 'Click',
      description: t.payment?.clickDesc || 'Оплата через приложение Click',
      logo: '/images/payments/click.svg',
    },
    {
      id: 'uzum',
      title: 'Uzum',
      description: t.payment?.uzumDesc || 'Оплата через Uzum Bank',
      logo: '/images/payments/uzum.svg',
    },
    {
      id: 'cash',
      title: t.payment?.cash || 'Наличные',
      description: t.payment?.cashDesc || 'Оплата при получении',
      icon: <Wallet className="h-10 w-10 text-primary-500" />,
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
        <h1 className="text-4xl font-bold mb-4">{t.payment?.title || 'Оплата'}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {t.payment?.subtitle || 'Удобные способы оплаты для вашего удобства'}
        </p>
      </motion.div>

      {/* Payment Methods */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {paymentMethods.map((method, index) => (
          <motion.div
            key={method.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
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
              <p className="text-sm text-slate-500 dark:text-slate-400">{method.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payment Info */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-primary-500" />
              </div>
              <h2 className="text-xl font-semibold">{t.payment?.depositTitle || 'Залог'}</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t.payment?.depositText ||
                'При получении товара вносится залог, который возвращается после возврата оборудования в надлежащем состоянии.'}
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• {t.payment?.deposit1 || 'Размер залога зависит от стоимости товара'}</li>
              <li>• {t.payment?.deposit2 || 'Залог возвращается в течение 24 часов'}</li>
              <li>• {t.payment?.deposit3 || 'Возможен безналичный залог'}</li>
            </ul>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-500" />
              </div>
              <h2 className="text-xl font-semibold">{t.payment?.securityTitle || 'Безопасность'}</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t.payment?.securityText ||
                'Все платежи защищены и обрабатываются через официальные платежные системы Узбекистана.'}
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• {t.payment?.security1 || 'Шифрование всех транзакций'}</li>
              <li>• {t.payment?.security2 || 'Мгновенные уведомления об оплате'}</li>
              <li>• {t.payment?.security3 || 'Чеки и квитанции об оплате'}</li>
            </ul>
          </Card>
        </motion.div>
      </div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-6 w-6 text-primary-500" />
            <h2 className="text-xl font-semibold">{t.payment?.faqTitle || 'Часто задаваемые вопросы'}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">{t.payment?.faq1Q || 'Когда нужно оплатить?'}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.payment?.faq1A || 'Оплата производится при получении товара или онлайн при оформлении заказа.'}
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">{t.payment?.faq2Q || 'Можно ли оплатить частями?'}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.payment?.faq2A || 'Да, для крупных заказов возможна оплата в рассрочку.'}
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">{t.payment?.faq3Q || 'Как вернуть залог?'}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.payment?.faq3A || 'Залог возвращается автоматически после приемки возвращенного оборудования.'}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
