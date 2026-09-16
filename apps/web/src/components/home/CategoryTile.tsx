'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { categoryIconMap } from '@/lib/categoryIcon';

interface CategoryTileProps {
  id: string;
  name: string;
  countLabel?: string | null;
  /** The category's own image, or a representative product photo when it has none. */
  photo?: string | null;
  icon?: string | null;
  className?: string;
}

/**
 * Home-page category tile in the fair.rent shape: picture on top, label under
 * it. The caller passes the category's own `imageUrl` when it has one, else
 * the first photo of a product in that category; when even that is missing
 * the tile falls back to a line icon so the grid never shows a blank box.
 */
export function CategoryTile({ id, name, countLabel, photo, icon, className }: CategoryTileProps) {
  const Icon: LucideIcon = (icon && categoryIconMap[icon]) || Package;

  return (
    <Link href={`/catalog?category=${id}`} className="block h-full">
      <motion.div
        whileTap={{ scale: 0.985 }}
        className={cn(
          'group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:elev-2',
          className
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="h-10 w-10 text-primary/60" strokeWidth={1.5} />
            </div>
          )}
          <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-graphite shadow-sm transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <h3 className="font-display text-base font-semibold leading-tight transition-colors group-hover:text-primary-text sm:text-lg">
            {name}
          </h3>
          {countLabel && (
            <span className="shrink-0 text-xs text-muted-foreground sm:whitespace-nowrap">{countLabel}</span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
