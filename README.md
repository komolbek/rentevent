# RentEvent

Event-equipment rental platform: storefront (rentevent.uz), admin panel (admin.rentevent.uz)
and API (api.rentevent.uz/api).

pnpm + Turborepo monorepo:

- `apps/web` — storefront (Next.js)
- `apps/admin` — admin panel (Next.js)
- `apps/api` — API (NestJS)
- `packages/db` — Prisma schema and client; `packages/types`, `packages/validators` — shared code

## Run

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm dev            # or dev:api, dev:web, dev:admin
scripts/check.sh    # install, generate, lint, test, build
```

## Deploy

Railway project "RentEvent" (Web, Admin, API, Postgres). Every push to `main` deploys the
affected services from the root `Dockerfile`. See `CLAUDE.md` and `docs/STATUS.md`.
