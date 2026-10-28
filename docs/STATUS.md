# Status — rentevent
Updated: 2026-10-29

**Stage:** MVP (production services live on Railway; storefront behind a "coming soon" gate)

## Recently done
- Aug–Oct 2026: multilingual products (RU/UZ/EN), category reorder, Events (15 CAEx fairs seeded),
  Sets (bundles expand into products in the cart), UploadThing image upload, orders 500 fixed.
- Sep 2026 storefront UX pass: header rebuilt to the client's reference (fair.rent), date-range
  availability filter (`GET /products?start_date&end_date`). Specs: `docs/design/`.
- Oct 2026: fair pages, whole-fair prices, recommended picks, fair picker fixes.
- 2026-10-29: migrated to STANDARD.md (docs/design, CLAUDE.md, scripts/check.sh, .gitignore).
- 2026-10-29: legacy `rentevent-server/`, `rentevent-web/` and `nixpacks.toml` removed (owner OK; live
  Railway checked: all 3 services build from the root `Dockerfile`, last Web deploy used DOCKERFILE);
  README rewritten; obsolete `origin/dev` deleted.

## In progress
- Nothing open. Branch `main` only.

## Next
- Decide go-live: set `SITE_GATE_ENABLED=false` on the RentEvent Web service.
- Populate content: Sets in admin, UZ/EN translations for products/sets/events.
- Migration tracking for prod DB (today `prisma db push` by hand, see CLAUDE.md rule 3).

## Waiting on
- Owner: CI uses `pnpm install --no-frozen-lockfile` and the Dockerfiles likewise; frozen
  lockfile passes locally. Switch? (deploy/CI config, not done here)
- Owner: client contact person, language and contract terms for `docs/client/brief.md`. Confirm CLAUDE.md rules 1, 2 and 7; rules 3–6 come from the old HANDOFF.
- Owner OK needed before any schema change reaches prod DB (see CLAUDE.md rule 3).

## Known issues
- No root `typecheck` script; `build` (nest build / next build) is the type check.
- Lint: 1 warning, unused `body` in `apps/api/src/admin/admin-reviews.controller.ts:49`.
- Tests exist only in `apps/api` (11 tests); web and admin have none.
- Admin sends snake_case + REST; the API was written camelCase. No global transform: each admin
  endpoint maps fields itself. A new admin page that "won't save" or shows blank fields: suspect this.
- `prisma/migrations/` is gitignored and prod is not migration-tracked.
- Admin Railway service redeploys only on `apps/admin/**` and `packages/**`; "Skipped" is normal.
