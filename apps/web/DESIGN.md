# RentEvent storefront — design system

`apps/web` · Next 15 App Router · Tailwind v4 · shadcn/ui-shaped primitives on Radix · framer-motion for scroll reveals.
Live gallery of every component in every state: run the dev server and open **`/dev/ui`** (development only).

## Prompt preamble

Paste this at the top of any prompt (ChatGPT, Claude, v0, Cursor) and the output lands in-style:

> This project uses Next 15 App Router, Tailwind v4, shadcn/ui (Radix primitives via the `radix-ui` package), framer-motion. Colours: brand orange `#F2562B` on paper `#fbfaf7`, graphite `#171717` for dark bands. Buttons are pills. Use `@/components/ui/*` (`Button`, `Input`, `Card`, `Dialog`/`Modal`, `Sheet`, `Select`/`SimpleSelect`, `Tabs`, `Tooltip`, `Badge`, `Skeleton`, `EmptyState`, `QuantitySelector`, `DateRangePicker`). No new colours, no gradients except the hero. Sections use `SectionHeader` and `Reveal` from `@/components/home`. Copy is Russian by default, facts not adjectives, 14 px minimum body text, 40 px minimum tap target. One orange element per screen: the primary button. shadcn CSS variables (`--primary`, `--background`, `--card`, `--border`, `--radius` …) are already aliased to the project tokens in `globals.css`.

## Principles (hold the line)

1. **Warm and saturated, one action per block.** The brand is fire orange: the hero, the facts strip (orange→amber washes), the app band and the event chips all carry it, so the page reads "juicy", not beige. What stays single is the *action*: one primary button per block. The red `rent` colour is reserved for "Арендовать / Rent now" (side tab, hero button) and nothing else.
2. **Paper, not white.** Background `#fbfaf7`, cards `#fff`, borders `#ebe7e0`.
3. **Graphite for weight.** The closing CTA band, set cards, photo slides and "event price" chips are `#171717` — the dark surfaces on a light page.
4. **Content first, motion second.** Nothing above the fold starts invisible. Motion ≤ 450 ms, transform + opacity only, once, honours `prefers-reduced-motion`. Use `Reveal`; never write `initial={{ opacity: 0 }}` on page content.
5. **Every card is one link.** No "Подробнее" buttons inside a card that is already a link.
6. **Facts, not adjectives.** "41 позиций", "от 500 000 сум", "48 ч" — never "широкий выбор", "лучшие цены". Copy is sourced from the FAQ and delivery pages, never invented.
7. **Minimum tap target 40 px, minimum body text 14 px, minimum label 12 px.**
8. **Contacts come from Business Settings** (`useBusinessContacts()`), never from code. A field that is not set renders nothing.
9. **Colour scheme follows the OS.** There is no theme toggle; `.dark` is set on `<html>` by the inline script in `app/layout.tsx`.

## Tokens

All tokens are `@theme` variables in `src/app/globals.css`; Tailwind exposes them as utilities (`bg-primary`, `text-muted-foreground`, `rounded-2xl`, `ease-out-expo`). shadcn names (`--primary`, `--card`, …) are aliased in `:root` and follow `.dark` automatically.

```
Colour   brand-orange  #F2562B  surfaces, buttons        → bg-primary
         primary-text  #CF4A25  orange TEXT on light (4.5:1) → text-primary-text
         graphite      #171717  closing band, set cards  → bg-brand-graphite
         paper         #fbfaf7  page background          → bg-background
         card          #ffffff                           → bg-card
         border        #ebe7e0                           → border-border
         muted         #f3f0ea  hover/skeleton surface   → bg-muted
         muted-fg      #6b6862                           → text-muted-foreground
         destructive   #e5484d
         rent          #D92C1E  "Арендовать / Rent now" only (side tab, hero button)
Dark     background #0e0e11 · card #17171a · border #2a2a2f · muted #1c1c20 · primary-text = #F2562B
Type     system stack (SF Pro / Segoe / Roboto).  H1 52/1.08 desktop, 30/1.08 mobile.
         H2 36 (lg) / 30 (sm) / 24 (xs).  Body 16, small 14, label 12, eyebrow 11 uppercase 0.18em (.eyebrow)
Radius   card 18px (rounded-2xl) · hero/band 28px (rounded-3xl) · inputs 14px (rounded-xl) · buttons pill
Spacing  section gap pt-14 (56) / sm:pt-20 (80). Container px-4. Grid gap 12 → 16.
Motion   ease-out-expo cubic-bezier(.16,1,.3,1); reveal 450ms; hover lift −4px; press scale .97
Shadow   elev-2 for lifted cards; orange glow 0 6px 20px -6px rgba(242,86,41,.55) on primary buttons
```

## Components (`@/components/ui`)

Every primitive is the shadcn shape (same exports, `data-slot` attributes, `cn()` merging) so "add a shadcn X" prompts produce drop-in code. Files are lowercase, one per component.

| Component | Use | Snippet |
|-----------|-----|---------|
| `Button` | Every action. Pills; `primary` glows. `asChild` for links. | `<Button asChild size="lg"><Link href="/catalog">Смотреть каталог</Link></Button>` |
| `buttonVariants` | Button styles on any element. | `<a className={buttonVariants({ variant: 'outline' })}>…</a>` |
| `Input` | Text fields with label/error/icons. `inputClassName` for bare fields. | `<Input label="Телефон" error={err} leftIcon={<Phone />} />` |
| `Card` (+Header/Title/Content/Footer) | Any bordered surface. `hover` lifts. | `<Card hover className="p-4">…</Card>` |
| `Dialog` family | Centered dialog (Radix). | `<Dialog><DialogTrigger asChild><Button>…</Button></DialogTrigger><DialogContent size="md"><DialogHeader><DialogTitle>…</DialogTitle></DialogHeader>…</DialogContent></Dialog>` |
| `Modal`, `ConfirmModal` | Controlled wrappers over Dialog (`isOpen`/`onClose`). | `<ConfirmModal isOpen onClose={…} onConfirm={…} title="Очистить корзину?" message="…" variant="destructive" />` |
| `Sheet` family | Edge drawer (phone menu, filters). | `<Sheet><SheetTrigger asChild>…</SheetTrigger><SheetContent side="right">…</SheetContent></Sheet>` |
| `Select` family / `SimpleSelect` | Radix select. `SimpleSelect` takes `options`. | `<SimpleSelect value={v} onChange={setV} options={[{ value: 'popular', label: 'По популярности' }]} />` |
| `Tabs` family | Segmented switching. | `<Tabs defaultValue="a"><TabsList><TabsTrigger value="a">…</TabsTrigger></TabsList><TabsContent value="a">…</TabsContent></Tabs>` |
| `Tooltip` family | Labels for icon buttons. | `<Tooltip><TooltipTrigger asChild><button aria-label="Корзина">…</button></TooltipTrigger><TooltipContent>Корзина</TooltipContent></Tooltip>` |
| `Badge` | Status pills on photos/cards. `warning` is solid amber. | `<Badge variant="warning" size="sm">Осталось 1</Badge>` |
| `Skeleton` (+ `ProductCardSkeleton`, `CartSkeleton`, …) | Loading placeholders sized like the real thing. | `<Skeleton className="h-4 w-2/3" />` |
| `EmptyState` | Nothing-here screens with one action. | `<EmptyState icon={<Search />} title="Ничего не найдено" action={<Button>Сбросить</Button>} />` |
| `QuantitySelector` | −/+ stepper. | `<QuantitySelector value={q} onChange={setQ} min={1} max={stock} />` |
| `DateRangePicker`, `RangeCalendar` | Rental period: centred dialog, presets (1 day / weekend / 3 days / week), both ends included, month names follow the UI language. Store the result in `useRentalPeriodStore`. | `<DateRangePicker value={range} onChange={setRange} minDate={getTomorrow()} />` |
| `DropdownMenu` family | Menus and single-choice lists (language switcher). | `<DropdownMenu><DropdownMenuTrigger>…</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuRadioGroup>…</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>` |

Feature components outside `ui/`: `EventPicker` (choose a fair → dates + event prices), `HeroSlider` (admin slides after the built-in brand slide), `Inspirations`, `AppDownload` (store badges + QR to `/app`), `LanguageSwitcher`, `LogoLockup`.

Page-level building blocks in `@/components/home`: `SectionHeader` (eyebrow + title + optional link), `Reveal` (the scroll reveal), `ProductRail`, `CategoryTile`, `SetsRail`, `EventsRail`, `HowItWorks`, `HomeHero`.

## Adding a shadcn component

`components.json` is configured (Tailwind v4, CSS variables, `@/components/ui`). `npx shadcn@latest add <name>` writes the canonical file; then restyle it to the look above (pill radius on triggers/buttons, `rounded-xl` inputs, `rounded-2xl` surfaces, `bg-muted` for hover instead of `bg-accent`, `text-primary-text` for orange text) and add it to `/dev/ui`.

## Data and copy rules

- Category, product, set and event **names and descriptions are localized on the client** (`localizedName`, `localizeEvent`, …). The API returns all languages.
- **Delivery** is free from 500 000 сум (`FREE_DELIVERY_THRESHOLD` in the cart store); below it the fee is agreed on confirmation — never print a number.
- **Counts** go through `countLabel(n, locale, 'products' | 'items' | 'days' | 'units')` for correct Russian plurals.
