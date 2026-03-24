import { NextResponse, NextRequest } from 'next/server'
import { queryDayDetail, forceSync } from '@/lib/db'
import { clearStatsCache } from '@/lib/stats-cache'
import { getRateLimits } from '@/lib/oauth-usage'
import { localDateStr } from '@/lib/format'
import type { Snapshot } from '@/lib/types'

export const dynamic = 'force-dynamic'

let lastForceTime = 0
const FORCE_COOLDOWN_MS = 30_000

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('force') === 'true') {
    const now = Date.now()
    if (now - lastForceTime >= FORCE_COOLDOWN_MS) {
      lastForceTime = now
      forceSync()
      clearStatsCache()
    }
  }

  const today = localDateStr()
  const detail = queryDayDetail(today)

  const snapshot: Snapshot = {
    date: today,
    cost: detail.summary.totalCost,
    tokens: detail.summary.totalTokens,
    sessions: detail.summary.sessionCount,
    turns: detail.summary.totalTurns,
    cacheHitRate: detail.summary.cacheHitRate,
    inputTokens: detail.summary.inputTokens,
    outputTokens: detail.summary.outputTokens,
    cacheReadTokens: detail.summary.cacheReadTokens,
    cacheWriteTokens: detail.summary.cacheWriteTokens,
    models: detail.models,
    sources: detail.sources,
    hourly: detail.hourly,
    rateLimits: await getRateLimits(),
  }

  return NextResponse.json(snapshot)
}
