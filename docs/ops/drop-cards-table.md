# Drop the `cards` table on prod (owner OK required)

Status: **not applied**. Code on branch `claude/ios-backend-tasks-657569` no longer has the
`Card` model or `/user/cards`. Prod still has the `cards` table until the steps below run.

## What is in it
`cards` held `card_number`, `card_holder`, `expiry_month`, `expiry_year`, `card_type` per user.
Every version of the add-card code in git history (`RaadArenda/.../cards.ts`, then
`apps/api/src/users/users.service.ts`) stored only a masked number (`**** **** **** 1234`), so
full PANs are not expected. Cardholder name, last 4 digits and expiry are still personal data
nobody needs: payment happens on the provider's page.

## Order of work
This is the reverse of CLAUDE.md rule 2, on purpose: rule 2 is about columns new code needs.
Here new code needs nothing, and old code still reads `cards` (the deployed web profile page
calls `GET /user/cards`). So:

1. Merge and deploy this branch (owner OK). The API runs fine with the `cards` table still there.
2. Check `https://api.rentevent.uz/api/products?limit=1` → 200 and
   `https://api.rentevent.uz/api/user/cards` → 404 (route gone).
3. Then drop the table (steps below). Until then, any `prisma db push` from `packages/db` will
   stop and ask to drop `cards`: that prompt is this step, do not accept it by accident during
   unrelated work.

## Prod steps (owner runs, or OKs in chat first)
From `packages/db`, with `DATABASE_URL` set to the Railway Postgres public URL:

```bash
# 1. Look before deleting: counts only, no card data printed.
psql "$DATABASE_URL" -c "select count(*) as rows, count(*) filter (where card_number ~ '^[0-9 ]{13,23}$') as unmasked from cards;"
```
If `unmasked` is not 0, stop and tell the owner: that means full PANs were stored and it is a
reportable incident to discuss before deleting (no export of those rows).

```bash
# 2. Apply the schema (drops "cards"; Prisma asks for confirmation of data loss).
pnpm prisma db push --accept-data-loss

# 3. Verify.
psql "$DATABASE_URL" -c "select to_regclass('public.cards');"   # expect: null (empty)
curl -s -o /dev/null -w '%{http_code}\n' 'https://api.rentevent.uz/api/products?limit=1'  # 200
```

No backup of `cards` is taken on purpose: the goal is that the data stops existing. Railway's
own Postgres backups will age out on their normal schedule.

## Rollback
None needed for the data. To bring the endpoints back, revert the commit and re-run
`prisma db push` (the table is recreated empty).
