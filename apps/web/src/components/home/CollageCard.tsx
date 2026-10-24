'use client';

import { useRef, type PointerEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

interface CollageCardProps {
  href: string;
  photo: string;
  name: string;
  /** "150 000 сум/сутки" */
  priceLabel: string;
  /** "Смотреть" */
  ctaLabel: string;
  /** Resting tilt in degrees — the collage's scattered look. */
  restRotate: number;
  /** Where the price pill sits on this card. */
  pricePosition: string;
  /** Another card in the collage is hovered: step back. */
  dimmed: boolean;
  active: boolean;
  onHoverChange: (hovered: boolean) => void;
  entranceDelay: number;
}

const SPRING = { stiffness: 220, damping: 18, mass: 0.6 };

/**
 * One photo in the hero collage. On hover it straightens, lifts to the front
 * and tilts in 3D toward the cursor with a moving glare, while the product
 * name and "Смотреть →" slide up — so it reads as a link, not a picture. The
 * corner arrow badge says "clickable" on touch screens, which have no hover.
 * prefers-reduced-motion keeps only the lift, no tilt.
 */
export function CollageCard({
  href,
  photo,
  name,
  priceLabel,
  ctaLabel,
  restRotate,
  pricePosition,
  dimmed,
  active,
  onHoverChange,
  entranceDelay,
}: CollageCardProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);

  // Cursor position over the card, -0.5 … 0.5 on each axis.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [12, -12]), SPRING);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-14, 14]), SPRING);
  const glareX = useTransform(px, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(py, [-0.5, 0.5], ['0%', '100%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.45), transparent 55%)`;

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    if (reduceMotion || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <motion.div
      className="h-full w-full"
      style={{ perspective: 900, zIndex: active ? 30 : undefined }}
      // Above the fold: transform only, never from opacity 0.
      initial={reduceMotion ? false : { y: 18, scale: 0.96, rotate: restRotate }}
      animate={{
        y: active ? -10 : 0,
        scale: active ? 1.08 : dimmed ? 0.96 : 1,
        rotate: active ? 0 : restRotate,
        opacity: dimmed ? 0.82 : 1,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: active || dimmed ? 0 : entranceDelay }}
    >
      <motion.div
        className="h-full w-full"
        style={reduceMotion ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        <Link
          ref={ref}
          href={href}
          aria-label={`${name} — ${priceLabel}`}
          onPointerEnter={() => onHoverChange(true)}
          onPointerLeave={() => {
            reset();
            onHoverChange(false);
          }}
          onPointerMove={onMove}
          onFocus={() => onHoverChange(true)}
          onBlur={() => onHoverChange(false)}
          className="group relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-14px_rgba(60,15,5,0.55)] ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-[0_35px_60px_-18px_rgba(60,15,5,0.75)] hover:ring-2 hover:ring-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, 260px"
            priority
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.1]"
          />

          {/* Glare that follows the cursor. */}
          {!reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: glare }}
            />
          )}

          {/* "Clickable" on every device: a corner arrow that turns orange on hover. */}
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-graphite shadow-md backdrop-blur-sm transition-[background-color,color,transform] duration-300 group-hover:rotate-45 group-hover:bg-primary group-hover:text-white"
          >
            <ArrowUpRight className="h-4 w-4" />
          </span>

          <span
            className={`absolute rounded-full bg-brand-graphite/85 px-2.5 py-1 text-[0.6875rem] font-medium text-white backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-0 ${pricePosition}`}
          >
            {priceLabel}
          </span>

          {/* Name + call to action rise from the bottom on hover. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-brand-graphite/95 via-brand-graphite/75 to-transparent px-3 pb-3 pt-8 text-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-focus-visible:translate-y-0"
          >
            <span className="line-clamp-1 text-sm font-semibold">{name}</span>
            <span className="mt-1 flex items-center justify-between gap-2 text-xs text-white/80">
              <span className="min-w-0 truncate whitespace-nowrap">{priceLabel}</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 font-semibold text-white">
                {ctaLabel}
                <ArrowRight className="h-3 w-3" />
              </span>
            </span>
          </span>
        </Link>
      </motion.div>
    </motion.div>
  );
}
