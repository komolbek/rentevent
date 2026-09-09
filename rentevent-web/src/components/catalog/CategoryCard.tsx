import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Category } from '@/types';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: Category;
  className?: string;
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  return (
    <Link to={`/catalog?category=${category.id}`}>
      <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
        <Card
          hover
          className={cn(
            'p-6 text-center h-full flex flex-col items-center justify-center gap-3',
            className
          )}
        >
          {category.image ? (
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted">
              <img
                src={category.image}
                alt={category.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : category.icon ? (
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-3xl">
              {category.icon}
            </div>
          ) : (
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {category.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-medium text-sm">{category.name}</h3>
            {category._count?.products !== undefined && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {category._count.products} товаров
              </p>
            )}
          </div>
        </Card>
      </motion.div>
    </Link>
  );
}
