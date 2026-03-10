import { NextResponse } from 'next/server'
import { CLAUDE_DIR, CODEX_DIR, getStatsCache } from '@/lib/parser'
import { querySummary } from '@/lib/db'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const summary = querySummary()
  const sc = getStatsCache()

  return NextResponse.json({
    totalCost:     summary.totalCost,
    todayCost:     summary.todayCost,
    weekCost:      summary.weekCost,
    monthCost:     summary.monthCost,
    totalTokens:   summary.totalTokens,
    claudeTurns:   summary.claudeTurns,
    codexTurns:    summary.codexTurns,
    totalSessions: summary.totalSessions,
    claudeFound:   existsSync(CLAUDE_DIR),
    codexFound:    existsSync(CODEX_DIR),
    totalMessages:    sc?.totalMessages ?? null,
    timeSavedMs:      sc?.totalSpeculationTimeSavedMs ?? 0,
    firstSessionDate: sc?.firstSessionDate?.slice(0, 10) ?? null,
    cacheHitRate:     summary.cacheHitRate,
  })
}
