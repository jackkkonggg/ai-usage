# AI Usage Analytics

Local Next.js dashboard for **Claude Code** + **OpenAI Codex** token usage and cost tracking.

## Setup

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Structure

```
src/
├── app/
│   ├── layout.tsx            # root layout + fonts
│   ├── page.tsx              # entry point
│   ├── dashboard.tsx         # 'use client' dashboard UI
│   ├── globals.css
│   └── api/
│       ├── summary/route.ts  # GET /api/summary
│       ├── daily/route.ts    # GET /api/daily?days=30
│       ├── sessions/route.ts # GET /api/sessions
│       └── models/route.ts   # GET /api/models
└── lib/
    └── parser.ts             # JSONL parsers + pricing engine
```

## Data sources

| Tool         | Path                            |
| ------------ | ------------------------------- |
| Claude Code  | `~/.claude/projects/**/*.jsonl` |
| OpenAI Codex | `~/.codex/sessions/**/*.jsonl`  |

Parsed data is cached in memory for 30 seconds.

## Pricing

Edit the `PRICES` map in `src/lib/parser.ts` to update rates (per million tokens, USD).
