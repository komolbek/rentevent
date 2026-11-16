# Hero slides: new columns (H1)

Additive and nullable. Old API code ignores them, so apply to prod **before** pushing `main`
(CLAUDE.md rule 2) and only with the owner's OK. Spec: `docs/spec/hero-slides.md` §1.
Not applied anywhere yet (H1 does not touch any database).

## Before

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://api.rentevent.uz/api/hero-slides
curl -s -o /dev/null -w '%{http_code}\n' 'https://api.rentevent.uz/api/products?limit=1'
```

Both must be 200. Take a backup of the table: `pg_dump -t hero_slides "$PROD_DATABASE_URL" > hero_slides.sql` (keep outside git).

## Apply

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

Index name matches Prisma's default for `@@index([isActive, startsAt, endsAt])`. Check there is no drift:

```bash
cd packages/db && pnpm prisma migrate diff --from-url "$PROD_DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
```

Expected: empty output (or only unrelated pending changes, e.g. the `cards` drop).

## After

Repeat the two `curl` checks (200), then push `main` and check them again.

## Rollback

The app needs no DB change to roll back (old code ignores the columns). Dropping is optional,
only after the old code is live, and loses only the new data:

```sql
ALTER TABLE hero_slides
  DROP COLUMN image_key, DROP COLUMN mobile_image_url, DROP COLUMN mobile_image_key,
  DROP COLUMN focal_x, DROP COLUMN focal_y, DROP COLUMN alt,
  DROP COLUMN starts_at, DROP COLUMN ends_at;
DROP INDEX IF EXISTS hero_slides_is_active_starts_at_ends_at_idx;
```
