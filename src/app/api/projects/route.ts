import { NextResponse, NextRequest } from 'next/server'
import { getHistory } from '@/lib/stats-cache'
import {
  queryCodexProjects,
  queryProjectCosts,
  getGlmSessionIdsFromDb,
  getKnownSessionIds,
  forceSync,
} from '@/lib/db'
import { localDateStr } from '@/lib/format'
import { basename } from 'path'

export const dynamic = 'force-dynamic'

interface ProjectGroup {
  sessionCount: number
  cost: number
  lastTs: number
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('force') === 'true') forceSync()
  const grouped: Record<string, ProjectGroup> = {}

  // Claude projects from history.jsonl
  const entries = getHistory()
  const glm = getGlmSessionIdsFromDb()
  const knownSessions = getKnownSessionIds()
  const claudeSessions: Record<string, Set<string>> = {}

  for (const e of entries) {
    if (glm.has(e.sessionId)) continue
    if (!knownSessions.has(e.sessionId)) continue
    const proj = e.project || 'unknown'
    if (!grouped[proj]) {
      grouped[proj] = { sessionCount: 0, cost: 0, lastTs: 0 }
      claudeSessions[proj] = new Set()
    }
    claudeSessions[proj].add(e.sessionId)
    if (e.timestamp > grouped[proj].lastTs) grouped[proj].lastTs = e.timestamp
  }

  // Finalize Claude session counts and costs
  const costMap = queryProjectCosts(claudeSessions)
  for (const [proj, sessions] of Object.entries(claudeSessions)) {
    grouped[proj].sessionCount = sessions.size
    grouped[proj].cost = costMap.get(proj) ?? 0
  }

  // Codex projects from session_meta
  for (const p of queryCodexProjects()) {
    if (!grouped[p.project]) {
      grouped[p.project] = { sessionCount: 0, cost: 0, lastTs: 0 }
    }
    grouped[p.project].sessionCount += p.sessionCount
    grouped[p.project].cost += p.cost
    const ts = new Date(p.lastActive).getTime()
    if (ts > grouped[p.project].lastTs) grouped[p.project].lastTs = ts
  }

  const result = Object.entries(grouped)
    .map(([project, v]) => ({
      project,
      displayName: basename(project) || 'Unknown',
      sessionCount: v.sessionCount,
      cost: v.cost,
      lastActive: localDateStr(v.lastTs),
    }))
    .sort((a, b) => b.cost - a.cost)

  return NextResponse.json(result)
}
