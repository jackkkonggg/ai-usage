import { NextResponse, NextRequest } from 'next/server'
import { getStatsCache, daysAgoStr } from '@/lib/parser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const days = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') ?? '30')))
  const sc = getStatsCache()
  const activity = sc?.dailyActivity ?? []

  // Scaffold N days with zeros
  const byDate: Record<string, { messages: number; sessions: number; toolCalls: number }> = {}
  for (let i = 0; i < days; i++) {
    byDate[daysAgoStr(i)] = { messages: 0, sessions: 0, toolCalls: 0 }
  }

  // Merge stats-cache data
  for (const d of activity) {
    if (byDate[d.date]) {
      byDate[d.date].messages = d.messageCount
      byDate[d.date].sessions = d.sessionCount
      byDate[d.date].toolCalls = d.toolCallCount
    }
  }

  return NextResponse.json(
    Object.entries(byDate)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  )
}
