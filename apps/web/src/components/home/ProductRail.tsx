'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '@/types';
import { ProductCard } from '@/components/catalog/ProductCard';
import { Reveal } from '@/components/home/Reveal';
import { Band } from '@/components/home/Band';

interface ProductRailProps {
  eyebrow: string;
  title: string;
  linkLabel: string;
  href: string;
  products: Product[] | undefined;
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
}: ProductRailProps) {
  // Nothing while loading too, so the band rhythm never flips (see EventsRail).
  if (!products || products.length === 0) return null;

  return (
    <Band>
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
        {products.slice(0, 8).map((product, index) => (
              <Reveal
                key={product.id}
                delay={Math.min(index, 4) * 0.06}
                className="w-[15rem] shrink-0 snap-start sm:w-auto"
              >
                <ProductCard product={product} />
              </Reveal>
            ))}
      </div>
    </Band>
  );
}
