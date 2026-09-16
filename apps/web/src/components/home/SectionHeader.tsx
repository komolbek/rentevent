'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  linkLabel?: string;
  href?: string;
}

/** One header shape for every home section so the page scans as a rhythm. */
export function SectionHeader({ eyebrow, title, description, linkLabel, href }: SectionHeaderProps) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        <p className="eyebrow mb-2.5 text-primary-text">{eyebrow}</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{description}</p>
        )}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="link-underline hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
        >
          {linkLabel}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
