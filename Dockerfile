# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Stage 2: builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# Stage 3: runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4005

# better-sqlite3 requires python/make/g++ at runtime only for native rebuild;
# the binary compiled in builder stage is copied directly so no build tools needed.
# sqlite3 needs libstdc++ on alpine.
RUN apk add --no-cache libc6-compat

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /app nextjs && \
    mkdir -p /app/.claude/projects /app/.codex/sessions && \
    chown -R nextjs:nodejs /app

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy the native better-sqlite3 binding compiled for this platform
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# .cache dir for SQLite DB (read-write, owned by nextjs user)
RUN mkdir -p /app/.cache && chown nextjs:nodejs /app/.cache

USER nextjs

EXPOSE 4005

CMD ["node", "server.js"]
