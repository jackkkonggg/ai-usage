import { NextResponse } from 'next/server'
import { getHistory } from '@/lib/parser'
import { queryCodexProjects, getGlmSessionIdsFromDb, getKnownSessionIds } from '@/lib/db'
import { basename } from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  const grouped: Record<string, {
    sessionCount: number; messageCount: number; turnCount: number; lastTs: number
  }> = {}

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
      grouped[proj] = { sessionCount: 0, messageCount: 0, turnCount: 0, lastTs: 0 }
      claudeSessions[proj] = new Set()
    }
    claudeSessions[proj].add(e.sessionId)
    grouped[proj].messageCount++
    if (e.timestamp > grouped[proj].lastTs) grouped[proj].lastTs = e.timestamp
  }

  // Finalize Claude session counts
  for (const [proj, sessions] of Object.entries(claudeSessions)) {
    grouped[proj].sessionCount = sessions.size
  }

  // Codex projects from session_meta
  for (const p of queryCodexProjects()) {
    if (!grouped[p.project]) {
      grouped[p.project] = { sessionCount: 0, messageCount: 0, turnCount: 0, lastTs: 0 }
    }
    grouped[p.project].sessionCount += p.sessionCount
    grouped[p.project].turnCount += p.turnCount
    const ts = new Date(p.lastActive).getTime()
    if (ts > grouped[p.project].lastTs) grouped[p.project].lastTs = ts
  }

  const result = Object.entries(grouped)
    .map(([project, v]) => ({
      project,
      displayName: basename(project) || 'Unknown',
      sessionCount: v.sessionCount,
      messageCount: v.messageCount || v.turnCount,
      lastActive: new Date(v.lastTs).toISOString().slice(0, 10),
    }))
    .sort((a, b) => b.messageCount - a.messageCount)

  return NextResponse.json(result)
}
