# SMS production readiness — 2026-11-16

Read-only audit of every SMS-related piece (code at local `main`, `c2718ab`). Nothing was run against production; no Railway/CLI access.
Scope: customer OTP login (API, web, iOS), admin forgot-password OTP, dev-OTP viewer, SMS templates admin, other SMS use, delivery side
(`SMS_PROVIDER`, shared `sms-gateway`). Payments out of scope. Builds on `audit-2026-11-15.md` and `fix-plan-2026-11-15.md` (T1–T13 shipped, not pushed).

## Map of the chain

| Piece | Where | State |
|---|---|---|
| Customer `send-otp` / `verify-otp` | `apps/api/src/auth/{auth.controller,auth.service,otp.service}.ts` | Works; limits + normalization shipped (T1/T3) |
| Sender | `auth/sms.service.ts` (`mock` / `gateway` / `eskiz`) | Only 2 callers: `sendOTP`, `sendAdminOTP`. **No other SMS exists** (no order/status SMS) |
| Admin forgot-password | `admin/admin-auth.{controller,service}.ts`, `apps/admin/.../forgot-password/page.tsx` | Limits + lockout shipped (T1) |
| Dev OTP viewer | `admin/admin-dev-otp.controller.ts`, `apps/admin/.../dev-otp/page.tsx` | Gated by one env check |
| SMS templates | `admin/admin-sms-templates.*`, table `sms_templates` | **Not used by any sender** (dead feature) |
| Delivery | shared `sms-gateway` (Eskiz) at `uzsmsapi.up.railway.app/api/v1` | Separate service, 5 products |
| Clients | `apps/web/src/app/auth/page.tsx`; iOS `PhoneEntryView`, `OTPVerificationView`, `AuthService` | Work; autofill and error handling gaps below |

**Verified OK (no finding):** OTP is 6 digits from `crypto.randomInt`; 5 min expiry; 3 attempts per code reserved atomically; single-use
consume is atomic; `timingSafeEqual`; a new code deletes older ones for the phone; phone is `+998XXXXXXXXX` only (country allow-list is
effectively Uzbekistan-only via `normalizeUzPhone`, `common/phone.ts`); client IP is the proxy-appended XFF entry; unknown/valid phone give the same
response on customer send and on admin reset (no enumeration by response); admin verify uses one generic error; masked phones in logs (T12: `sms.service.ts:87`,
`admin-auth.service.ts` log lines use `maskPhone`); no OTP printed or kept when `SMS_PROVIDER=mock` + `NODE_ENV=production`; OTP
secrets are env-only; web has `autoComplete="one-time-code"`, iOS has `.textContentType(.oneTimeCode)`; resend countdown (60 s) exists in web and iOS, "change number" path exists in both.

## Findings

Severity: High = fix before go-live / App Store submission; Medium = fix before go-live if cheap, else right after; Low = tidy.
Tags: **[iOS]** touches `rentevent-ios`; **[GW]** needs the shared sms-gateway (listed separately in "Gateway items", not proposed as a change here); **[schema]** none of the findings needs a schema change.

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| S1 | High | **A typo in `SMS_PROVIDER` fakes success and prints the OTP.** Any value other than `gateway`/`eskiz` (e.g. `Gateway`, `eskiz ` with a space) falls to the mock branch. `isMockInProduction` only matches the exact string `mock`, so the guard is skipped: `sendMock` logs the full message **including the code** and returns `success: true`. Users see "code sent", nothing is delivered, and OTPs sit in Railway logs. | `sms.service.ts:71-78` (switch default → mock), `:36-39`, `:87` | Parse the provider into a closed enum once; unknown value = config error (fail at boot, see S2); mock must never log the code outside `NODE_ENV=development/test`. |
| S3 | High | **No timeout, retry policy or circuit breaker on the provider call.** `fetch` to the gateway/Eskiz has no `AbortSignal`; the gateway itself waits up to 30 s for Eskiz. If the provider hangs, every `send-otp` request hangs (web/iOS spinner up to the client timeout), the OTP row is already written, and requests pile up. | `sms.service.ts:99`, `:119`; gateway `providers/eskiz/eskiz.provider.ts:34` (30 s) | `AbortSignal.timeout(8000)`; no automatic re-send (a retry can double-charge and send two codes); after N consecutive failures answer 503 immediately for ~30 s; log result and latency. |
| S4 | High | **Test-auth is an unguarded static-code login.** With `ENABLE_TEST_AUTH=true`, any phone in `TEST_PHONE_NUMBERS` gets the fixed `TEST_OTP_CODE` instead of a random one. Nothing blocks this in production, nothing warns at boot, the same path serves the **admin reset** (a staff phone in the list gets a known reset code → account takeover), and the real SMS with the fixed code is still sent. `isTestAuthEnabled()` is never called. List entries must be written as `998…` without `+` (undocumented). | `otp.service.ts:12-17`, `:33-38`, `:24`; `.env.example:8-10`; `docker-compose.yml:14` | Boot check: in production refuse `ENABLE_TEST_AUTH=true` unless `TEST_PHONE_NUMBERS` has ≤2 entries and `TEST_OTP_CODE` is set; never apply to a staff phone; skip the SMS for test phones; log one warning at boot when active. See S5/D1. |
| S5 | High | **iOS App Review has no way to sign in.** Login is SMS-only and checkout/account sit behind it; STATUS records "no demo account". Apple (guideline 2.1) rejects a build whose sign-in needs a number the reviewer does not own. Browsing works as guest (`AuthCoordinator.dismiss()`), but ordering does not. | `rentevent-ios` STATUS "owner decisions … no demo account"; `Coordinator/AuthCoordinator.swift:40-42`; `otp.service.ts:12-17` (the only mechanism available) | Decide D1. Recommended: one reserved review phone through the existing test-auth path, hardened per S4, credentials in App Store Connect "Review notes", code rotated per submission, account has no real orders. **[iOS]** only for the review notes/`docs/store/`; no app code needed. |
| S6 | High | **SMS bombing / toll abuse is only loosely capped.** Customer send is 3 per phone per **5 min** (≈864/day to one victim number; the admin flow is 3 per 15 min) and 10 per IP per 15 min (≈960/day per IP). No per-phone hourly/daily cap, no global daily cap, no alert. Counters are in memory: reset on every deploy, per replica (F18). The phone slot is consumed even when the IP check then rejects. Each SMS costs money on a balance shared with 4 other products. | `auth.service.ts:28-37`; `common/rate-limit.service.ts`; `admin.module.ts:55` and `auth.module.ts:11` (two separate counter instances) | Per phone: 1 per 60 s (server-enforced), 5/h, 10/day. Per IP: keep 10/15 min, add 30/day. Global daily ceiling with a log line at 70 % and a hard stop at 100 %. Order checks so a rejection burns nothing. Durable backstop = gateway per-phone/per-project caps (verify deployed, see G1). D4. |
| S2 | Medium | **Mock/unset provider in production does not fail fast.** By design (T12) the API boots, logs one error and every login returns 400 "Не удалось отправить SMS". The owner asked for fail-fast. Railway keeps the previous deployment when the healthcheck fails (`healthcheck "/api"`, `.railway/railway.ts`), so refusing to boot is safe on deploy. | `sms.service.ts:25-32`, `:71-77`, `:83-86` | In production, `onModuleInit` throws when the provider is unset/`mock`/unknown, or when `gateway` lacks `SMS_GATEWAY_URL`/`SMS_GATEWAY_API_KEY`. Keep mock in dev/test only. D2. |
| S7 | Medium | **Resend cooldown is client-side only.** Web and iOS wait 60 s, but a script can call `send-otp` 3 times in a row; the server returns a generic 429 with no `retry_after`, so clients cannot show a real countdown. Web's `setCountdown(60)` also restarts after every send, including a 429-adjacent failure path. | `auth.service.ts:28`; `web/auth/page.tsx:83`; iOS `OTPVerificationView.swift` (`resendCountdown = 60`) | Server cooldown (see S6) returning `retry_after_seconds`; clients use it. |
| S8 | Medium | **A failed send leaves the user worse off.** `generate()` deletes older codes first and stores the new one, then the SMS fails: a still-valid previous code is destroyed, a dead code remains, the failure counts against the 3/5 min cap (provider outage locks users out for 5 min), and the user gets a generic 400, the same as a bad request. | `auth.service.ts:41-48`, `otp.service.ts:32,44` | On send failure delete the just-created row, refund the rate-limit slots, answer 503 `{code:"sms_unavailable"}`; keep the previous code until a send succeeds (create new, send, then delete old). |
| S9 | Medium | **Clients flatten every error.** Web shows "send failed" for 400/429/503 and "invalid code" for any verify error (including 429 lockout); no distinct "too many attempts, wait N s". iOS shows the server's message (Russian text only, regardless of app language RU/UZ/EN) — check `UserFacingError`. | `web/auth/page.tsx:88,137`; `auth.service.ts` messages; iOS `PhoneEntryView.swift:155`, `OTPVerificationView.swift:176` | Stable error codes from the API (`invalid_phone`, `rate_limited` + `retry_after`, `sms_unavailable`, `invalid_code`, `code_expired`); clients map codes to localized strings. **[iOS]** |
| S10 | Medium | **OTP codes stored in clear; expired rows never deleted.** `otps.code` holds the 6 digits; no cleanup job, so phone numbers + codes accumulate (PII, and account deletion does not touch them). | `schema.prisma:74-86`, `otp.service.ts:44` | Store `HMAC-SHA256(code, OTP_PEPPER)` in the existing `code` column (no schema change) and compare hashes in constant time; purge rows older than 1 day on generate or on a timer. Needs new env `OTP_PEPPER`. |
| S11 | Medium | **Customer login and admin reset share one OTP namespace** (F17). A code issued for a staff phone works for both flows; a staff member logging in as a customer deletes a pending reset code. | `otp.service.ts:32,43`; audit F17 | Prefix the stored key with the purpose (`login:+998…`, `admin_reset:+998…`) — no schema change. |
| S12 | Medium | **SMS text is unreviewed for Eskiz and for autofill.** One Uzbek (Latin) text for everyone (`RentEvent: tasdiqlash kodi 123456. Hech kimga aytmang.`), no language choice at login time. Eskiz only delivers pre-approved templates; nothing in the repo shows the approved wording, sender or that the admin-reset text was approved. iOS autofill keyword detection is not guaranteed for "kodi"; the domain-bound format (`@rentevent.uz #123456` on the last line) is what enables iOS and Android WebOTP. | `sms.service.ts:55,63` | Owner confirms the approved templates in Eskiz/gateway first; then one short ASCII text per purpose containing `kod`/`code`, brand `RentEvent`, and the domain-bound last line; single segment. Template change = new Eskiz approval (D5). |
| S13 | Medium | **Web OTP autofill is broken.** `autoComplete="one-time-code"` is on box 0 of six one-character inputs; an autofill/SMS suggestion writes all 6 digits into box 0 and `onChange` keeps only `slice(-1)` (the last digit). Same code in the admin forgot-password page. No WebOTP call. | `web/auth/page.tsx:98`, `:186`; `admin/forgot-password/page.tsx:100` | One real input (`maxLength=6`, `inputMode=numeric`, `autoComplete=one-time-code`) styled as boxes, or distribute multi-digit input across boxes in `onChange`; add `navigator.credentials.get({otp})` after S12. |
| S14 | Medium | **iOS phone field mangles a pasted/autofilled `+998…` number.** `formatPhoneNumber` keeps the first 9 digits of `998901234567` → `998901234` → SMS goes to the wrong number (cost, privacy, user cannot log in). `.textContentType(.telephoneNumber)` makes autofill likely. | `PhoneEntryView.swift:142-148`, `:34` | Strip a leading `998` when more than 9 digits. **[iOS]** |
| S15 | Medium | **Dev OTP viewer is gated, but not structurally impossible in production.** Access depends on `isMockMode()` (= provider `mock` AND `NODE_ENV!=production`), plus `AdminAuthGuard`. In the shipped Dockerfiles `NODE_ENV=production`, so it returns 403 today; but the route is mounted, the in-memory log is kept in any mock run, and one wrong env flips it. The page is also broken (expects `data.success`, API returns `{entries}`) and is listed as a public admin path. | `admin-dev-otp.controller.ts:19-35`, `sms.service.ts:36-52`, `dev-otp/page.tsx` (fetch), `admin/layout.tsx:13` | Mount the controller only when `NODE_ENV` is `development`/`test`; hide the nav entry and make the page 404 in production builds; test that the route does not exist with `NODE_ENV=production`. |
| S16 | Medium | **No delivery tracking, no alerting, no balance view from RentEvent.** The gateway returns a message id; RentEvent drops it (`SMSResult.messageId` unused). Customer-flow sends are not logged at all (success, failure, latency). The owner would learn about an outage from users. | `sms.service.ts:100-104`; `auth.service.ts:43-48`; gateway has `GET /sms/:id/status` and Eskiz webhook | Structured log per send: `sms_send purpose=login|admin_reset provider=… ok=… ms=… msgId=… phone=<masked>`; alert rules in "Observability" below. Delivery status stays in the gateway dashboard (no new table). |
| S17 | Medium | **A second, weaker delivery path exists in RentEvent (`eskiz`).** Direct Eskiz call: JWT token in `ESKIZ_API_TOKEN` (Eskiz tokens expire ≈30 days and need refresh, no refresh code), default sender `4210` (Eskiz's shared default), bypasses the gateway's per-phone/per-project caps, status check `waiting`. | `sms.service.ts:114-136` | Remove the direct Eskiz path; gateway is the only provider besides dev mock (D3). |
| S18 | Medium | **Thin test coverage on the SMS layer.** Covered: OTP attempts, normalization, rate limits, admin reset flow. Not covered: `SmsService` (provider selection, unknown provider, mock in prod, timeout, error mapping), customer send failure path, test-auth path, dev-otp controller gating, web/iOS OTP screens. | `auth/*.spec.ts`, `admin-auth.service.spec.ts`, `common/mask-phone.spec.ts` | Every coder item below lists its tests; add `sms.service.spec.ts`. |
| S19 | Low | **`sms_templates` is a dead feature.** Admin CRUD exists, nothing reads the table; OTP texts are hard-coded, so an admin editing a "template" changes nothing. The admin client uses `PATCH` while the API exposes `PUT` (edit fails); there is no admin page; no body validation or length cap; MANAGER can edit (F9). | `admin-sms-templates.*`, `admin/src/lib/api.ts:162-166`, `schema.prisma:641` | D6: delete the endpoints (keep the table), or wire it up deliberately later with approved-template locking. |
| S20 | Low | **Admin reset: send result is ignored and timing differs.** The API answers "OTP sent" even when the SMS failed (only logged), and the unknown-staff path returns instantly while a real one waits for the SMS call (response-time leak of staff phones). Reset tokens live in memory (lost on deploy, F18). | `admin-auth.service.ts:~207-232`, controller `:79-86` | Send after responding (fire-and-forget with logged result) or pad the response; keep "OTP sent" generic. |
| S21 | Low | **Logging gaps.** Customer OTP flow logs nothing (no send result); provider error strings are logged as-is for admin; mock prints the code in dev (fine). `SMS_SENDER`, `OTP_*` envs undocumented in `.env.example`. | `auth.service.ts`, `.env.example` | Covered by the S16 log line; update `.env.example` and `CLAUDE.md` env list. |
| S22 | Low | **Small OTP nits.** `randomInt(100000, 999999)` never yields `999999`; `check()` records the slot before the IP check (burn, see S6); `RateLimitService` provided twice (two counter stores). | `otp.service.ts:38`, `auth.service.ts:28-37`, `admin.module.ts:55` | Use `randomInt(0, 1_000_000)` zero-padded; fix with S6. |
| S23 | Info | **No SMS notifications exist** (no order status, return, reminder SMS). Not a defect; if the owner expects them at go-live, that is new work (consent text, opt-out, templates, queue, cost), not "production readiness". | grep: only `sendOTP`/`sendAdminOTP` callers | D6. |

Counts: **High 5** (S1, S3, S4, S5, S6) · **Medium 13** (S2, S7–S18) · **Low 4** (S19–S22) · **Info 1** (S23).

## Gateway items (shared `sms-gateway`, read-only here; each is a separate owner-approved task, 5 products depend on it)

Read: `/Users/admin/Projects/komolbek/sms-gateway/CLAUDE.md`, `docs/STATUS.md` (dated 2026-10-29), `src/sms/*`.

- **G1.** STATUS says the hardening (per-phone and per-project caps, webhook secret, throttler) was *"uncommitted, awaiting owner OK"* on 2026-10-29. Confirm it is deployed on Railway "sms api". Until then RentEvent's only durable cap is the in-memory one (S6). Also remove `WEBHOOK_ALLOW_LEGACY` (due 2026-10-31).
- **G2.** Caps are per project, but the Eskiz balance and sender are shared: abuse of one product drains the balance for all five, including RentEvent OTP. Needs a balance/low-balance alert (none documented) and per-project daily ceilings sized per product.
- **G3.** Error shape: on a throttle (429) the body has `message`, not `errorMessage`; RentEvent reads `data.errorMessage` (`sms.service.ts:108`), so it shows a generic error. RentEvent can handle it on its side (map HTTP 429 → `sms_unavailable`/`rate_limited`); no gateway change needed.
- **G4.** Confirm the `rentevent` project exists in the gateway, the Eskiz sender name and the approved OTP template(s) match S12, and whether the gateway rejects non-`998` numbers (RentEvent only sends `+998`, so not blocking).
- **G5.** Gateway has no tests except the URL guard and no failure alerts; delivery failures are visible only in its dashboard.

## Observability: what to alert on

From the S16 log line plus gateway dashboard (all manual at first; no monitoring stack exists):
1. `sms_send ok=false` ratio above 10 % over 15 min, or any 5 consecutive failures → provider/gateway down.
2. Send latency p95 above 5 s (timeout is 8 s).
3. Daily sends above 70 % of the global cap (S6) → pumping or a campaign.
4. 429 count from `send-otp` per hour above a baseline → attack on a phone/IP.
5. Boot log `SMS provider` error (should never appear once S2 is done: the deploy fails instead).
6. Gateway side: Eskiz balance below the 3-day average spend; delivery rate (delivered/sent) below 90 %.
7. Admin side: `forgot-password` sends per day above 5 (staff are few).

## Coder queue (in order)

Same style as the fix plan: one branch each, shippable alone, "done" also means `scripts/check.sh` green. None changes `apps/api/src/payments/**`.
**No schema change in any item** (S10/S11 reuse existing columns). Push/deploy still needs the owner's OK.

### SMS1. Strict provider config, fail fast in production (S1, S2, S17) — High, small
- Files: `apps/api/src/auth/sms.service.ts`, `apps/api/.env.example`, `docker-compose.yml`.
- Do: `parseSmsProvider()` returns `'mock'|'gateway'` (drop `eskiz`, D3); anything else throws. In production `onModuleInit` throws unless provider is `gateway` with `SMS_GATEWAY_URL` and `SMS_GATEWAY_API_KEY` set. Mock logs the code only when `NODE_ENV` is `development`/`test`; otherwise it never logs it.
- Done: `sms.service.spec.ts`: `Gateway`, `eskiz `, `foo` → throws; production + mock/unset/missing key → throws; test env + mock works; mock output never contains the code when `NODE_ENV=production`.

### SMS2. Timeouts, breaker and a clean failure path (S3, S8, S9 API part) — High, medium
- Files: `sms.service.ts`, `auth/auth.service.ts`, `auth/otp.service.ts`, `admin/admin-auth.service.ts`.
- Do: `AbortSignal.timeout(8000)` on the gateway call; map HTTP 429/5xx/timeout/network to one error class; simple breaker (5 consecutive failures → 503 for 30 s). Customer send: create new OTP, send, delete the previous only on success; on failure delete the new row, refund the rate-limit slots, answer 503 `{code:'sms_unavailable'}`. Stable error `code` field on all customer OTP errors (S9).
- Done: tests with a mocked `fetch`: hang → 503 within 8.5 s and previous code still valid; failure does not consume the phone/IP budget; breaker opens and closes.

### SMS3. Abuse caps and server cooldown (S6, S7, S22 part) — High, medium
- Files: `auth/auth.service.ts`, `common/rate-limit.service.ts`, `auth/otp.service.ts` (`randomInt(0,1_000_000)`).
- Do (numbers per D4): per phone 1 per 60 s, 5/h, 10/day; per IP 10/15 min and 30/day; global daily ceiling env `SMS_DAILY_CAP` (default 1000) with warn at 70 %; all keys checked before any is recorded; 429 body carries `retry_after_seconds` and `Retry-After` header; one `RateLimitService` instance shared by both modules.
- Done: tests for each cap, for no-burn on rejection, for three phone spellings sharing the keys; 429 carries the retry value.

### SMS4. Test-auth guard and review account (S4, S5 API part) — High, small. Needs D1 first.
- Files: `auth/otp.service.ts`, `auth/sms.service.ts` or boot check, `.env.example`, `docs/ops/` (new short note).
- Do: boot check per S4 (production: ≤2 test phones, `TEST_OTP_CODE` is 6 digits, never a phone present in `staff`); test phones skip the SMS; one boot warning when active; never applies to the admin reset flow; document the `998…` (no `+`) format.
- Done: tests: test phone gets the fixed code and no SMS; staff phone in the list is ignored for reset; production with `ENABLE_TEST_AUTH=true` and 3 phones fails boot.

### SMS5. Dev OTP viewer cannot exist in production (S15) — Medium, small
- Files: `admin/admin.module.ts`, `admin-dev-otp.controller.ts`, `apps/admin/src/app/admin/dev-otp/page.tsx`, `admin/layout.tsx`.
- Do: register the controller only if `NODE_ENV` is `development` or `test`; page `notFound()` and nav hidden in production builds; fix `data.success` mismatch.
- Done: e2e/unit: with `NODE_ENV=production` `GET /api/admin/dev-otp` is 404 even with `SMS_PROVIDER=mock`.

### SMS6. OTP at rest, purge, purpose namespace (S10, S11) — Medium, small
- Files: `auth/otp.service.ts`, `admin-auth.service.ts` (purpose argument), `.env.example`.
- Do: key `login:<phone>` / `admin_reset:<phone>`; store HMAC of the code (`OTP_PEPPER`, required in production at boot); purge expired/verified rows older than 1 day; legacy plain rows simply expire in 5 min (deploy window: acceptable).
- Done: tests: customer code does not verify for admin reset and the reverse; DB row never equals the plain code; purge removes old rows only.

### SMS7. Web/admin OTP input and error mapping (S13, S9 web part) — Medium, small
- Files: `apps/web/src/app/auth/page.tsx`, `apps/admin/src/app/admin/forgot-password/page.tsx`, i18n keys in `apps/web/src/lib/i18n/`.
- Do: single OTP input or multi-digit distribution; show server `retry_after` countdown; distinct messages for rate limit / SMS unavailable / wrong code / expired; WebOTP after SMS8.
- Done: manual check (no web test setup): iOS Safari and Android Chrome autofill fills all 6 digits; 429 shows the wait time.

### SMS8. Message text and autofill format (S12) — Medium, small. Blocked on owner action D5 (Eskiz/gateway approval).
- Files: `auth/sms.service.ts` (text constants), web auth page (WebOTP).
- Do: only after the owner confirms approved templates; ASCII text, `kod`/`code` keyword, domain-bound last line.
- Done: text matches the approved template byte for byte; a real device test on iPhone and Android shows autofill.

### SMS9. Observability (S16, S21) — Medium, small
- Files: `sms.service.ts`, `auth/auth.service.ts`, `admin-auth.service.ts`, `.env.example`, `CLAUDE.md` env list.
- Do: the structured `sms_send` log line (masked phone, purpose, provider, ok, ms, message id), daily counter log, document new envs.
- Done: unit test on the log formatter; no full phone and no code in any log line.

### SMS10. Admin reset timing and result (S20) — Low, small
- Files: `admin/admin-auth.service.ts`. Do: send after responding or pad to a constant time; log failures. Done: test that unknown and known staff phones return in the same call pattern.

### SMS11. Templates endpoint decision (S19) — Low, small. After D6.
- Files: `admin-sms-templates.*`, `admin.module.ts`, `apps/admin/src/lib/api.ts`. Do: remove the controller/service (keep the table), or fix `PATCH`/`PUT` and add validation. Done: `check.sh` green, no dead route.

### SMS-iOS (separate repo `rentevent-ios`, its own coder session; **[iOS]**)
- iOS1 (S14): strip leading `998` in `PhoneEntryView.swift` `formatPhoneNumber`; unit test for `+998901234567`, `998901234567`, `901234567`.
- iOS2 (S9): map API error `code` to localized strings (RU/UZ/EN) in `UserFacingError` and OTP screens; show countdown from `retry_after_seconds`; clear the code field after a wrong code. Depends on SMS2/SMS3 being deployed (the app must tolerate the old response shape).
- iOS3 (S5): review notes + demo credentials in `docs/store/` (after D1); no app code. Verify build 4/5 works against the API change set before deploy (STATUS already lists T2 compatibility as open).

Order: SMS1 → SMS2 → SMS3 → SMS4 → SMS5 → SMS6 → SMS7 → SMS9 → SMS8 (after approval) → iOS1–iOS3 → SMS10 → SMS11. SMS1–SMS5 are the go-live set.

## Owner decisions (max 6)

- **D1. How does the App Store reviewer sign in?** Recommend: one reserved review number through hardened test-auth (S4) — fixed code, no real SMS, no staff overlap, credentials in the review notes, code changed per submission. Alternative (reviewer notes only) will be rejected.
- **D2. Refuse to boot in production on a bad SMS config?** Recommend yes: Railway keeps the previous deployment when the healthcheck fails, so the site is not taken down, and a typo can never fake "code sent".
- **D3. Delivery path.** Recommend gateway only (remove the direct Eskiz path): one set of caps, one place for sender/template/balance.
- **D4. Caps and budget.** Recommend per phone 60 s / 5 per hour / 10 per day, per IP 10 per 15 min / 30 per day, global 1000 per day (log at 70 %). Tell me expected daily logins and the SMS price to size the global cap.
- **D5. SMS text.** Recommend one short ASCII text per purpose (login, admin reset) with the domain-bound autofill line; the owner confirms or registers it in Eskiz before SMS8. Language can't be chosen at login (no user yet), so no per-language SMS.
- **D6. Templates and other SMS.** Recommend deleting the unused template endpoints and not building order-status SMS for go-live (use e-mail/push later); revisit after launch with consent text and cost in mind.

## Owner env checklist (do not paste values anywhere; only confirm)

**Railway → RentEvent API**
- `NODE_ENV=production` (Dockerfiles set it; confirm not overridden)
- `SMS_PROVIDER=gateway` (exact, lower case, no spaces; **not** `mock`, not empty)
- `SMS_GATEWAY_URL` = gateway base **including `/api/v1`**, no trailing slash (code calls `${url}/sms/send`)
- `SMS_GATEWAY_API_KEY` set, and it is the key of the `rentevent` project in the gateway dashboard
- `ESKIZ_API_TOKEN` and `SMS_SENDER` **unset** (direct path unused)
- `ENABLE_TEST_AUTH` unset or `false`; `TEST_OTP_CODE` empty; `TEST_PHONE_NUMBERS` empty (unless D1: one number, format `998XXXXXXXXX`, not a staff phone)
- `ADMIN_SESSION_SECRET` set and long (SMS reset leads to an admin session); `ENABLE_SWAGGER` not `true`
- `ALLOWED_ORIGINS` and `ADMIN_ORIGIN` as in CLAUDE.md
- After SMS3/SMS6 ship: `SMS_DAILY_CAP`, `OTP_PEPPER` (new)
- Note: `.railway/railway.ts` lists `SMS_PROVIDER`, `SMS_GATEWAY_URL`, `ESKIZ_API_TOKEN`, `ENABLE_TEST_AUTH` but not `SMS_GATEWAY_API_KEY`, `TEST_*`; check them in the Railway UI, not in that file.

**Railway → Web and Admin:** `NEXT_PUBLIC_API_URL=https://api.rentevent.uz/api`; `/admin/dev-otp` must answer 403/404 on `admin.rentevent.uz` (try once while signed in).

**Gateway / Eskiz (owner or gateway PM):** hardening deployed (G1); `WEBHOOK_ALLOW_LEGACY` removed; `rentevent` project has daily caps; Eskiz balance and low-balance alert (G2); sender name and OTP templates approved and equal to the texts in S12; delivery webhook working.

**Smoke test after the first production deploy:** real +998 number → code arrives in under 30 s, autofill works on iPhone and Android; wrong code ×3 → blocked; resend before 60 s → server refuses; admin forgot-password with a real staff phone; check Railway logs contain no code and no full phone number.

## Progress

Local working tree only, nothing committed or pushed. Owner decisions D2 (fail fast), D3 (gateway only), D4 (caps) applied. `.env.example` is at the repo root (there is no `apps/api/.env.example`).

- **SMS1 done (2026-11-16).** `parseSmsProvider()` accepts only `mock`/`gateway` (unset = mock); anything else, incl. `eskiz`, throws. `SmsService.onModuleInit` throws in any env on an unknown value, and in production unless `gateway` + `SMS_GATEWAY_URL` + `SMS_GATEWAY_API_KEY`. Mock prints the code only for `NODE_ENV=development|test`; elsewhere it sends nothing and reports failure. Direct Eskiz path removed. `apps/api` `dev` scripts now set `NODE_ENV=development` so local mock keeps working. Tests: `auth/sms.service.spec.ts` (SMS1 block), `common/mask-phone.spec.ts` updated.
- **SMS2 done.** 8 s abort on the gateway call (AbortController, so it is testable with fake timers); 429/5xx/401/403/timeout/network count as outage failures; breaker opens after 5 in a row for 30 s (one failure after the window re-opens it, a success closes it). `OtpService.issueAndSend`: new row, send, old rows deleted only on success; on failure the new row is deleted and the previous code stays valid. Customer failure = 503 `{code:'sms_unavailable'}`; budget refunded. Stable `code` on customer OTP errors: `invalid_phone`, `invalid_code`, `code_expired`, `rate_limited`, `sms_unavailable` (Russian `message` unchanged). Admin reset applies the same failure path but still answers "OTP sent" (SMS10 untouched). Known gap: while a send is in flight (up to 8 s) the newest, not yet delivered row is the one `verify` reads.
- **SMS3 done.** `SmsQuotaService` (`auth/sms-quota.service.ts`): per phone 1/60 s, 5/h, 10/day; per IP 10/15 min, 30/day; global `SMS_DAILY_CAP` (default 1000, rolling 24 h) with a warn log at 70 %. All keys checked before any is recorded; slots refunded when the send fails. Shared by customer send-otp and admin forgot-password (admin keeps its own 3/15 min per phone and 10/h per IP on top; its verify limits are unchanged). 429 body `{statusCode,message,code:'rate_limited',retry_after_seconds}` plus `Retry-After` header (`RateLimitedFilter` on the auth and admin-auth controllers; also covers verify-otp and the admin 429s). One `RateLimitService` instance: `AuthModule` exports it, `AdminModule` no longer provides its own (`OrdersModule` keeps its own, unrelated). Code is `randomInt(0, 1_000_000)` zero-padded. Tests: SMS2 and SMS3 blocks in `sms.service.spec.ts`; `auth.service.spec.ts` three-spellings test now uses the cooldown.
- **Before deploy (owner):** Railway API must have `NODE_ENV=production`, `SMS_PROVIDER=gateway` exactly, `SMS_GATEWAY_URL` (with `/api/v1`) and `SMS_GATEWAY_API_KEY` set, or the new build fails its healthcheck and Railway keeps the old one. `SMS_DAILY_CAP` optional. `ESKIZ_API_TOKEN`/`SMS_SENDER` can be removed. iOS/web: new 503 and richer 429 shapes are additive (`message` kept).
- **SMS4 done (2026-11-16, D1 as recommended).** `auth/test-auth.ts` parses `ENABLE_TEST_AUTH`/`TEST_PHONE_NUMBERS`/`TEST_OTP_CODE`; `OtpService.onModuleInit` refuses to boot in production on >2 phones, a malformed phone (`998XXXXXXXXX`, normalized with `normalizeUzPhone`), a `TEST_OTP_CODE` that is not 6 digits, or any test phone found in `staff` (either spelling); one boot warning with masked phones, never the code. Test phones skip the SMS and the global daily budget (per-phone/IP caps still apply) and only on customer login (`issueAndSend(..., { allowTestAuth: true })`); admin reset never uses the fixed code. `isTestAuthEnabled()` is used; a bad config at runtime fails closed. Docs: `.env.example`, `CLAUDE.md`, `docs/ops/app-review-account.md` (no real phone or code anywhere). Tests: `auth/test-auth.spec.ts`. Owner: set `TEST_PHONE_NUMBERS`, `TEST_OTP_CODE`, `ENABLE_TEST_AUTH` in Railway only when submitting. iOS3 (review notes) still open.
- **SMS8 done, simplified (2026-11-16).** Eskiz approved exactly one template, so login and admin reset both send it: `Kod dlya vhoda na platforme RentEvent: {CODE}. Nikomu ne soobshchayte etot kod.` One function `buildOtpMessage(code)` in `auth/sms.service.ts`; pinned byte for byte in `sms.service.spec.ts` (SMS8 block). The domain-bound autofill line `@rentevent.uz #123456` is NOT possible with this template, so iOS/Android autofill depends on the platform recognizing the word «Kod»; WebOTP is out. No web/iOS UI hint quotes the SMS wording (checked `apps/web/src/lib/i18n` and the iOS xcstrings, read-only). **Owner follow-up:** if autofill matters, ask Eskiz to approve a second template ending with `@rentevent.uz #{CODE}`.
