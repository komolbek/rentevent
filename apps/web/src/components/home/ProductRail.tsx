'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '@/types';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ProductCardSkeleton } from '@/components/ui';

interface ProductRailProps {
  eyebrow: string;
  title: string;
  linkLabel: string;
  href: string;
  products: Product[] | undefined;
  isLoading: boolean;
}

/**
 * A row of real product cards — the thing every competitor puts high on the
 * page and this one was missing. Scrolls horizontally on phones (cards keep
 * their full size instead of shrinking to thumbnails) and becomes a grid from
 * `sm` up.
 */
export function ProductRail({
  eyebrow,
  title,
  linkLabel,
  href,
  products,
  isLoading,
}: ProductRailProps) {
  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section className="container mx-auto px-4 pt-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3 text-primary-text">{eyebrow}</p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
        </div>
        <Link
          href={href}
          className="link-underline hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
        >
          {linkLabel}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="w-[15rem] shrink-0 sm:w-auto">
                <ProductCardSkeleton />
              </div>
            ))
          : products!.slice(0, 8).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: Math.min(index, 4) * 0.06 }}
                className="w-[15rem] shrink-0 snap-start sm:w-auto"
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
      </div>
    </section>
  );
}
