import type { ComponentPropsWithoutRef } from 'react';

/**
 * One full-width band of the home page. `tint` is fixed per section (see the
 * order in page.tsx), not computed from position: sections load data late, and
 * a position-based rule would flip colours when they appear. Padding lives here.
 */
export function Band({
  children,
  tint = false,
  ...rest
}: ComponentPropsWithoutRef<'section'> & { tint?: boolean }) {
  return (
    <section className="home-band" data-tint={tint ? '' : undefined} {...rest}>
      <div className="container mx-auto px-4 py-10 sm:py-14">{children}</div>
    </section>
  );
}
