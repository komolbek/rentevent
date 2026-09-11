ARG SERVICE=api

# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:20-alpine AS deps
ARG SERVICE
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/${SERVICE}/package.json ./apps/${SERVICE}/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/validators/package.json ./packages/validators/
COPY packages/db/prisma ./packages/db/prisma

RUN if [ "$SERVICE" = "api" ]; then \
      pnpm install --no-frozen-lockfile; \
    else \
      pnpm install --no-frozen-lockfile --ignore-scripts; \
    fi

# ============================================================
# Stage 2: Build
# ============================================================
FROM node:20-alpine AS builder
ARG SERVICE
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate
WORKDIR /app

COPY --from=deps /app ./
COPY apps/${SERVICE}/ ./apps/${SERVICE}/
COPY packages/ ./packages/

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-}
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://p:p@localhost:5432/p"

RUN cd packages/types && npx tsc && \
    cd /app/packages/validators && npx tsc && \
    cd /app/packages/db && npx prisma generate && npx tsc

RUN if [ "$SERVICE" = "api" ]; then \
      cd /app/apps/api && npx nest build; \
    else \
      cd /app/apps/${SERVICE} && npx next build; \
    fi

# ============================================================
# Stage 3a: API runner
# ============================================================
FROM node:20-alpine AS runner-api
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder /app ./
RUN CI=true pnpm prune --prod --no-optional
RUN chown -R appuser:nodejs /app
USER appuser
ENV PORT=4000
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]

# ============================================================
# Stage 3b: Web runner
# ============================================================
FROM node:20-alpine AS runner-web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# Standalone output does not include public/ — without this every file in
# it (manifest, PWA icons, ...) 404s in production.
COPY --from=builder /app/apps/web/public ./apps/web/public
RUN chown -R appuser:nodejs /app
USER appuser
ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

# ============================================================
# Stage 3c: Admin runner
# ============================================================
FROM node:20-alpine AS runner-admin
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
RUN chown -R appuser:nodejs /app
USER appuser
ENV PORT=3001
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]

# ============================================================
# Final: select runner by SERVICE arg
# ============================================================
FROM runner-${SERVICE}
