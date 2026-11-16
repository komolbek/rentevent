# Spec: hero slides managed in admin + quick-add on product cards

Status: plan (architect), no code written. Date: 2026-11-16. UI spec: `docs/design/hero-and-quick-add.md` (other session).

## 0. Finding: most of this already exists

Commit `74125f9` (on `origin/main`) shipped a hero slider and admin management. The plan below is the **delta**, not a greenfield build.

| Piece | Exists | Where |
|---|---|---|
| Model `HeroSlide` (`hero_slides`): image_url, title/subtitle/cta_label (+`_uz`/`_en`), cta_url, is_active, display_order, timestamps | yes | `packages/db/prisma/schema.prisma:470` |
| Public `GET /hero-slides` (active only, ordered, `{items}`) | yes | `apps/api/src/content/content.controller.ts` |
| Admin `GET/POST/PATCH/DELETE admin/hero-slides`, `POST admin/hero-slides/reorder` (snake_case mapped in `ContentService`) | yes | same module, shared with Inspirations |
| Admin screen (list, drag order, upload, locale tabs) | yes | `apps/admin/src/components/HomeContentManager.tsx`, `app/admin/hero-slides/page.tsx` |
| Storefront slider; orange hero is slide 0, admin slides follow | yes | `apps/web/src/components/home/HeroSlider.tsx`, `HomeHero.tsx`, `app/page.tsx` |
| iOS consumer | yes | `rentevent-ios/RentEvent/Models/HeroSlide.swift`, `Endpoints/CommonEndpoint.swift` |
| `next/image` host restriction (ufs.sh, utfs.io) | yes (web + admin) | `next.config.ts` |

Not verified here: that prod Postgres has `hero_slides` (it should, as the commit is pushed). Check before anything else: `curl -s -o /dev/null -w '%{http_code}' https://api.rentevent.uz/api/hero-slides` → 200.

### Gaps vs the client's ask and vs the rules

1. **Orange block is not replaced.** The orange slide is always slide 0 (`HeroSlider.tsx`: `count = slides.length + 1`). The client asked for an image *instead* of it.
2. **No schedule** (start/end dates) and **no `image_key`**: the upload returns `{url, key}` (`admin-upload.service.ts`) but the manager keeps only the URL, so replacing/deleting a slide leaves orphan files in UploadThing.
3. **`image_url` and `cta_url` are unvalidated strings** (`content.service.ts` `mapInput`). `image_url` outside ufs.sh/utfs.io makes `next/image` fail (400) and breaks the slide; `cta_url` accepts `javascript:` (rendered in an `<a>`/`Link`).
4. **`reorder` is fragile**: unknown id → Prisma P2025 → 500; no size cap; ids not validated as strings.
5. **No role check**: `AdminAuthGuard` only authenticates; any active staff member can edit. Same state as other admin controllers, so follow whatever fix-plan D (F9) decides; do not invent a role model here.
6. **Public endpoint has no cache headers** and returns `created_at`/`is_active` (harmless, but not needed).
7. Delete is hard delete, fine for slides (no FK).

## 1. Schema: additive only

Scope (owner, 2026-11-16): slides serve the website **and** the iOS app. The client's photos are 16:9 (about 1672×941); a phone needs a portrait crop, hence the optional mobile image. Add to `HeroSlide` (all nullable, no defaults needed, no backfill):

```prisma
imageKey  String?   @map("image_key")   // UploadThing file key, for cleanup
mobileImageUrl String? @map("mobile_image_url") // portrait 4:5 crop for phones (web <640px and iOS); null = use image_url
mobileImageKey String? @map("mobile_image_key")
focalX    Int?      @map("focal_x")     // 0-100, null = 50; phone crop point when there is no mobile image
focalY    Int?      @map("focal_y")
alt       String?                       // accessible name for image-only slides (title empty)
startsAt  DateTime? @map("starts_at")   // null = from now
endsAt    DateTime? @map("ends_at")     // null = no end
@@index([isActive, startsAt, endsAt])   // replaces nothing; keep existing [isActive, displayOrder]
```

**Title becomes optional without a schema change:** `title` stays `NOT NULL`; an image-only slide stores `''` (relaxing the column would break a rollback to old code). The API stops requiring a title for hero slides (an `image_url` is still required); inspirations keep requiring it. Clients treat empty/whitespace `title` as "no title" (the existing `localizedField` falls back to the RU base, so also empty → render nothing).

Nothing else changes: titles stay `title` (+`_uz`/`_en`) as built; do not rename to match the brief. The "link" is the existing `cta_url`.

### Rollout (CLAUDE.md rule 2; each step needs the owner's OK)

1. Branch with the schema + API change; `scripts/check.sh` green. Do not push `main` yet.
2. Owner OK → apply to prod from `packages/db`. Prefer plain SQL, reviewed first (no data-loss prompt possible):
   ```sql
   ALTER TABLE hero_slides
     ADD COLUMN IF NOT EXISTS image_key text,
     ADD COLUMN IF NOT EXISTS mobile_image_url text,
     ADD COLUMN IF NOT EXISTS mobile_image_key text,
     ADD COLUMN IF NOT EXISTS focal_x integer,
     ADD COLUMN IF NOT EXISTS focal_y integer,
     ADD COLUMN IF NOT EXISTS alt text,
     ADD COLUMN IF NOT EXISTS starts_at timestamp(3),
     ADD COLUMN IF NOT EXISTS ends_at   timestamp(3);
   CREATE INDEX IF NOT EXISTS hero_slides_is_active_starts_at_ends_at_idx
     ON hero_slides (is_active, starts_at, ends_at);
   ```
   (Or `prisma db push` from `packages/db` against prod `DATABASE_URL`; it must report only additions. Abort on any "data loss" warning.) Index name must match Prisma's default so a later `db push` does not see drift; confirm with `prisma db push --dry-run`-style diff (`prisma migrate diff --from-url ... --to-schema-datamodel ... --script`) before applying.
3. Verify: `GET https://api.rentevent.uz/api/products?limit=1` → 200 and `GET .../hero-slides` → 200 (old API code ignores the new columns, so this passes before the push of `main`).
4. Owner OK → push `main` (auto-deploy, ~3-4 min). Re-verify both endpoints.

Rollback: the columns are unused by old code, so rolling back the app needs no DB change (revert/redeploy previous commit). Dropping is optional and only after the old code is live: `ALTER TABLE hero_slides DROP COLUMN image_key, DROP COLUMN mobile_image_url, DROP COLUMN mobile_image_key, DROP COLUMN focal_x, DROP COLUMN focal_y, DROP COLUMN alt, DROP COLUMN starts_at, DROP COLUMN ends_at; DROP INDEX IF EXISTS hero_slides_is_active_starts_at_ends_at_idx;` (loses only the new data). Take a `pg_dump -t hero_slides` first.

Note: `main` is currently 18 commits ahead of origin with other schema-touching work pending (STATUS: cards table drop). Do not bundle this with that push without the owner's decision.

## 2. API (`apps/api/src/content`)

Public `GET /hero-slides` (no auth, throttled like other public GETs):
- Filter: `isActive && (startsAt null or <= now) && (endsAt null or >= now)`, order `displayOrder, createdAt`.
- **Contract (stable, shared by web and iOS).** Envelope is the global wrapper `{success:true, data:{items:[...]}}` (`response-wrapper.interceptor.ts`); the web client already unwraps it. Items are already filtered and sorted, so clients never sort or date-check. Fields only ever get added, never renamed or removed:
  `id`, `image_url` (desktop/landscape 16:9), `mobile_image_url` (portrait 4:5 or `null` → client uses `image_url`), `focal_x`/`focal_y` (int 0-100 or `null` = 50; used for the phone crop of `image_url`: web `object-position: x% y%`, iOS alignment offset), `alt` (string or `null`), `title`/`title_uz`/`title_en`, `subtitle`/`_uz`/`_en`, `cta_label`/`_uz`/`_en`, `cta_url`, `display_order`, `updated_at` (cache-bust key), plus the existing `is_active`, `created_at` (keep: the iOS model and web type tolerate them; do not remove).
- URLs are absolute `https` UploadThing URLs (guaranteed by the write-side validator, §2); no relative paths, no signing. `cta_url` may be a relative path (`/catalog`) or `https://...`; iOS maps relative paths to a screen or `https://rentevent.uz` + path (§5).
- Locale: the server returns all three locales; clients pick (`uz`/`en` fall back to the RU base field). No `Accept-Language` negotiation, keeps the response cacheable by one key.
- Cheap: one indexed query (`isActive, startsAt, endsAt`), ≤ 10 slides (cap on create), payload ≈ 3-5 KB. Express' default weak `ETag` stays on, so `If-None-Match` revalidation returns 304 without a body.
- Header `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600` (verify the Railway proxy does not strip it). Admin edits show on the storefront within ~5 min; acceptable, say so in the admin hint.

Admin (`admin/hero-slides`, existing routes, unchanged paths). Changes in `ContentService`:
- `image_key`, `mobile_image_url`, `mobile_image_key` (string|null; `mobile_image_url` gets the same host rule as `image_url`, and `mobile_image_key` is only accepted together with its URL), `starts_at`, `ends_at` (ISO string|null) in/out snake_case. Unparsable dates → 400.
- `focal_x`/`focal_y`: integers 0-100 (reject floats, strings, out of range), accepted independently (a missing one means 50). `alt`: ≤ 200 chars, empty → null. `title` may be empty for hero slides (see §1).
- Schedule is whole days in Tashkent time (UTC+5, no DST): admin sends `starts_at`/`ends_at` as `YYYY-MM-DD`; the API stores `starts_at` = that day 00:00 +05:00 and `ends_at` = that day 23:59:59.999 +05:00 (inclusive last day), and returns the same `YYYY-MM-DD` strings. `ends_at >= starts_at` or 400.
- Cap: at most 10 slides (create returns 400 above it). `image_url`: must be `https` and host `*.ufs.sh` or `utfs.io` (same list as `next.config.ts`; keep the list in one shared constant in `packages/validators`). 400 otherwise.
- `cta_url`: empty, a relative path starting with a single `/`, or `http(s)://`. 400 otherwise (no `javascript:`/`data:`/`//host`).
- Length caps: title ≤ 120, subtitle ≤ 300, cta_label ≤ 40, urls ≤ 500.
- `reorder`: array of unique strings, 1–50, all must exist (400 otherwise); one transaction (as now).
- On `delete` and on `update` that changes `image_url` or `mobile_image_url`: best-effort `UTApi.deleteFiles(old keys)` after the DB write; failure only logs (never fails the request). Needs the `UTApi` from the upload service exposed (inject `AdminUploadService`, add `deleteFile(key)`).
- Authorization: keep `AdminAuthGuard`; add role check only if/when F9 introduces a shared decorator. Inspirations share this code, so the validators apply to both kinds (`link_url` gets the same rule as `cta_url`).
- Tests: extend `apps/api` unit tests for `mapInput` validation, schedule filter (mock clock), reorder validation.

## 3. Upload

Two uploads per slide (desktop, optional mobile), same endpoint. Reuse `POST /admin/upload/image` unchanged: JPEG/PNG/WebP by magic bytes, 10 MB (`MAX_UPLOAD_BYTES`), returns `{url, key}`. **Security T8 is changing these limits in parallel**: this feature must not copy limits; it only consumes `data.url` and `data.key`. Keep key-point content of the mobile crop in the centre (text is rendered by the app, over a gradient). Admin form change: keep `key` in form state, send `image_key`. Recommend in the admin hint: desktop 16:9, 1672×941 or larger; mobile 4:5 (e.g. 1080×1350); both, ≤ 2 MB, text-free (text is rendered by the site); no server-side dimension check (Next resizes).

## 4. Web home (`apps/web`)

- Keep the client fetch (`useQuery(['hero-slides'])`, staleTime 5 min). The home page is a client component, so ISR/`revalidate` does not apply; the HTTP cache headers above are the cache. Do not convert the page to a server component for this.
- **Decision (needs owner OK, see Q1):** when ≥1 active slide exists, show only photo slides and do not render the orange slide; with 0 slides (or fetch error/loading) show the orange hero exactly as today. Loading state: show the orange hero until the first response (no layout jump: same min-height), then swap; avoid flashing by not autoplaying before data arrives. If Q1 is "keep orange as slide 1", skip this item.
- `HeroSlider`: `count = slides.length` when slides exist; first photo slide gets `priority`; single slide → no dots/arrows/autoplay (already handled by `count > 1`). Keep `alt=""` only if title is rendered next to it (it is).
- Images: `next/image` with the existing remotePatterns (ufs.sh, utfs.io) is enough; security T9 restricts to these hosts, which matches the API validator. If T9 narrows the pattern further (e.g. to the app's UploadThing app id subdomain), update the shared host constant, not each place.
- Mobile image: render `<picture>`-style with `next/image` by switching `src` under 640 px (`useMediaQuery`-free: two `Image` elements with `hidden sm:block` / `sm:hidden`, only the visible one loads via `loading`/`priority` on the right one), falling back to `image_url` when `mobile_image_url` is null.
- i18n: `localizedField(slide,'title',locale)` already falls back to RU. Locale strings exist (`home.hero_*`).

## 5. iOS (in scope now)

State today (`rentevent-ios`): `Models/HeroSlide.swift` (snake_case `CodingKeys`, `HeroSlidesResponse{success,data{items}}`, localized helpers via `ContentLanguage.pick`), `CommonEndpoint.getHeroSlides` (`GET /hero-slides`, no auth), `CatalogService` and `Screens/Home/HomeTab.swift` reference it. The model comment says "empty on prod today, so Home shows only the brand slide".

Conventions to follow (`docs/spec/ios-refresh.md`): per-model snake_case `CodingKeys`, no global key strategy (events/sets/hero are snake_case, products camelCase); Nest error shape `{statusCode, message: String|[String], error}`, 429 → `NetworkError.tooManyRequests`; API enums/unknown values must not break decoding (`FallbackDecodable`); every UI string via `L(...)` with ru/uz/en; dates as local-day strings; `OfflineManager` (Caches dir JSON, keys in `OfflineCacheKey`) and `ImageCache` exist and must stay minimal (privacy manifest); decoding tests use JSON fixtures captured from prod by GET only.

Task **I1** (iOS coder, after H1 is deployed or against a fixture):
- Model: add `mobileImageUrl` (`mobile_image_url`, optional), `displayOrder`, `updatedAt` as optionals; unknown keys are ignored by `Codable`, so old builds keep working. Helper `imageURL(isPhone:)` → mobile URL if present and non-empty, else `imageUrl`; phones (compact width) use the mobile crop, iPad uses desktop. Parse URLs with `URL(string:)`; accept only `https`; a slide whose image URL does not parse is dropped, not shown broken.
- Fetch: through the existing `NetworkManager`/`CommonEndpoint.getHeroSlides`, once per Home appearance, not on every scroll; no auth. Order and dates are already applied by the server: do not re-sort or date-filter.
- Cache: write the decoded list to `OfflineManager` under a new key `offline_hero_slides` and show it instantly on cold start, then refresh in the background (stale-while-revalidate); honour the server's `Cache-Control`/`ETag` through `URLSession` (default cache policy). Images via `ImageCache`, keyed by URL (a changed image has a new UploadThing URL, so no manual invalidation).
- Fallback: no cache + offline, request error, 429, decode failure, or empty list → show the current brand hero slide only, silently (no error banner for a decorative block). The brand slide stays the first screen while loading (no empty frame, no layout jump).
- Image-only slide (empty title): no text block; VoiceOver label = `alt`, else "RentEvent". Display (per Q1): ≥1 slide → photo slides replace the brand hero, with title/subtitle/CTA over a bottom gradient; 1 slide = no pager/autoplay; ≥2 = swipe + page dots, autoplay respects Reduce Motion, pauses when the app is inactive.
- CTA: iOS must follow `cta_url` (today the code always opens the catalog); `cta_url` starting with `https://` opens in `SFSafariViewController`; `/catalog`, `/events`, `/sets`, `/product/<id>`, `/event/<id>` map to the in-app screen via `DeepLinkHandler`; anything else is ignored (button hidden). Label: localized `cta_label`, else `L("home.hero_cta_default")`.
- Accessibility: slide title is the accessibility label of the image; pager announces "n of m"; CTA is a button.
- Tests: fixture decode (with and without `mobile_image_url`, extra unknown keys), `imageURL(isPhone:)` fallback, localization fallback to RU, empty/failed fetch → brand hero, cache read on cold start.
- Done when: `scripts/check.sh` green; focal fallback verified (landscape photo, no mobile image, focal 30/50 → subject visible on a 390 pt phone); Simulator screenshots with 0, 1 and 3 slides on iPhone and iPad; airplane mode shows the cached slides, then the brand hero after the cache is cleared.

## 6. Quick-add (+ / stepper) on product cards: cart-only, no API change

Confirmed by reading the code:
- Cart is client-only (`stores/cart-store.ts`, zustand + localStorage). `addItem(product, qty, start, end, eventId)` prices locally; the server only sees the cart at checkout (`POST /orders`, plus public `POST /orders/quote` re-prices and re-validates dates and stock). No endpoint is needed.
- Constraints the coder must respect:
  1. **Dates.** A card has no date picker. Use the persisted `rental-period-store` (`from`/`to`, validated by `isValidStoredPeriod`). If none: either default to tomorrow→tomorrow like the product page (`getTomorrow()`), or open the product page / period picker (Q3).
  2. **One period per order.** Checkout sends the first item's dates for the whole order. Quick-add must reuse the existing cart's `rentalStartDate/EndDate` when the cart is non-empty, never introduce a second period.
  3. **Fair price.** Pass `eventId` only when `product.eventPrice != null` and the stored event matches (same rule as `app/product/[id]/page.tsx`, `eventPrice != null ? selectedEvent?.id : null`).
  4. **`addItem` replaces** an existing line, it does not increment. The stepper must call `updateItem(productId, {quantity})` and `removeItem` at 0, and first-add calls `addItem`.
  5. **Stock.** Cap quantity at `product.availableStock ?? product.totalStock`; hide `+` when 0 stock.
  6. **Card is wrapped in `<Link>`**: the button must `preventDefault()` + `stopPropagation()` (as the favorite button does) and be ≥ 44 px touch target.
  7. Hydration: read the cart after mount (the persisted store differs from SSR).
- Verify `updateItem` recalculates tier/quantity pricing; if it does not, fix in the store (not in the API).
- Price/discount display on the card stays; the stepper shows the quantity only.

## 7. Coder tasks (ordered, each small; one session per task, `coder` role)

| # | Task | Files | Done when |
|---|---|---|---|
| H1 | Schema + API: add `image_key`, `starts_at`, `ends_at`; schedule filter; validators (image host, cta/link URL, lengths, dates); reorder validation; Cache-Control; shared host constant. **No `db push`.** | `packages/db/prisma/schema.prisma`, `apps/api/src/content/*`, `packages/validators` | `scripts/check.sh` green; new unit tests pass; SQL from §1 written to `docs/ops/hero-slides-columns.md` |
| H2 | Rollout (owner present): steps 2–4 of §1 | prod DB, then push | both endpoints 200 before and after the push; owner OK recorded |
| H3 | UploadThing cleanup on delete/replace; admin sends/stores `image_key` | `admin-upload.service.ts`, `content.service.ts`, `HomeContentManager.tsx` | replacing a slide's photo deletes the old file (manual check in UploadThing dashboard); failure of delete does not fail the request |
| H4 | Admin screen: focal-point picker (click on the desktop preview), alt text field, second upload "Mobile photo (4:5)" with preview and fallback hint, start/end date fields, "scheduled / live / ended" badge, size hint, cache note; i18n RU/UZ/EN | `HomeContentManager.tsx`, `apps/admin/src/lib/i18n/locales/*` | create slide with dates, list shows correct badge; invalid URL shows the API error |
| H5 | Web hero: slides replace the orange block when ≥1 exists (per Q1); fallback unchanged | `HeroSlider.tsx`, `app/page.tsx` | 0 slides → orange as today; 1 slide → single photo, no controls; 3 slides → autoplay/arrows/swipe; no layout shift; screenshot desktop+mobile |
| C1 | Quick-add on `ProductCard` per §6 and the UI spec | `components/catalog/ProductCard.tsx`, maybe `cart-store.ts`, i18n | + adds at stored period; stepper changes qty; cart badge updates; checkout shows one period; link click does not trigger; works signed-out |

| I1 | iOS hero: model, fetch, cache, fallback, display (§5; repo `rentevent-ios`) | `Models/HeroSlide.swift`, `Services/CatalogService.swift`, `Services/OfflineManager.swift`, `Screens/Home/HomeTab.swift`, `L10n`, `RentEventTests/` | §5 "Done when" |

H1→H2→H3/H4 (parallel after H1)→H5; I1 can be coded against a fixture right after H1 and shipped after H2. C1 (quick-add) is independent of H* and can start any time; it must not touch `apps/api`.

## Open questions for the owner

1. **Orange hero**: remove it when photo slides exist (client's words: "instead of")? *Recommend yes; it stays only as the empty-state fallback (the designer spec already assumes this).*
2. **Schedule dates** (start/end) on slides: needed now? *Recommend yes (cheap, additive, avoids manual toggling for fair campaigns).*
3. **Quick-add without a chosen period**: default to tomorrow (1 day) or send the visitor to pick dates first? *Recommend: if no period is stored, the + opens the date picker once, then remembers it.*
4. **Mobile crop**: who prepares the 4:5 crops of the client's three 16:9 photos? *Recommend the owner/designer crops them once; the mobile image stays optional, the fallback is the desktop image with a centre crop.*
5. **Push order**: ship this schema together with the pending `main` push (11-02 merge + T1-T2…) or separately? *Recommend separately, after the pending push is OK'd and deployed, so a prod-DB step is never mixed with the cards drop.*
