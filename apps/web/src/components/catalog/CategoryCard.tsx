'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Category } from '@/types';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface CategoryCardProps {
  category: Category;
  className?: string;
}

/**
 * Editorial category tile. No icon/letter badges — the category name is the
 * subject, set in the display serif. When a real photo exists the tile becomes
 * a full-bleed image card; otherwise it's a clean typographic card. Both share
 * the same footprint so a mixed grid still reads as one system.
 */
export function CategoryCard({ category, className }: CategoryCardProps) {
  const { t } = useTranslation();
  const count =
    category._count?.products !== undefined
      ? t('category.products_count', { count: category._count.products })
      : null;

  const hasPhoto = !!category.image;

  return (
    <Link href={`/catalog?category=${category.id}`} className="block h-full">
      <motion.div whileTap={{ scale: 0.985 }} className="h-full">
        <Card
          hover
          className={cn(
            'group relative flex h-full min-h-[9rem] flex-col justify-between overflow-hidden sm:min-h-[10.5rem]',
            hasPhoto ? 'bg-brand-graphite p-0' : 'p-5',
            className
          )}
        >
          {hasPhoto ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.image as string}
                alt={category.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                loading="lazy"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(23,23,23,0.05) 0%, rgba(23,23,23,0.15) 45%, rgba(23,23,23,0.82) 100%)',
                }}
              />
              <div className="relative flex h-full flex-col justify-between p-5">
                <div className="flex justify-end">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors duration-300 group-hover:bg-primary">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-xl leading-tight text-white line-clamp-2 sm:text-2xl">
                    {category.name}
                  </h3>
                  {count && <p className="eyebrow mt-2 text-white/70">{count}</p>}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* faint fire wash that grows on hover — texture, not a badge */}
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: 'radial-gradient(circle, rgba(242,86,41,0.18), transparent 70%)' }}
                aria-hidden="true"
              />
              <div className="relative flex items-start justify-between">
                {count ? (
                  <span className="eyebrow text-muted-foreground">{count}</span>
                ) : (
                  <span />
                )}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>

              <div className="relative">
                <h3 className="font-display text-xl leading-tight transition-colors duration-300 line-clamp-2 group-hover:text-primary-text sm:text-2xl">
                  {category.name}
                </h3>
                <span className="mt-3 block h-0.5 w-8 rounded-full bg-primary/40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-16 group-hover:bg-primary" />
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </Link>
  );
}
