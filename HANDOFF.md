# RentEvent / RentEvent — Session Handoff

> Working notes for continuing this project in a new chat. Last updated after the
> Aug 2026 build session (fonts, header, product i18n, categories, events, sets).

## What this project is
An event‑equipment **rental** business:
- **Storefront** (`rentevent.uz`) — customers browse & rent equipment.
- **Admin panel** (`admin.rentevent.uz`) — manage catalog, orders, events, sets, staff.
- **API** (`api.rentevent.uz/api`) — NestJS backend.

## Repo layout (monorepo — pnpm + turbo)
Everything lives in **`rentevent-backend/`** (git repo, default branch `main`).
`rentevent-ios/` is a **separate** repo. Apps:
- `apps/web` — Next.js storefront (port 3000)
- `apps/admin` — Next.js admin (port 3001)
- `apps/api` — NestJS API (port 4000)
- `packages/db` — Prisma schema + client (`packages/db/prisma/schema.prisma`)
- `packages/types`, `packages/validators` — shared TS

## Deploy (Railway)
- **Push to `main` → Railway auto‑deploys.** Services: **RentEvent Web**, **RentEvent Admin**,
  **RentEvent API**, **Postgres**. Each ~3–4 min to build.
- CI (`.github/workflows/ci.yml`) is lint+typecheck+build only (no deploy step).
- Check status: `railway status --json` (after `railway login` + `railway link --project RentEvent --environment production`).
- Watch a deploy: poll `railway status --json` for a service's `latestDeployment.status` == `SUCCESS` and the right commit hash.

## Production database
- Railway **Postgres**, reachable via public proxy `trolley.proxy.rlwy.net` (connection string is in Railway → Postgres → Variables, and in the session memory).
- **Not migration‑tracked** (`_prisma_migrations` absent). Schema is managed with **`prisma db push`**, NOT `migrate`.
- To apply a schema change to prod:
  ```bash
  cd packages/db
  DATABASE_URL="<prod url>" npx prisma db push   # additive = safe, no data loss
  ```
  Then `pnpm --filter @rentevent/db build` and rebuild the API. **Get user OK before pushing to prod.**
- Local API build needs the client generated: `pnpm db:generate` (or `cd packages/db && npx prisma generate`), else you get 198 "Property X does not exist on PrismaService" errors.

## ⚠️ Admin ↔ API contract gotcha (important)
The **admin sends snake_case + REST** (`image_url`, `daily_price`, `category_id`,
nested `specifications`, `PATCH /:id`, `DELETE /:id`). The NestJS API was written
camelCase/RPC. **There is no global case‑transform.** Each admin CRUD endpoint must
map snake↔camel itself and be RESTful. Already fixed: **categories, products**;
built to this contract: **events, sets**. If a new admin page "won't save" or shows
blank fields → this mismatch is the first suspect.

## Storefront "coming soon" gate
- `apps/web/src/middleware.ts` rewrites **every** route to `/coming-soon` when the
  **RentEvent Web** env var `SITE_GATE_ENABLED` is `true` or `1` (it currently **is**).
- **This is why admin‑added data (events, etc.) isn't visible on rentevent.uz.**
- Private preview: enter the code (`SITE_ACCESS_CODE` in Railway Web vars) on the
  coming‑soon page → unlocks the site for that browser.
- **Go live:** set `SITE_GATE_ENABLED=false` on the RentEvent Web service (or delete it) → redeploys → public.

## Image upload
- Real via **UploadThing** (`UTApi`, token `UPLOADTHING_TOKEN` in API env).
  Endpoint `POST /admin/upload/image`, returns `{ url }` (an `ufs.sh` CDN URL).
- (Was previously a stub returning a fake `utfs.io/placeholder` URL — fixed.)

## Multilingual pattern (RU / UZ / EN)
- Products / sets / events carry `*_uz` / `*_en` columns; default (no suffix) = Russian.
- Storefront picks by locale with fallback: `apps/web/src/lib/i18n/product.ts` (`localizedName` / `localizedDescription`); events/sets pages localize inline.
- Locale is a **client‑only** zustand store (`language-store`), toggled in the header.
  The API returns **all** languages; the client chooses (locale is not sent to the API).
- Admin i18n (UI strings) is separate: `apps/admin/src/lib/i18n` + its own language store (needs `skipHydration` — see the admin hydration note in memory).

## What shipped this session (all on `main`, deployed)
- Apple system font on storefront.
- Header redesign (Fair.Rent two‑tier: utility strip, centered nav over search, right icons over phone contact; phone reveals number on tap, email removed).
- Product **multilingual** names/descriptions (admin fields + storefront switching) + product CRUD repair.
- Category **drag‑reorder** + CRUD/casing repair (images now render; edit/delete save).
- **Events** feature: `events` table + `/admin/events` + storefront `/events`; **15 CAEx events seeded** (`caexuzbekistan.com`).
- **Sets** (bundles): `sets`/`set_items` tables + `/admin/sets` (product picker + qty) + storefront `/sets`; add‑to‑cart **expands** a set into its component products (reuses existing cart/checkout — no order‑schema change).
- Fixes: customers page crash, image upload, and the **orders 500** (cleared by the prod DB sync).

## Sep 2026 storefront UX pass (see `docs/ux-audit-2026-09-11.html`)
- Header rebuilt to the client's reference (fair.rent): one ~80px bar, red fixed
  "Арендовать" side tab opens the catalog (desktop), no Catalog in the top nav.
- `GET /products` accepts `start_date` / `end_date`; with both it drops products with
  no free unit on any day of the range and adds `availableStock` to each item. The
  catalog date filter, product page and sets dialog share the `rental-period` store.
- Currency word comes from `t('common.currency')` (сум / so‘m / sum) — never hardcode "UZS".
- zustand gotcha: never reference the exported store inside `onRehydrateStorage`
  (it runs synchronously inside `create()`, before the const exists); use `merge()`.

## Open items / next steps
1. **Decide go‑live:** flip `SITE_GATE_ENABLED` to `false` when ready for public.
2. **Populate content:** create Sets in admin (Сеты); add UZ/EN translations to products/sets/events. Events already seeded (15).
3. **Uncommitted WIP:** `apps/api/src/auth/sms.service.ts` has an unrelated local edit that was intentionally left untouched all session — review before committing.
4. **Consider migration tracking** so prod stops needing manual `db push` (e.g., run `prisma migrate` going forward, or add a deploy step). Watch paths: the admin service only redeploys on `apps/admin` changes ("Skipped" deploys are normal).
5. Product/category **delete‑with‑products** force path deactivates rather than hard‑deletes (safe) — revisit if true cascade delete is wanted.

## Handy commands
```bash
# build one app
pnpm --filter @rentevent/web build
cd apps/admin && npx next build
pnpm --filter @rentevent/api exec nest build   # needs prisma client generated first

# run storefront locally (no gate locally)
cd apps/web && NEXT_PUBLIC_API_URL=https://api.rentevent.uz/api npx next dev --port 3009
# (note: local→prod API fetches get CORS‑blocked; run the API locally for full e2e)

# quick prod checks
curl -s https://api.rentevent.uz/api/events | head -c 300
curl -s https://api.rentevent.uz/api/sets   | head -c 300
```
