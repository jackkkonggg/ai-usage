# AI Usage Analytics

Local Next.js dashboard for **Claude Code** + **OpenAI Codex** token usage and cost tracking.

## Setup

```bash
pnpm install
pnpm dev
# → http://localhost:3005
```

## Tech stack

- Next.js 16 (App Router) · React 19 · TypeScript 5.9
- Tailwind CSS 4 · Recharts
- SQLite via `better-sqlite3` (persistent cache at `.cache/usage.db`)

## Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard.tsx          # 'use client' main dashboard
│   ├── dashboard-charts.tsx   # chart panels
│   ├── dashboard-panels.tsx   # stat card panels
│   ├── dashboard-sessions.tsx # recent sessions panel
│   ├── globals.css
│   ├── icon.svg
│   ├── day/[date]/
│   │   ├── page.tsx
│   │   ├── day-detail.tsx     # day detail page shell
│   │   ├── day-charts.tsx     # per-day charts
│   │   └── day-sessions.tsx   # per-day session list
│   └── api/
│       ├── summary/route.ts   # GET /api/summary
│       ├── daily/route.ts     # GET /api/daily?days=N
│       ├── sessions/route.ts  # GET /api/sessions
│       ├── models/route.ts    # GET /api/models
│       ├── activity/route.ts  # GET /api/activity?days=N
│       ├── hourly/route.ts    # GET /api/hourly
│       ├── projects/route.ts  # GET /api/projects
│       └── day/[date]/route.ts # GET /api/day/YYYY-MM-DD
├── components/
│   ├── stat-card.tsx
│   ├── source-badge.tsx
│   ├── chart-tooltip.tsx
│   ├── loader.tsx
│   └── ui/tooltip.tsx
└── lib/
    ├── parsers/
    │   ├── claude-parser.ts   # Claude Code JSONL parser
    │   ├── codex-parser.ts    # OpenAI Codex JSONL parser
    │   ├── pricing.ts         # pricing engine (PRICES map)
    │   └── session-parser.ts  # shared session parsing
    ├── db.ts                  # SQLite sync + query helpers
    ├── stats-cache.ts         # in-memory stats cache
    ├── types.ts
    ├── format.ts
    └── design-tokens.ts
```

## Data sources

| Tool         | Path                            |
| ------------ | ------------------------------- |
| Claude Code  | `~/.claude/projects/**/*.jsonl` |
| OpenAI Codex | `~/.codex/sessions/**/*.jsonl`  |

On first load, all JSONL files are parsed and written into `.cache/usage.db`. Subsequent requests hit SQLite directly; an in-memory stats cache is invalidated every 30 seconds.

## Pricing

Edit the `PRICES` map in `src/lib/parsers/pricing.ts` to update rates (per million tokens, USD). Unknown models fall back to `claude-sonnet-4` pricing.

## Cache

The SQLite database at `.cache/usage.db` is gitignored. Delete it to force a full re-parse. Append `?force=true` to any API request to clear the in-memory cache immediately.
