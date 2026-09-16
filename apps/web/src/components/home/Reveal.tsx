'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Stagger, in seconds. Only applied when the element rises in on scroll. */
  delay?: number;
  className?: string;
}

type Phase = 'static' | 'hidden' | 'shown';

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * The one scroll reveal on the site.
 *
 * Rules it enforces (spec §2.4, §3.1):
 * - Nothing above the fold starts invisible. The element renders exactly as
 *   the server sent it; before the first paint we measure it, and only
 *   content that is *below* the viewport is hidden, to rise in when it is
 *   scrolled to. An H1 or a first row of cards never fades in.
 * - `amount: 0.15` instead of a negative `margin`, so a fast scroll never
 *   lands on a section that is still invisible.
 * - 450 ms, transform + opacity only, once.
 * - `prefers-reduced-motion` renders static.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('static');
  const inView = useInView(ref, { once: true, amount: 0.15 });

  // Runs before paint, so hiding an off-screen element is never seen.
  useLayoutEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight) setPhase('hidden');
    // Decided once, at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'hidden' && inView) setPhase('shown');
  }, [inView, phase]);

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={phase === 'hidden' ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
      transition={
        phase === 'shown'
          ? { duration: 0.45, delay, ease: EASE_OUT_EXPO }
          : { duration: 0 }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
