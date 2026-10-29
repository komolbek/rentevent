# RentEvent
Event-equipment rental platform: storefront (rentevent.uz), admin panel (admin.rentevent.uz) and
API (api.rentevent.uz/api). Stage: MVP, storefront gated. Client: Raad Exhibition (the owner may get a share later); see `docs/client/brief.md`.

## Stack
pnpm 10 + Turborepo monorepo. `apps/web` and `apps/admin`: Next.js. `apps/api`: NestJS.
`packages/db`: Prisma + Postgres. `packages/types`, `packages/validators`: shared TS.
UploadThing (images), Payme and Click (payments), sms-gateway / Eskiz (OTP), Resend (email).
Locales: RU (default, no suffix), UZ (`*_uz`), EN (`*_en`).

## Where things are
- Deploy files: root `Dockerfile*`, `.railway/railway.ts`: do not touch without OK.
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
2. Schema is managed with `prisma db push`, not `migrate`. Before pushing a schema change to
   `main`, apply it to prod Postgres first (with the owner's OK) from `packages/db`, then verify
   `https://api.rentevent.uz/api/products?limit=1` returns 200. Otherwise the API fails with P2022.
3. Admin sends snake_case + REST; every admin endpoint maps snake↔camel itself (no global transform).
4. Never hardcode the currency ("UZS"); use `t('common.currency')`.
5. Never reference the exported zustand store inside `onRehydrateStorage`; use `merge()`.

## Related projects
- `rentevent-ios`: iOS client of this API.
- `sms-gateway`: OTP delivery (`SMS_GATEWAY_URL`, `SMS_GATEWAY_API_KEY`).

## Agents
Shared from `~/.claude/agents/`: `pm`, `architect`, `designer`, `coder`, `tester`, `reviewer`, `explorer`, `client-manager`, `security`, `legal` (jobs and output folders: STANDARD.md § Agents). No project overrides.

Standard: `~/Projects/komolbek/STANDARD.md`. Current state (loaded into every session):
@docs/STATUS.md
