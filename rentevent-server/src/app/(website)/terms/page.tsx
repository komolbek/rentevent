'use client';

import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useLanguageStore } from '@/stores/languageStore';
import { Card } from '@/components/website/ui';

export default function TermsPage() {
  const { t } = useLanguageStore();

  const sections = [
    {
      title: '1. Общие положения',
      content: `Настоящие Условия аренды регулируют отношения между сервисом RentEvent (далее — "Арендодатель") и клиентом (далее — "Арендатор") при аренде оборудования для мероприятий.

Оформляя заказ на сайте, Арендатор подтверждает, что ознакомился и согласен с настоящими Условиями.`,
    },
    {
      title: '2. Условия аренды',
      content: `• Минимальный срок аренды составляет 1 день
• Отсчет времени аренды начинается с момента передачи оборудования
• Арендатор обязуется вернуть оборудование в срок и в надлежащем состоянии
• Использование оборудования допускается только по прямому назначению`,
    },
    {
      title: '3. Оплата и залог',
      content: `• Оплата производится при получении товара или онлайн
• При получении вносится залог, размер которого зависит от стоимости оборудования
• Залог возвращается после приемки оборудования в надлежащем состоянии
• В случае повреждения оборудования, стоимость ремонта удерживается из залога`,
    },
    {
      title: '4. Доставка и возврат',
      content: `• Доставка осуществляется по согласованному адресу и времени
• Арендатор обязан обеспечить доступ для доставки и забора оборудования
• Возврат оборудования должен быть осуществлен в оговоренное время
• За просрочку возврата взимается дополнительная плата`,
    },
    {
      title: '5. Ответственность сторон',
      content: `• Арендатор несет полную ответственность за сохранность оборудования
• При утере или повреждении оборудования Арендатор возмещает его стоимость
• Арендодатель не несет ответственности за ненадлежащее использование оборудования
• Споры решаются путем переговоров, при недостижении согласия — в судебном порядке`,
    },
    {
      title: '6. Отмена заказа',
      content: `• Бесплатная отмена возможна не позднее 48 часов до доставки
• При отмене менее чем за 48 часов удерживается 30% от стоимости заказа
• При отмене в день доставки удерживается 50% от стоимости заказа`,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="h-16 w-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-primary-500" />
        </div>
        <h1 className="text-4xl font-bold mb-4">{t.terms?.title || 'Условия аренды'}</h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t.terms?.lastUpdated || 'Последнее обновление'}: 01.01.2024
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
              <div className="text-slate-600 dark:text-slate-400 whitespace-pre-line">
                {section.content}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
