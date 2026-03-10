import { NextResponse, NextRequest } from 'next/server'
import { ClaudeParser } from '@/lib/parsers/claude-parser'
import { CodexParser } from '@/lib/parsers/codex-parser'
import { getStatsCache, clearStatsCache } from '@/lib/stats-cache'

const CLAUDE_DIR = new ClaudeParser().sessionDir
const CODEX_DIR = new CodexParser().sessionDir
import { querySummary, forceSync } from '@/lib/db'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('force') === 'true') {
    forceSync()
    clearStatsCache()
  }
  const summary = querySummary()
  const sc = getStatsCache()

  return NextResponse.json({
    totalCost: summary.totalCost,
    todayCost: summary.todayCost,
    weekCost: summary.weekCost,
    monthCost: summary.monthCost,
    totalTokens: summary.totalTokens,
    claudeTurns: summary.claudeTurns,
    codexTurns: summary.codexTurns,
    totalSessions: summary.totalSessions,
    claudeFound: existsSync(CLAUDE_DIR),
    codexFound: existsSync(CODEX_DIR),
    totalMessages: sc?.totalMessages ?? null,
    timeSavedMs: sc?.totalSpeculationTimeSavedMs ?? 0,
    firstSessionDate: sc?.firstSessionDate?.slice(0, 10) ?? null,
    cacheHitRate: summary.cacheHitRate,
  })
}
