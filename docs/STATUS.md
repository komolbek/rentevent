# Status — rentevent
Updated: 2026-11-16 (evening)

**Stage:** MVP (production services live on Railway; storefront behind a "coming soon" gate)

## Recently done
- 2026-11-16, all pushed and live (`main` = `4f8e25b`): security T1–T13 (OTP caps, phone normalization, CORS/headers,
  upload limits, masked logs, pagination, Swagger off); hero slides (schema applied to prod by hand, API, admin screen
  with link picker, web slider + loader, iOS hero); quick-add `+`/stepper on product cards (also with a fair selected);
  manual System/Light/Dark theme on the web; 2026-11-02 iOS merge (`/orders/quote`, `DELETE /user/profile`).
- 2026-11-16 SMS go-live set (audit `docs/security/sms-readiness-2026-11-16.md`, SMS1–SMS11): strict provider config (boot
  fails on bad config), timeouts + breaker, per-phone/IP/global caps, test-auth guard for the App Review account, hashed
  OTP per purpose (`OTP_PEPPER`), dev OTP viewer removed in prod, web/admin OTP input + error codes, Eskiz-approved text,
  structured `sms_send` logs (`docs/ops/sms-monitoring.md`), admin reset answers alike, dead sms-templates endpoints removed.
  Real login test on prod passed (SMS via gateway arrives, about 1 s send time).
- iOS (`rentevent-ios`, pushed, `2e39ff5`): 90-day cap, hero slides, OTP fixes, review notes; build 5 archived
  (TestFlight upload by the owner, see that repo's STATUS).
- Earlier: multilingual products, events/fairs, sets, UploadThing, header to the fair.rent reference (see git log).

## In progress
- Uncommitted in this worktree (`apps/web`): alternating full-width section bands on the home page (`docs/design/home-section-rhythm.md`): `Band` component + `.home-bands` CSS, rails render nothing while loading or empty (no skeletons) so the band rhythm never flips, `--color-primary-text` darkened to #B83C1C (spec's #C2431D gave only 4.29:1 on the tint). `scripts/check.sh` green; checked in the browser pane without API data (only the always-on sections render), rails with data not seen live.

## Next
- Decide go-live: set `SITE_GATE_ENABLED=false` on the RentEvent Web service; first publish the hero photos
  (texts drafted in `docs/client/outbox/hero-slide-texts.md`; slide 3 link `/catalog?category=<bar stool id>` via the picker).
- Populate content: Sets in admin, UZ/EN translations for products/sets/events.
- Migration tracking for prod DB (today `prisma db push` by hand, see CLAUDE.md rule 2).

## Waiting on
- Owner: drop prod `cards` table (`docs/ops/drop-cards-table.md`; API no longer uses it).
- Owner: App Review account: choose the review phone + code, set `ENABLE_TEST_AUTH`/`TEST_PHONE_NUMBERS`/`TEST_OTP_CODE`
  in Railway only when submitting (`docs/ops/app-review-account.md`).
- Owner: native check of the Uzbek hero texts; does the catalog have bar counters; slide 1 link `/events` vs `/catalog`.
- Owner/Eskiz: second approved template ending `@rentevent.uz #{CODE}` if phone autofill matters.
- Owner: shared `sms-gateway` items G1–G5 (balance alert, hardening deploy, `WEBHOOK_ALLOW_LEGACY`): 5 products depend on it.
- Owner/legal: retention of anonymized orders and `orders.notes` (`docs/spec/account-deletion.md`).
- Owner: CI/Dockerfiles use `pnpm install --no-frozen-lockfile`; switch? (deploy config, not done here)
- Owner: client contact person, language and contract terms for `docs/client/brief.md`.
- Owner/client, security (fix plan D1–D7): F3 orders CONFIRMED unpaid; F6/F16 Multicard callback + error details
  (payments code); F8 `Staff.sessionVersion` (schema); F9 MANAGER vs ADMIN rights; F18 shared rate-limit store before scaling.
- Owner: `pnpm audit --prod`; duplicate-phone users in prod; rotate the Yandex MapKit key (in iOS git history).
- Owner OK needed before any schema change reaches prod DB (CLAUDE.md rule 2).

## Known issues
- No root `typecheck` script; `build` (nest build / next build) is the type check.
- Lint: 1 warning, unused `body` in `apps/api/src/admin/admin-reviews.controller.ts:49`.
- Tests: `apps/api` (237), small unit suites in `apps/web` and `apps/admin` (vitest); no end-to-end tests.
- SMS send caps are in memory: they reset on every deploy and per replica (F18).
- Admin hero screen not yet checked in a browser against live data.
- Admin sends snake_case + REST; the API was written camelCase. No global transform: each admin
  endpoint maps fields itself. A new admin page that "won't save" or shows blank fields: suspect this.
- `prisma/migrations/` is gitignored and prod is not migration-tracked.
- Admin Railway service redeploys only on `apps/admin/**` and `packages/**`; "Skipped" is normal.
