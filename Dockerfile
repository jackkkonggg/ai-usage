# Stage 1: deps
FROM node:24.14.0-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@10.30.3

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Stage 2: builder
FROM node:24.14.0-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10.30.3

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# Flatten pnpm-hoisted native deps into a predictable location for the runner stage
RUN node -e " \
  const fs = require('fs'); \
  const path = require('path'); \
  const Module = require('module'); \
  fs.mkdirSync('/native-modules', { recursive: true }); \
  const bs3Dir = path.dirname(require.resolve('better-sqlite3/package.json')); \
  fs.cpSync(bs3Dir, '/native-modules/better-sqlite3', { recursive: true }); \
  const req = Module.createRequire(path.join(bs3Dir, 'package.json')); \
  const bindingsDir = path.dirname(req.resolve('bindings/package.json')); \
  fs.cpSync(bindingsDir, '/native-modules/bindings', { recursive: true }); \
  const furiDir = path.dirname(req.resolve('file-uri-to-path/package.json')); \
  fs.cpSync(furiDir, '/native-modules/file-uri-to-path', { recursive: true }); \
"

# Stage 3: runner
FROM node:24.14.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4005

# better-sqlite3 is a C++ native module; it needs libstdc++ and glibc compat at runtime.
RUN apk add --no-cache libc6-compat libstdc++

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /app nextjs && \
    mkdir -p /app/.claude/projects /app/.codex/sessions && \
    chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy the native better-sqlite3 binding compiled for this platform
COPY --from=builder --chown=nextjs:nodejs /native-modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /native-modules/bindings ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /native-modules/file-uri-to-path ./node_modules/file-uri-to-path

# .cache dir for SQLite DB (read-write, owned by nextjs user)
RUN mkdir -p /app/.cache && chown nextjs:nodejs /app/.cache

USER nextjs

EXPOSE 4005

CMD ["node", "server.js"]
