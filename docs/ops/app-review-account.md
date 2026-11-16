# App Review account (test-auth)

Customer login is SMS OTP only, so the App Store reviewer gets one reserved phone that logs in with a
fixed code and no SMS (guideline 2.1). It is the existing test-auth path, hardened (SMS4).

## Rules
- The phone and the code are chosen by the owner and set only in Railway. They are NEVER written into
  the repo, docs, commits, tickets or logs. This note uses placeholders only.
- Customer login only. It never applies to admin forgot-password/reset, and the API refuses to boot if
  a test phone belongs to a staff account.
- Production allows at most 2 test phones, format `998XXXXXXXXX` (no `+`), and a 6-digit code.
  Anything else makes the new deploy fail its healthcheck; Railway keeps the previous deployment.
- The usual per-phone and per-IP attempt caps still apply to the review phone.
- While active, the API logs one boot warning (masked phone, no code).

## Turn on (Railway → RentEvent API → Variables)
1. `TEST_PHONE_NUMBERS` = the review phone, `998XXXXXXXXX`. Pick a number that is not a staff phone.
2. `TEST_OTP_CODE` = a fresh 6-digit code.
3. `ENABLE_TEST_AUTH` = `true` (set it last). Redeploy and check the boot log shows "TEST AUTH IS ACTIVE".
4. Check once: sign in in the app with the phone and code; no SMS arrives.

## App Store Connect → App Review Information → Notes
> The app signs in by SMS code. For review please use the demo account:
> Phone: `<REVIEW_PHONE>` (enter as +`<REVIEW_PHONE>`)
> Code: `<REVIEW_CODE>`
> No SMS is sent for this number; enter the code directly.

Fill the placeholders only inside App Store Connect.

## Rotate
After every App Review submission (approved or rejected) set a new `TEST_OTP_CODE` in Railway before the
next one, and update the notes in App Store Connect.

## Turn off after approval
Set `ENABLE_TEST_AUTH` = `false` (or delete it), clear `TEST_PHONE_NUMBERS` and `TEST_OTP_CODE`, redeploy,
and confirm the boot warning is gone. Turn it on again only for the next review.
