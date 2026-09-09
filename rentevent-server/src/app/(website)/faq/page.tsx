'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguageStore } from '@/stores/languageStore';
import { Card } from '@/components/website/ui';
import { cn } from '@/lib/website/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'Как оформить заказ?',
    answer:
      'Выберите нужные товары в каталоге, укажите даты аренды и добавьте в корзину. После этого перейдите в корзину и оформите заказ, указав адрес доставки и способ оплаты.',
  },
  {
    question: 'Какой минимальный срок аренды?',
    answer:
      'Минимальный срок аренды составляет 1 день. Для некоторых товаров может действовать минимальный срок 2-3 дня.',
  },
  {
    question: 'Как осуществляется доставка?',
    answer:
      'Мы доставляем по всему Ташкенту. Доставка бесплатная при заказе от 500 000 сум. Вы можете выбрать удобное время доставки при оформлении заказа.',
  },
  {
    question: 'Нужен ли залог?',
    answer:
      'Да, при получении товара вносится залог, который возвращается после возврата оборудования в надлежащем состоянии. Размер залога зависит от стоимости арендуемого оборудования.',
  },
  {
    question: 'Какие способы оплаты доступны?',
    answer:
      'Мы принимаем оплату через Payme, Click, Uzum Bank, а также наличными при получении.',
  },
  {
    question: 'Что делать, если оборудование повреждено?',
    answer:
      'В случае повреждения оборудования, пожалуйста, свяжитесь с нами сразу. Стоимость ремонта или замены будет удержана из залога.',
  },
  {
    question: 'Можно ли продлить срок аренды?',
    answer:
      'Да, вы можете продлить аренду, связавшись с нами не позднее чем за 24 часа до окончания срока. Продление возможно при наличии свободного оборудования.',
  },
  {
    question: 'Как отменить заказ?',
    answer:
      'Вы можете отменить заказ бесплатно не позднее чем за 48 часов до доставки. При более поздней отмене может взиматься штраф.',
  },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className="font-medium pr-4">{item.question}</span>
        <ChevronDown
          className={cn('h-5 w-5 text-slate-400 shrink-0 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 text-slate-600 dark:text-slate-400">{item.answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function FAQPage() {
  const { t } = useLanguageStore();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="h-16 w-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="h-8 w-8 text-primary-500" />
        </div>
        <h1 className="text-4xl font-bold mb-4">{t.faq?.title || 'Часто задаваемые вопросы'}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          {t.faq?.subtitle || 'Ответы на популярные вопросы о нашем сервисе'}
        </p>
      </motion.div>

      {/* FAQ List */}
      <div className="space-y-3">
        {faqData.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <FAQAccordion
              item={item}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          </motion.div>
        ))}
      </div>

      {/* Contact CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">
            {t.faq?.moreQuestions || 'Остались вопросы?'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {t.faq?.contactUs || 'Свяжитесь с нами, и мы с радостью поможем'}
          </p>
          <a
            href="/contacts"
            className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            {t.faq?.contactButton || 'Связаться с нами'}
          </a>
        </Card>
      </motion.div>
    </div>
  );
}
