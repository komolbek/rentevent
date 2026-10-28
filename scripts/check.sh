#!/usr/bin/env bash
# Install (frozen lockfile), generate Prisma client, lint, test, build. No database needed.
set -euo pipefail
cd "$(dirname "$0")/.."
export DATABASE_URL="${DATABASE_URL:-postgresql://placeholder:placeholder@localhost:5432/placeholder}"
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm test
pnpm build
echo "check: OK"
