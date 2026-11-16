# Hero slider (photo-first) and quick-add on product cards — design spec

Date: 2026-11-16 · Role: designer · Status: proposal, not built · Scope: web + iOS hero; quick-add web (iOS later)
Source: client Raad Exhibition feedback (3 screenshots). Data model / API: architect's `docs/spec/hero-slides.md` (not duplicated here).
Reference: Fair.Rent first screen. Related: `docs/design/ui-ux-spec-2026-09-16.md` §1, §3.5.

## 0. What already exists (read first)

Commit `74125f9` already shipped a slider and an admin screen. This spec is a **delta**, not a greenfield.

| Piece | Today (file) | Gap vs. client request |
|---|---|---|
| Slider | `apps/web/src/components/home/HeroSlider.tsx`: crossfade, 6.5 s autoplay, pause on hover/focus/hidden tab, swipe, dots + arrows, reduced-motion | The orange brand slide is **always slide 1** (`count = slides.length + 1`), so an admin photo is slide 2. Client wants the photo *instead of* the orange block. |
| Slide look | Photo + dark gradient + title + subtitle + 2 buttons (CTA + "Арендовать") | Text is forced; no image-only slide; no mobile crop control. |
| Admin | `apps/admin/src/app/admin/hero-slides/page.tsx` → `HomeContentManager kind="hero"`: list, drag reorder, modal, RU/UZ/EN title/subtitle/CTA label, `cta_url`, active toggle, upload via `adminUploadApi.uploadImage` (UploadThing) | No date range, no preview, no focal point / mobile image. |
| Data | `HeroSlide` in `schema.prisma`: `imageUrl`, `title*`, `subtitle*`, `ctaLabel*`, `ctaUrl`, `isActive`, `displayOrder` | No `startsAt/endsAt`, no mobile image, no alt text. (Architect decides; see §B.) |
| Product card | `components/catalog/ProductCard.tsx`: whole card is a `<Link>`, heart button, no add button | **No `+` exists in code.** The red `+` in screenshot 3 is not in this repo's web card (checked `ProductCard`, `ProductRail`, iOS `CatalogTab`); treat it as new. |
| Cart | `stores/cart-store.ts`: one line per product, each with own dates; `addItem` **replaces** a line, `updateItem` changes quantity/dates | No stock cap in the store. Period lives in `rental-period-store.ts` (`from`, `to`, `event`). |

## A. Hero slider (storefront)

### A1. Decision: image-first, text optional
Recommendation: **photo slides where title, subtitle and button are each optional**, plus the orange brand slide only as the empty-state fallback.
- Why: client asked "put an image instead of this" and "like Fair.Rent" (photo + title + short text + one button). Fair.Rent's text sits on a flat panel over the photo; ours keeps the existing dark wash (already contrast-checked, §A5).
- Image-only slide (no title/subtitle/button): the whole slide is a link if `cta_url` is set, otherwise static. Used for pure photo or banners with text baked into the image.
- Remove the second "Арендовать" pill from photo slides: two buttons compete (Krug). One CTA = the admin's button; if no CTA label, no button. "Rent now" already exists in the header and the red tab.
- Orange hero is shown **only when there are zero active slides** (and while the slides request fails). With ≥1 slide the brand slide is not a slide.

**Overlay on the three client photos:** left-aligned white title + one-line subtitle + one button, placed in the left 40 % (dark wall in photos 1 and 3). Photo 2 (bright): same text with the wash, or image-only. Never centre text: all three subjects sit mid-frame and would be covered. On phones text goes bottom-left over a bottom wash (§A5); the subject stays in the upper two thirds.

### A2. Layout (breakpoints as in the Sep header spec)
- Container: `container mx-auto px-4`, rounded-3xl, as today. The fair picker bar (`EventPicker`) stays overlapping the bottom edge, as in the screenshot; slide content needs ≥ 7rem bottom padding so text never sits under it.
- Desktop ≥1024: height 36rem, ratio ≈ 1280×576 box; text block left, max 40rem, vertically centred; arrows + dots bottom-centre above the picker.
- Tablet 640–1023: height 32rem; text max 32rem; arrows hidden, dots + swipe.
- Mobile <640: height 30rem (min), text bottom-aligned above dots (not centred: the subject of most photos is centred and the text would cover it); title ≤ 2.0rem, subtitle max 2 lines (`line-clamp-2`); button full width (min 44px high).
- Image: `object-cover`, `object-position` default `center`. Phones use the mobile image if present, else the desktop image at the focal point (`object-position: x% y%`).

### A3. Behaviour
- Autoplay 6.5 s (keep), crossfade 0.6 s (keep). Pause: hover, focus inside, hidden tab, `prefers-reduced-motion` (no autoplay, no fade), and while a swipe is in progress. No visible play/pause control is added (autoplay stops on focus and under 5 s per slide is not used), but pause on hover/focus satisfies WCAG 2.2.2 for a pausable carousel on desktop; on touch, swipe or a dot tap keeps the user in control. Revisit if the client asks for a pause button.
- Dots: keep current pill style; each dot tap target 44×24 (the button is `h-6 px-1`, widen to `px-2`). `aria-current`, `aria-label "Слайд n"`.
- Swipe: horizontal threshold 48 px (keep); do not block vertical page scroll (`touch-action: pan-y` on the slide).
- Keyboard: Left/Right arrows move slides when the carousel has focus.
- Wrap-around: yes (loop).

### A4. Image guidance (shown in admin, §B)
Updated 2026-11-16 after the client's first photos: three 16:9 landscape shots (~1672×941), staged lounge scenes in dark grey / orange / white: (1) white cantilever chair + round glass table, subject centre-left, dark wall left; (2) white shell chair + round wooden-leg table, subject centre, bright; (3) white bar stool at a lit bar, subject centre-right, dark left side.
- **Desktop image: 16:9, 1920×1080** (JPG/WebP, ≤ 500 KB ideal). Required.
- **Mobile image (optional): 4:5, 1080×1350.** Used on phones (web ≤639 px and iOS). Strongly recommended: a 16:9 photo on a portrait phone keeps only ~35 % of its width.
- Desktop box is 12:5 (wider than 16:9), so `object-cover` trims ~20 % of the height (top/bottom ~10 % each). Keep subject and baked-in text within the central 70 % of the height; for these photos that is fine (subjects sit mid-height).
- Left 40 % under the text: calm area. Photos 1 and 3 have a dark left side (good for left-aligned white text); photo 2 is bright everywhere, so it needs the wash (§A5) and may be better as image-only.
- Fallback when no mobile image: crop the desktop image around a **focal point** (§B2, a click on the preview, stored as x/y 0–100). Defaults if unset: centre. Suggested focal x for the three photos: ~35 %, 50 %, 65 %.
- No text on busy areas; if the photo has its own text leave Title empty (image-only slide).

### A5. Contrast
- Text over photo always sits on the existing wash: `linear-gradient(90deg, rgba(23,23,23,.86) 0%, .62 at 38%, .08 at 72%)`. On mobile, where text is at the bottom, flip it to a vertical wash: `linear-gradient(0deg, rgba(23,23,23,.88) 0%, .55 at 45%, 0 at 80%)`.
- Rule: white text on the wash ≥ 4.5:1 (checked against worst case: a white photo + 62 % graphite ≈ 7:1). Image-only slides have no overlay (admin owns the image), so the guidance "no text in image on bright areas" applies.
- Dots/arrows sit on `bg-black/25 backdrop-blur`; on a very light photo the ring (`ring-white`) on focus is still visible because of the dark chip.
- Alt text: the slide `title` is the accessible name; the `<Image alt>` is empty when a title exists (decorative) and uses the admin alt (or `"RentEvent"` fallback) for image-only slides.

### A6. States
| State | Behaviour |
|---|---|
| Loading (slides request in flight) | Show the orange brand slide immediately (current behaviour, first screen is never empty). If slides arrive, crossfade once to slide 1 only if the visitor has not interacted; otherwise swap silently on next load. Never show a skeleton block. |
| No active slides / request error | Orange brand hero, no dots, no arrows. |
| One slide | Static, no dots, no arrows, no autoplay, no swipe handlers. |
| 2+ slides | Dots (+ arrows ≥640), autoplay. |
| Image fails to load | Slide background graphite; text still shown; if image-only slide, skip it (do not render a blank slide). |
| Slide count shrinks while open | Index resets to 0 (existing guard). |
| Slide outside its date range / inactive | Not returned by the public API (server filters, §B2). |
| First image | `priority` + `sizes="(max-width:1280px) 100vw, 1280px"` (exists); other slides lazy. |

## B. Admin screen "Hero slides" (`apps/admin`)
Keep `HomeContentManager` (shared with Inspirations); additions are per-kind.

### B1. List
- Row: drag handle · thumbnail (16:9, `h-12 w-28` exists → `h-14 w-[8.4rem]`) · title (RU, fallback "Без заголовка — только фото") · subtitle one line · status chip (Active / Hidden / Scheduled / Expired) · edit · delete.
- Drag reorder persists via `POST /admin/hero-slides/reorder` (exists). Show "Порядок сохранён" toast; on failure revert (exists).
- Empty state (exists): "Нет слайдов. Добавьте первый." + line "Пока слайдов нет, на сайте показывается оранжевый экран." (new, answers the fallback).
- Header counter "Активных на сайте: N".

### B2. Add/edit modal
Fields, top to bottom:
1. **Image** (required): drop zone + button, existing upload to UploadThing; show hint (§A4) as helper text under the zone; after upload, preview at 16:9. Client-side checks before upload: type JPG/PNG/WebP; warn (not block) if width < 1600 or aspect differs > 15 % from 16:9: "Изображение будет обрезано по краям".
2. **Texts** with RU / UZ / EN tabs (as now): Title, Subtitle, Button label. All optional now (title no longer required). RU is the fallback for empty UZ/EN. Counter: title ≤ 60 chars, subtitle ≤ 140, button ≤ 24 (limits keep text off the photo; hint, not hard block on the server beyond sane max).
3. **Button link**: select "Каталог / Выставки / Вдохновение / Другая ссылка". "Другая" shows a text input (path `/…` or `https://…`; validate on the server: only `/` paths and `https://`; no `javascript:`). Empty link → slide has no button (and, if there is no text either, is static).
4. **Active** toggle (exists).
5. **Show from / until** (optional, two date inputs, whole days, Tashkent time). Until ≥ from. Needs two new nullable fields — flag to architect; if rejected, drop this block, nothing else depends on it.
6. **Mobile image (optional)**: second upload, 4:5, 1080×1350, hint "Для телефона. Если не загружать, возьмём основное фото и обрежем по точке фокуса".
7. **Focal point**: click/drag a dot on the desktop preview (x, y in %, default 50/50); used for the phone crop when there is no mobile image, on web and iOS. Needs 3 nullable fields (`mobileImageUrl`, `focalX`, `focalY`): flag to architect, now in scope (the client's images are landscape, phones need them).

### B3. Preview
- Live preview panel in the modal, right side ≥1024 (below the form on narrow admin screens): switch Desktop / Phone. Renders the real slide markup scaled down (shared component or the same classes), with the title/subtitle/CTA of the chosen language tab. Shows the safe zone as a dashed overlay.
- Strings (admin i18n, RU/UZ/EN): see §E2.

### B4. Rules
- Max slides: soft limit 8 (warn above; Fair.Rent uses 3–5; load matters). 
- Delete asks confirmation (exists). Deleting the last slide returns the site to the orange hero: say so in the confirmation text.
- Upload only through the existing admin upload endpoint (admin auth); the storefront never sees upload credentials.

## C. Quick-add (+) on every product card

Applies to every use of `ProductCard`: catalog, search, favorites, related, home rails (`ProductRail`), fair pages (`events/[id]`), set contents. Set cards (bundles) are a different item: **no quick-add on set cards** in v1 (a set expands into many products; opens its page). Product page keeps its full form.

### C1. Look and position
- Bottom-right of the card, in the price row (replaces the hover-only `ArrowUpRight` circle, which stays desktop-hover as the "open" hint only when there is no +; remove it when + is present to avoid two circles).
- Not on the photo: on the price row so it does not collide with the heart and the badges.
- `+` button: 44×44 touch target (visual circle 36–40 px, brand red `bg-rent` white icon; hover darker). Tarnov uses white circle on photo; ours is the client's red circle (screenshot 3) — keep red.
- Stepper (after the item is in the cart): pill `[ − 1 + ]` replaces the circle in the same slot, same height 44, max width 8.5rem, quantity centre, tabular numbers. Expands left (card row has room), never pushes the price to two lines: price text truncates first (`truncate` exists).
- Card must stay one `<Link>`; the + / stepper are `<button type="button">` that call `e.preventDefault(); e.stopPropagation()` (same as the heart) → **no navigation, no card press-scale** from the button (stop `whileTap` by not nesting the button in the motion tap area, or `onPointerDown` stopPropagation).

### C2. Which dates? (the cart needs a period)
Source of truth: `rental-period-store` (`from`, `to`, `event`), the same value the catalog filter and the product page use.

| Situation | Tap `+` does |
|---|---|
| **Period set and valid** (`isValidStoredPeriod`) | Adds quantity 1 with that period (`addItem(product, 1, from, to, event?.id if eventPrice != null)`); card becomes a stepper. Toast: "Добавлено · {from}–{to}" with action "Корзина". No navigation. |
| **No period yet** | Does **not** add silently with guessed dates. Opens a bottom sheet (mobile) / popover (desktop) "Когда нужна аренда?" with the existing `date-range-picker` and the fair picker shortcut ("Выбрать выставку"). On confirm: sets the period store (so the whole site is filtered/priced for it) **and** adds this item (qty 1). After that every `+` on every card works in one tap. Cancelling adds nothing. |
| **Period set but past/invalid** (e.g. yesterday's dates in localStorage) | Same as "no period"; picker prefilled empty, note "Даты прошли, выберите новые". |
| Fair selected | Period = fair days; event price applies (same rule as the product page). |

Why not a default (today / 1 day): wrong price and a wrong stock check; the cart total would be a lie and the client rents by dates. One extra step happens once per session, then the Tarnov flow ("just press + again") works.

### C3. Stock and availability
- Stock for the cap = `product.availableStock` (present when the catalog was requested with a period) else `totalStock` (period unknown → we are in the "no period" branch above anyway). 
- `stock === 0` or unavailable for the chosen days: **no + button**; show a disabled grey circle with `aria-disabled` and, on tap/hover/focus, a tooltip "Нет на эти даты" (reuse the existing badge "Нет в наличии"). The card still links to the page (dates alternative there).
- `stock === 1`: + works once; after it is in the cart the stepper's + is **disabled** (`aria-disabled`, 40 % opacity) and a tooltip/inline hint "Больше нет на эти даты" appears on tap (do not use a toast loop).
- Stepper cap = min(`availableStock`, …); tapping + at the cap shows that hint, no error toast, no request.
- Do not trust the card's number for order validity: checkout and the API remain the authority (they already re-check). If the period changes later (picker), stepper recomputes from the next catalog refetch; a cart line that no longer fits is flagged in the cart (existing behaviour; out of scope here).
- `−` at quantity 1 removes the line (`removeItem`) and returns the card to the `+` circle. No confirm dialog (undo toast "Убрано · Вернуть", 4 s, optional but recommended).
- Quantity changes go through `updateItem(productId, { quantity })` (keeps the line's dates); do **not** call `addItem` for increments (it replaces the line and would reset its dates).
- If the cart line has different dates than the current period (user changed the period afterwards): the stepper still shows the line's quantity; + / − edit that line; a small dot is not added. The cart page shows dates per item (existing).

### C4. Stepper states
| State | Visual | Behaviour |
|---|---|---|
| Not in cart, can add | red `+` circle | add (C2) |
| Not in cart, no stock | grey disabled `+` | tooltip |
| Adding (period sheet open) | `+` pressed state | wait |
| In cart, 1 ≤ q < cap | `[ − q + ]` | ± |
| In cart, q = cap | `+` disabled | hint "Больше нет на эти даты" |
| Removing last | back to `+` | line removed |
| Persist | quantity comes from the cart store (rehydrated); after reload the stepper shows immediately, hydration-safe (render the `+` until the store is mounted to avoid a mismatch) |
| Cross-device | none (cart is local) |

### C5. Accessibility
- `+`: `aria-label="Добавить {name} в корзину"`. Stepper: `role="group" aria-label="{name}: {q} в корзине"`; `−` `aria-label="Уменьшить количество"`; `+` `aria-label="Увеличить количество"`; quantity `aria-live="polite"` so a screen reader hears the new number; disabled uses `aria-disabled="true"` with the reason in `aria-describedby`, not the `disabled` attribute (stays focusable).
- Tab order inside the card: card link → favorite → − / + . Focus ring visible (2 px white on dark, 2 px graphite on light).
- Target size 44×44 (CSS hit-area via padding even if the circle is 36). Minimum 8 px gap to the heart and to the card edge.
- Keyboard: Enter/Space on + works; no navigation.
- The period sheet traps focus, closes on Esc, returns focus to the `+` that opened it.
- Motion: respect reduced motion; the number change has no animation then.
- Colour is not the only signal: disabled state also has the tooltip text and a different icon opacity.

### C6. Edge cases
- Not logged in: adding to the cart works without login (cart is local; login at checkout) — same as the product page.
- Product with required options/variants: none today; if added later, + must open the product page instead (flag when it happens).
- Product with quantity pricing tiers: price shown on the card is the base day price; after adding, the toast shows the line total? **No**; keep the toast short. The cart shows the real total.
- Many cards on screen: one shared sheet instance per page, not one per card.

## D. Not in scope
Cart UI changes, checkout, payments (rule 1: Payme/Click untouched), API contract for the cart (the cart is client-only), hero slides data model and API (architect).

## E. String keys

### E1. Storefront — `apps/web/src/lib/i18n/locales/{ru,uz,en}.ts` (no hardcoded currency: use `t('common.currency')`)

New (add next to `product_card.*` and `home.hero_*`):

| Key | RU | UZ | EN |
|---|---|---|---|
| `product_card.quick_add_aria` | Добавить «{name}» в корзину | «{name}»ni savatchaga qo'shish | Add “{name}” to cart |
| `product_card.qty_group_aria` | {name}: {count} в корзине | {name}: savatchada {count} ta | {name}: {count} in cart |
| `product_card.qty_decrease` | Уменьшить количество | Sonini kamaytirish | Decrease quantity |
| `product_card.qty_increase` | Увеличить количество | Sonini oshirish | Increase quantity |
| `product_card.unavailable_dates` | Нет на эти даты | Bu sanalarga yo'q | Not available for these dates |
| `product_card.max_reached` | Больше нет на эти даты | Bu sanalarga boshqa qolmagan | No more for these dates |
| `product_card.added_toast` | Добавлено · {from}–{to} | Qo'shildi · {from}–{to} | Added · {from}–{to} |
| `product_card.view_cart` | Корзина | Savatcha | Cart |
| `product_card.removed_toast` | Убрано из корзины | Savatchadan olib tashlandi | Removed from cart |
| `product_card.undo` | Вернуть | Qaytarish | Undo |
| `product_card.pick_dates_title` | Когда нужна аренда? | Ijara qachon kerak? | When do you need it? |
| `product_card.pick_dates_hint` | Выберите даты — цены и наличие покажем на них | Sanalarni tanlang — narx va mavjudlikni shu sanalar bo'yicha ko'rsatamiz | Pick dates — we'll show prices and availability for them |
| `product_card.pick_dates_stale` | Выбранные даты уже прошли, укажите новые | Tanlangan sanalar o'tib ketgan, yangisini tanlang | The chosen dates have passed, pick new ones |
| `product_card.pick_dates_confirm` | Добавить в корзину | Savatchaga qo'shish | Add to cart |
| `product_card.pick_fair` | Выбрать выставку | Ko'rgazmani tanlash | Choose a fair |
| `home.hero_slide_alt_fallback` | RentEvent | RentEvent | RentEvent |

Existing, reused: `home.hero_carousel_label`, `home.hero_prev`, `home.hero_next`, `home.hero_go_to`, `home.hero_slide_cta` (only as default label when the admin left the label empty **and** set a link; decide in Open question 3), `product_card.out_of_stock`, `product_card.remaining`, `common.currency`.
Remove from photo slides: the second button using `header.rent_now`.

### E2. Admin — `apps/admin/src/lib/i18n/locales/{ru,uz,en}.ts`

| Key | RU | UZ | EN |
|---|---|---|---|
| `hero.status_active` | На сайте | Saytda | Live |
| `hero.status_hidden` | Скрыт | Yashirin | Hidden |
| `hero.status_scheduled` | Запланирован | Rejalashtirilgan | Scheduled |
| `hero.status_expired` | Завершён | Tugagan | Expired |
| `hero.no_title` | Без заголовка — только фото | Sarlavhasiz — faqat rasm | No title — photo only |
| `hero.empty_hint` | Пока слайдов нет, на сайте показывается оранжевый экран. | Slaydlar yo'q ekan, saytda to'q sariq ekran ko'rsatiladi. | With no slides the site shows the orange screen. |
| `hero.active_count` | Активных на сайте: {count} | Saytda faol: {count} | Live on the site: {count} |
| `hero.image_hint` | (update) Фото 16:9, 1920×1080 px (JPG/WebP, до 500 КБ). Слева 40 % закрывает текст, сверху и снизу срезается по ~10 %. Для телефона лучше загрузить отдельное фото 4:5 (1080×1350). Если на фото есть свой текст — оставьте заголовок пустым. | (update) Rasm 16:9, 1920×1080 px (JPG/WebP, 500 KB gacha). Chap 40 % matn ostida qoladi, tepa va pastdan ~10 % kesiladi. Telefon uchun alohida 4:5 rasm (1080×1350) yuklash yaxshi. Rasmda matn bo'lsa, sarlavhani bo'sh qoldiring. | A 16:9 photo, 1920×1080 px (JPG/WebP, up to 500 KB). The left 40 % sits under the text, ~10 % is cropped top and bottom. For phones, upload a separate 4:5 photo (1080×1350). If the photo has its own text, leave Title empty. |
| `hero.image_warn_small` | Изображение маленькое: на больших экранах будет мутным | Rasm kichik: katta ekranlarda xira ko'rinadi | The image is small and will look blurry on large screens |
| `hero.image_warn_ratio` | Пропорции не 16:9: края обрежутся | Nisbat 16:9 emas: chetlari kesiladi | Aspect is not 16:9: edges will be cropped |
| `hero.field_mobile_image` | Фото для телефона (необязательно), 4:5, 1080×1350 | Telefon uchun rasm (ixtiyoriy), 4:5, 1080×1350 | Phone image (optional), 4:5, 1080×1350 |
| `hero.mobile_image_hint` | Если не загружать, возьмём основное фото и обрежем по точке фокуса | Yuklanmasa, asosiy rasm fokus nuqtasi bo'yicha kesiladi | If empty, the main photo is cropped around the focus point |
| `hero.focal_point` | Точка фокуса: нажмите на главное в кадре | Fokus nuqtasi: rasmdagi asosiy joyni bosing | Focus point: click the main subject |
| `hero.link_catalog` / `hero.link_events` / `hero.link_inspirations` / `hero.link_custom` | Каталог / Выставки / Вдохновение / Другая ссылка | Katalog / Ko'rgazmalar / Ilhom / Boshqa havola | Catalogue / Fairs / Inspiration / Custom link |
| `hero.show_from` / `hero.show_until` | Показывать с / до (необязательно) | Ko'rsatish: dan / gacha (ixtiyoriy) | Show from / until (optional) |
| `hero.preview_desktop` / `hero.preview_phone` | Компьютер / Телефон | Kompyuter / Telefon | Desktop / Phone |
| `hero.preview_safe_zone` | Безопасная зона | Xavfsiz hudud | Safe zone |
| `hero.soft_limit` | Больше 8 слайдов замедляют сайт | 8 tadan ortiq slayd saytni sekinlashtiradi | More than 8 slides slow the site down |
| `hero.delete_last_note` | Это последний слайд: на сайте снова появится оранжевый экран. | Bu oxirgi slayd: saytda yana to'q sariq ekran paydo bo'ladi. | This is the last slide: the site will show the orange screen again. |
| `hero.alt_label` | Описание картинки (для незрячих, если нет заголовка) | Rasm tavsifi (sarlavha bo'lmasa) | Image description (used when there is no title) |

(Alt, schedule and mobile image/focal point each need nullable columns; the architect decides. Mobile image + focal point are now in scope; schedule and alt stay optional.)

## F. iOS (`rentevent-ios`)

### F1. Hero — in scope (same slides, same API)
Today (`Screens/Home/HomeTab.swift`, `HeroSlideView`, `Models/HeroSlide.swift`): `TabView(.page)` of the brand slide + admin slides, fixed height 560, one landscape `RemoteImage` aspect-filled, bottom-left text over a bottom gradient, CTA **always opens the catalog** (ignores `cta_url`), fair-picker band overlaps below. Gaps are the same as web plus these:
- Brand slide is still first; same rule as web: **brand slide only when there are no slides**.
- 16:9 photo in a ~358×560 portrait card shows ~32 % of its width: a chair cut in half. Fix with the **mobile 4:5 image** when present (use `mobile_image_url`), else the desktop image cropped at the **focal point** (`focal_x/focal_y`; apply as an alignment offset, not centre). Card height 560 → **~ 4:5 of card width** (≈ 450 pt on a 390 pt phone) so a 4:5 image fits without cropping; keep the picker band overlap (-28 pt).
- Overlay: left-aligned bottom text (as now) is right for these photos on a phone: subject in the upper two thirds, wash `black.opacity(0.75)` bottom → clear at 55 % of height. Title `.h1` max 2 lines (`lineLimit(2)`), subtitle max 2 lines, one button (min 44 pt). No title/subtitle/CTA label → no text block, no button; slide tappable if `cta_url` set.
- CTA follows `cta_url`: `/catalog`, `/events`, `/product/:id`, `/event/:id`, `/inspirations` map to coordinator routes; `https://` opens `SFSafariViewController`; anything unknown falls back to catalog. (Today everything goes to the catalog.)
- Page dots stay (`indexDisplayMode: .always`), on a dark chip so they read on bright photo 2. Autoplay: none on iOS (swipe + dots only; avoids motion for VoiceOver/Reduce Motion users). If wanted later: 6.5 s timer, off with Reduce Motion and while dragging.
- States: loading → brand slide; no/failed slides → brand slide; one slide → no dots, no paging; image load failure → graphite fill, text kept.
- VoiceOver: each slide one element, label = title (or image alt), value "n of N", hint = CTA label; dots are not separate stops.
- Cache: `RemoteImage` cache covers the 4:5 asset; request the right one by size class (iPad/landscape uses the desktop image).
- Strings: reuse `home.view_catalog`; add the hero a11y strings (`home.hero_slide_a11y` "Слайд {n} из {total}" / "{n}-slayd, jami {total}" / "Slide {n} of {total}") in `Localizable.xcstrings`.

### F2. Quick-add `+` on iOS cards — later
Same rules as §C (period from the app's rental-period state, date sheet when empty, `− q +`, stock cap, 44 pt target, VoiceOver labels, no navigation on tap). `CatalogTab` card has no `+` today. Do after the web version is accepted. Verify first that the app tolerates the API changes in `docs/STATUS.md` (past start / >90 days → 400).

## G. Rollout order (suggested)
1. Hero (web + iOS): drop the always-on orange slide when slides exist; optional text/CTA; one button; the phone crop works with focal point from day 1.
2. Quick-add on cards (no API change).
3. Admin: preview + status chips + link presets (no schema).
4. Schema-dependent items (schedule, alt, mobile image, focal point) only if the architect adds them; any schema change needs the prod `db push` first (CLAUDE.md rule 2).
5. iOS hero (same API fields; needs the architect's mobile image/focal fields and an app release). iOS quick-add after step 2 is accepted.

## Open questions (owner)
1. **Keep the orange brand slide as a normal slide?** Recommendation: no. Photos replace it; it appears only when there are no slides (this is what the client asked for).
2. **Quick-add with no dates chosen: ask for dates once (sheet), or add with "tomorrow, 1 day"?** Recommendation: ask once; prices and stock depend on dates, and after that every `+` is one tap.
3. **Photo slides: text on top or image only?** Recommendation: text optional, one button only, wash for contrast; the client can still upload an image with its own text and leave the fields empty.
4. **Phone image, focal point, schedule dates and alt text for slides?** Recommendation: add the optional 4:5 phone image and focal point now (the client's photos are 16:9, phones crop them badly), schedule dates too (promotions end); alt text can wait. Needs the architect to add the fields.
5. **Quick-add on Sets (bundles)?** Recommendation: not in v1; a set opens its page where the contents and dates are visible.
