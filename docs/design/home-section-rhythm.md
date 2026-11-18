# Home page section rhythm (spec, 2026-11-18)

Status: APPROVED by the owner 2026-11-18, ready for one coder pass. Design only, no code written.

## Problem
Every home section is `container mx-auto px-4 pt-14 sm:pt-20` on one `bg-background` (#fbfaf7 light, #0e0e11 dark).
Only the headers tell sections apart. fair.rent separates sections with full-width alternating light bands.

## Recommendation (one direction)
**Alternating full-width bands: base / tint / base / tint.** Two neutral treatments only:

| Treatment | Light | Dark | Class |
|---|---|---|---|
| A (base) | `--color-background` #fbfaf7 | #0e0e11 | none (page background) |
| B (tint) | new `--color-band` #efebe3 + 1px top/bottom `--color-band-border` #e2ddd2 | `--color-band` #08080a + `--color-band-border` #26262b | `bg-band border-y border-band-border` |

Dark B is darker than the page, not lighter: cards are #17171a, so a lighter band would swallow them.
Light B is darker than the page, so white cards (`bg-card`) lift off it.
No coloured band (orange, graphite): the page already has enough colour blocks inside sections (see below). No rounded
band edges, no wave dividers: calm and quick to build.

## Section order and treatment
Rendered order today, with what each section already has:

| # | Section | File | Existing colour | Band |
|---|---|---|---|---|
| 1 | Hero slider | `HeroSlider.tsx` | graphite rounded card | outside bands |
| 2 | Fair picker (overlaps hero, `-mt-7`) | `EventPicker` in `page.tsx` | card | outside bands, stays on base |
| 3 | Categories | `page.tsx` | photo tiles | A |
| 4 | Events / Выставки | `EventsRail.tsx` | white cards | B |
| 5 | Popular products | `ProductRail.tsx` | white cards | A |
| 6 | Sets | `SetsRail.tsx` | graphite cards | B |
| 7 | How it works | `HowItWorks.tsx` | `bg-primary-50` cards | A |
| 8 | Inspirations | `Inspirations.tsx` | photo cards | B |
| 9 | App download | `AppDownload.tsx` | orange gradient card | A |
| 10 | Terms (4 features) | `page.tsx` | `bg-card` grid | B |
| 11 | Closing band | `page.tsx` | graphite card | A |

Bands are neutral on purpose: sections 6, 7, 9, 11 already carry a colour block, so they sit on plain A or B, never on top of
another colour.

**Alternation is by CSS, not hardcoded.** Sections 3 to 11 are conditional (categories, events, sets, inspirations render
`null` when empty). So tint = every even rendered band, which keeps the rhythm unbroken whatever is hidden:

```css
/* globals.css, after .dark */
.home-bands > section.home-band:nth-of-type(even) {
  background-color: var(--color-band);
  border-block: 1px solid var(--color-band-border);
}
```

## Spacing
Padding moves from "top of each section" to "inside the band", same on both treatments:
`py-10 sm:py-14` inside the band container (about 40 / 56 px each side, 80 / 112 px between content blocks; before it was 56 / 80).
Mobile uses the smaller step. Page gets about 250 px longer in total, accepted. Remove the `pb-8` on the page root.
Section header spacing (`SectionHeader`, `mb-7 sm:mb-8`) is unchanged.

## Files and changes (one pass)
1. `apps/web/src/app/globals.css`
   - In `@theme`: `--color-band: #efebe3; --color-band-border: #e2ddd2;`
   - In `.dark`: `--color-band: #08080a; --color-band-border: #26262b;`
   - Add the `.home-bands` rule above.
   - Contrast fix (see below): `--color-primary-text: #C2431D;` in light (dark keeps #F2562B).
2. New `apps/web/src/components/home/Band.tsx`:
   `export function Band({ children, ...rest }) { return <section className="home-band" {...rest}><div className="container mx-auto px-4 py-10 sm:py-14">{children}</div></section>; }`
   (accept and pass through `aria-labelledby`, used by AppDownload.)
3. `apps/web/src/app/page.tsx`
   - Wrap everything from Categories to the closing band in `<div className="home-bands">…</div>`; hero and `EventPicker` stay above it.
   - Categories, Terms, Closing: replace `<section className="container mx-auto px-4 pt-14 sm:pt-20">` with `<Band>`.
   - Root `className="pb-8"` becomes none.
4. `EventsRail.tsx`, `SetsRail.tsx`, `HowItWorks.tsx`, `Inspirations.tsx`, `AppDownload.tsx`: same swap section to `<Band>`
   (keep `aria-labelledby` on AppDownload). `ProductRail.tsx`: same (it used `pt-16`, now unified).
5. Skeletons that sit in a tint band: `EventsRail.tsx:48` and `SetsRail.tsx:48` use `bg-muted`, which is almost the band colour.
   Change to `bg-card` (white in light, #17171a in dark). Check the same in `ProductRail`/`Inspirations` loading states.
6. Check: a rail must return `null` *before* rendering its loading skeleton band, or the even/odd count flips when data
   arrives and a band changes colour. If a rail shows a skeleton while loading and `null` after, give it a stable choice
   (render nothing until it knows it has items, or keep the band).

Do not touch: Header, Footer, hero, `EventPicker`, card components, deploy files, payments.

## Mobile
Same alternation, full-bleed to the screen edge (the band is outside the `container`, so no side gaps). Horizontal rails
keep `-mx-4 px-4` inside the container and still scroll edge to edge. Sticky bottom nav (`pb-[calc(3.5rem+…)]` on body) is
unchanged. Fair picker still overlaps the hero only.

## Contrast and accessibility
- Body text #171717 on B light: above 14:1. `muted-foreground` #6b6862 on #efebe3: estimated about 4.5:1 (borderline; coder verifies with a contrast checker, and if under 4.5 darkens `muted-foreground` slightly on bands or lightens `--color-band` to #f3f0ea).
- **Existing issue, made worse by tint:** eyebrow text uses `text-primary-text` #CF4A25: 4.51:1 on white but about 4.3:1 on the
  page's #fbfaf7 and about 4.0:1 on the tint. Fails AA for small text. Fix: light `--color-primary-text` to #C2431D
  (brand ember, about 5.2:1 on the tint, 5.7:1 on white). Dark theme already fine (#F2562B on #0e0e11 is 5.5:1; on #08080a higher).
  Grep other `text-primary-text` uses; they all get darker slightly, which is the point.
- Dark: the band edge is 1px `--color-band-border` because the colour difference is subtle; do not rely on colour alone.
- Bands are decorative (`section`, no new landmarks). Each keeps its own heading, so no extra ARIA. Focus ring (orange 2px) is visible on both.
- `prefers-reduced-motion`: nothing animated is added.

## Out of scope
Photography choices, copy, the Выставки rename, the footer. Optional later: a soft top-edge fade into the hero.

## Open decision for the owner
None blocking. Default as written; if the tint feels too strong in light, soften `--color-band` to #f3f0ea (same as `--color-muted`) and the contrast numbers above only improve.
