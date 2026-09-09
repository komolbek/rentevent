'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useLanguageStore } from '@/stores/languageStore';
import { Card } from '@/components/website/ui';

export default function PrivacyPage() {
  const { t } = useLanguageStore();

  const sections = [
    {
      title: '1. Сбор информации',
      content: `Мы собираем следующую информацию:
• Контактные данные (имя, номер телефона)
• Адреса доставки
• История заказов
• Данные об использовании сайта

Мы не собираем и не храним данные банковских карт. Все платежи обрабатываются через защищенные платежные системы.`,
    },
    {
      title: '2. Использование информации',
      content: `Собранная информация используется для:
• Обработки и выполнения заказов
• Связи с клиентами по вопросам заказов
• Улучшения качества обслуживания
• Отправки уведомлений о статусе заказа
• Персонализации пользовательского опыта`,
    },
    {
      title: '3. Защита информации',
      content: `Мы принимаем меры для защиты ваших данных:
• Шифрование данных при передаче
• Ограниченный доступ к персональным данным
• Регулярное обновление систем безопасности
• Соблюдение стандартов защиты данных`,
    },
    {
      title: '4. Передача данных третьим лицам',
      content: `Мы не продаем и не передаем ваши персональные данные третьим лицам, за исключением:
• Служб доставки для выполнения заказа
• Платежных систем для обработки оплаты
• По требованию законодательства`,
    },
    {
      title: '5. Cookies и аналитика',
      content: `Наш сайт использует cookies для:
• Сохранения настроек пользователя
• Анализа посещаемости сайта
• Улучшения работы сайта

Вы можете отключить cookies в настройках браузера, но это может повлиять на функциональность сайта.`,
    },
    {
      title: '6. Ваши права',
      content: `Вы имеете право:
• Запросить информацию о своих данных
• Исправить неточные данные
• Удалить свои данные
• Отозвать согласие на обработку данных

Для реализации этих прав свяжитесь с нами по контактам, указанным на сайте.`,
    },
    {
      title: '7. Изменения в политике',
      content: `Мы можем обновлять данную политику конфиденциальности. Актуальная версия всегда доступна на этой странице. Продолжая использовать сайт после изменений, вы принимаете обновленную политику.`,
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
          <Shield className="h-8 w-8 text-primary-500" />
        </div>
        <h1 className="text-4xl font-bold mb-4">{t.privacy?.title || 'Политика конфиденциальности'}</h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t.privacy?.lastUpdated || 'Последнее обновление'}: 01.01.2024
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
