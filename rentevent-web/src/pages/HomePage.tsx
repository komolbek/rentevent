import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Sparkles, Truck, Shield, Clock, Phone } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { settingsApi } from '@/lib/api';

const features = [
  {
    icon: Sparkles,
    title: 'Широкий выбор',
    description: 'Более 500 товаров для любых мероприятий',
  },
  {
    icon: Truck,
    title: 'Быстрая доставка',
    description: 'Доставка по Ташкенту в день заказа',
  },
  {
    icon: Shield,
    title: 'Гарантия качества',
    description: 'Все товары проходят проверку',
  },
  {
    icon: Clock,
    title: 'Гибкие сроки',
    description: 'Аренда от 1 дня до месяца',
  },
];

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

export function HomePage() {
  const { data: settings } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: settingsApi.getBusinessSettings,
  });

  const phoneNumber = settings?.phone || '+998901234567';

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
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm mb-4"
            >
              Аренда для мероприятий
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
            >
              Всё для вашего идеального мероприятия
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-white/80 mb-8 max-w-lg"
            >
              Мебель, декор, свет, звук и многое другое. Арендуйте всё необходимое
              для свадьбы, корпоратива или частной вечеринки.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="bg-white text-primary-600 hover:bg-white/90 shadow-xl"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Смотреть каталог
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4">
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
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
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
          className="rounded-3xl bg-muted p-8 md:p-12 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Готовы организовать мероприятие?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            Выберите всё необходимое из нашего каталога или свяжитесь с нами
            для индивидуального подбора.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/catalog">
              <Button size="lg" variant="gradient">
                Перейти в каталог
              </Button>
            </Link>
            <a href={`tel:${phoneNumber}`}>
              <Button size="lg" variant="outline" leftIcon={<Phone className="h-5 w-5" />}>
                Позвонить
              </Button>
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
