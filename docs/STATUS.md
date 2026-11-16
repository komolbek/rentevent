# Status — rentevent
Updated: 2026-11-16

**Stage:** MVP (production services live on Railway; storefront behind a "coming soon" gate)

## Recently done
- 2026-10-29: owner confirmed the CLAUDE.md rules
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
- 2026-11-02: merged to local `main` (not pushed/deployed), for the iOS app: `POST /orders/quote`
  (public, rate-limited; `docs/spec/order-quote.md`), `DELETE /user/profile` (anonymize;
  `docs/spec/account-deletion.md`), `/privacy` `/terms` `/contacts` open while gated,
  `/user/cards` and the `Card` model removed. Prod `cards` drop: `docs/ops/drop-cards-table.md`.
- 2026-11-16: security T1 (`f83fa4d`) + T2 (`dd1af18`) committed on local `main` (owner OK), not pushed.
  Reviewed, `scripts/check.sh` green. Details: fix plan "Progress". `docs/security/` still uncommitted.

- 2026-11-16: hero slides H3 (UploadThing cleanup on replace/delete) + H4 (admin screen: focal point, mobile photo, alt,
  dates, status badge) in working tree, uncommitted; `scripts/check.sh` green; not checked in a browser (no local DB).

## Next
- Security fixes T3–T13 in plan order (T3 reuses T1's `normalizeUzPhone`), plan
  `docs/security/fix-plan-2026-11-15.md`, audit `docs/security/audit-2026-11-15.md`. F3 (D1) before go-live.
- Decide go-live: set `SITE_GATE_ENABLED=false` on the RentEvent Web service.
- Populate content: Sets in admin, UZ/EN translations for products/sets/events.
- Migration tracking for prod DB (today `prisma db push` by hand, see CLAUDE.md rule 2).

## Waiting on
- Owner: OK to push `main` (deploys the 11-02 merge + T1 + T2); commit `docs/security/`? (lists open vulns).
- iOS (`rentevent-ios`, not checked): after T2 the API returns 400 for past start / >90 days on
  `GET /products` and `/products/:id/availability`. Verify the app never sends those before deploy.
- Owner: OK to push/deploy the merge above, then OK to drop prod `cards` (`docs/ops/drop-cards-table.md`).
- Owner/legal: retention of anonymized orders and `orders.notes` (`docs/spec/account-deletion.md`).
- Owner: CI uses `pnpm install --no-frozen-lockfile` and the Dockerfiles likewise; frozen
  lockfile passes locally. Switch? (deploy/CI config, not done here)
- Owner: client contact person, language and contract terms for `docs/client/brief.md`.
- Owner OK needed before any schema change reaches prod DB (see CLAUDE.md rule 2).
- Owner/client, security (fix plan D1–D7): F3 orders CONFIRMED unpaid (interim caps vs PENDING+expiry);
  F6/F16 Multicard callback + error details (payments code); F8 `Staff.sessionVersion` (schema);
  F9 MANAGER vs ADMIN rights; F17 OTP purpose (schema?); F18 shared rate-limit store before scaling.
- Owner: check Railway env (test auth off, `SMS_PROVIDER`≠mock, secrets, `ALLOWED_ORIGINS`),
  duplicate-phone users in prod, `pnpm audit --prod`.

## Known issues
- No root `typecheck` script; `build` (nest build / next build) is the type check.
- Lint: 1 warning, unused `body` in `apps/api/src/admin/admin-reviews.controller.ts:49`.
- Tests exist only in `apps/api`; web and admin have none.
- Admin sends snake_case + REST; the API was written camelCase. No global transform: each admin
  endpoint maps fields itself. A new admin page that "won't save" or shows blank fields: suspect this.
- `prisma/migrations/` is gitignored and prod is not migration-tracked.
- Admin Railway service redeploys only on `apps/admin/**` and `packages/**`; "Skipped" is normal.
