# RentEvent
Event-equipment rental platform: storefront (rentevent.uz), admin panel (admin.rentevent.uz) and
API (api.rentevent.uz/api). Stage: MVP, storefront gated. Client: ? (see STATUS).

## Stack
pnpm 10 + Turborepo monorepo. `apps/web` and `apps/admin`: Next.js. `apps/api`: NestJS.
`packages/db`: Prisma + Postgres. `packages/types`, `packages/validators`: shared TS.
UploadThing (images), Payme and Click (payments), sms-gateway / Eskiz (OTP), Resend (email).
Locales: RU (default, no suffix), UZ (`*_uz`), EN (`*_en`).

## Where things are
- `rentevent-server/`, `rentevent-web/`: legacy, not deployed, not part of the workspace; do not
  edit or build them (removal pending, see STATUS).
- Deploy files: root `Dockerfile*`, `.railway/railway.ts`, `nixpacks.toml`: do not touch without OK.
- Specs and UX audits: `docs/design/`. Shared i18n for the storefront: `apps/web/src/lib/i18n/`.
- Dev servers for the preview pane: `.claude/launch.json` (api 4000, web 3002, admin 3003).

## Run and check
- `pnpm install --frozen-lockfile`, `pnpm db:generate` (needed before any API build).
- `pnpm dev` (all) or `dev:api`, `dev:web`, `dev:admin`. `pnpm lint`, `pnpm test`, `pnpm build`.
- `scripts/check.sh` = install + generate + lint + test + build, no database needed.
- Done = `scripts/check.sh` green.

## Deploy
Railway project "RentEvent": Web, Admin, API, Postgres. Every push to `main` auto-deploys
(Dockerfile build, ~3–4 min each). No migrate step runs on deploy.

## Rules (do not break)
1. Payments code (Payme, Click) does not change without explicit owner OK.
2. Production DB is read-only unless the owner says otherwise; never run migrate against Railway.
3. Schema is managed with `prisma db push`, not `migrate`. Before pushing a schema change to
   `main`, apply it to prod Postgres first (with the owner's OK) from `packages/db`, then verify
   `https://api.rentevent.uz/api/products?limit=1` returns 200. Otherwise the API fails with P2022.
4. Admin sends snake_case + REST; every admin endpoint maps snake↔camel itself (no global transform).
5. Never hardcode the currency ("UZS"); use `t('common.currency')`.
6. Never reference the exported zustand store inside `onRehydrateStorage`; use `merge()`.
7. Webhooks and callbacks verify signatures and stay idempotent; secrets only in env vars.

## Related projects
- `rentevent-ios`: iOS client of this API.
- `sms-gateway`: OTP delivery (`SMS_GATEWAY_URL`, `SMS_GATEWAY_API_KEY`).

Standard: `~/Projects/komolbek/STANDARD.md`. Current state (loaded into every session):
@docs/STATUS.md
