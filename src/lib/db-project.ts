import { getDb, ensureSync, getGlmSessionIdsFromDb } from '@/lib/db'
import { getHistory } from '@/lib/stats-cache'
import type { ProjectDetail } from '@/lib/types'

function resolveProjectSessionIds(project: string): string[] {
  const db = getDb()
  const glm = getGlmSessionIdsFromDb()

  const sessionIds = new Set<string>()

  // Claude sessions from history.jsonl
  for (const e of getHistory()) {
    if (e.project === project && !glm.has(e.sessionId)) {
      sessionIds.add(e.sessionId)
    }
  }

  // Codex sessions from session_meta
  const metaRows = db
    .prepare('SELECT session_id FROM session_meta WHERE project = ?')
    .all(project) as Array<{ session_id: string }>

  for (const r of metaRows) {
    if (!glm.has(r.session_id)) {
      sessionIds.add(r.session_id)
    }
  }

  return Array.from(sessionIds)
}

export function queryProjectDetail(project: string): ProjectDetail | null {
  ensureSync()
  const db = getDb()

  const sessionIds = resolveProjectSessionIds(project)
  if (sessionIds.length === 0) return null

  const placeholders = sessionIds.map(() => '?').join(',')

  // 1. Summary
  const summaryRow = db
    .prepare(
      `SELECT
        SUM(cost_usd) AS total_cost,
        SUM(input_tokens + output_tokens) AS total_tokens,
        SUM(input_tokens) AS total_input,
        SUM(output_tokens) AS total_output,
        SUM(cache_read_tokens) AS total_cache_read,
        SUM(cache_write_tokens) AS total_cache_write,
        COUNT(*) AS total_turns,
        COUNT(DISTINCT session_id) AS session_count
      FROM turns WHERE session_id IN (${placeholders})`,
    )
    .get(sessionIds) as {
    total_cost: number | null
    total_tokens: number | null
    total_input: number | null
    total_output: number | null
    total_cache_read: number | null
    total_cache_write: number | null
    total_turns: number
    session_count: number
  }

  if (!summaryRow || summaryRow.total_turns === 0) return null

  const inputDenom = (summaryRow.total_input ?? 0) + (summaryRow.total_cache_read ?? 0)
  const cacheHitRate = inputDenom > 0 ? ((summaryRow.total_cache_read ?? 0) / inputDenom) * 100 : null

  const summary = {
    totalCost: summaryRow.total_cost ?? 0,
    totalTokens: summaryRow.total_tokens ?? 0,
    totalTurns: summaryRow.total_turns,
    sessionCount: summaryRow.session_count,
    cacheHitRate,
    inputTokens: summaryRow.total_input ?? 0,
    outputTokens: summaryRow.total_output ?? 0,
    cacheReadTokens: summaryRow.total_cache_read ?? 0,
    cacheWriteTokens: summaryRow.total_cache_write ?? 0,
  }

  // 2. Models
  const modelRows = db
    .prepare(
      `SELECT model, MIN(source) AS source,
        SUM(cost_usd) AS cost,
        SUM(input_tokens + output_tokens) AS tokens,
        COUNT(*) AS turns
      FROM turns WHERE session_id IN (${placeholders})
      GROUP BY model ORDER BY cost DESC`,
    )
    .all(sessionIds) as Array<{
    model: string
    source: string
    cost: number
    tokens: number
    turns: number
  }>

  // 3. Sessions (CTE scoped to project sessions for performance)
  const sessionRows = db
    .prepare(
      `WITH first_models AS (
        SELECT session_id, source, model,
          ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp ASC) AS rn
        FROM turns
        WHERE session_id IN (${placeholders})
      )
      SELECT
        t.session_id,
        fm.source,
        MIN(t.date) AS date,
        MAX(t.timestamp) AS last_timestamp,
        fm.model,
        SUM(t.cost_usd) AS cost,
        SUM(t.input_tokens + t.output_tokens) AS tokens,
        COUNT(*) AS turns,
        sm.description
      FROM turns t
      JOIN first_models fm ON fm.session_id = t.session_id AND fm.rn = 1
      LEFT JOIN session_meta sm ON sm.session_id = t.session_id
      WHERE t.session_id IN (${placeholders})
      GROUP BY t.session_id
      ORDER BY last_timestamp DESC`,
    )
    .all([...sessionIds, ...sessionIds]) as Array<{
    session_id: string
    source: string
    date: string
    last_timestamp: number
    model: string
    cost: number
    tokens: number
    turns: number
    description: string | null
  }>

  // 4. Daily cost by source
  const dailyRows = db
    .prepare(
      `SELECT date, source, SUM(cost_usd) AS cost
      FROM turns WHERE session_id IN (${placeholders})
      GROUP BY date, source
      ORDER BY date`,
    )
    .all(sessionIds) as Array<{ date: string; source: string; cost: number }>

  const dailyMap: Record<string, { claude: number; codex: number }> = {}
  for (const r of dailyRows) {
    if (!dailyMap[r.date]) dailyMap[r.date] = { claude: 0, codex: 0 }
    const key = r.source === 'claude' || r.source === 'codex' ? r.source : null
    if (key) dailyMap[r.date][key] += r.cost
  }
  const daily = Object.entries(dailyMap)
    .map(([date, v]) => ({ date, claude: v.claude, codex: v.codex }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 5. Source split
  const sourceRows = db
    .prepare(
      `SELECT source,
        SUM(cost_usd) AS cost,
        SUM(input_tokens + output_tokens) AS tokens,
        COUNT(*) AS turns
      FROM turns WHERE session_id IN (${placeholders})
      GROUP BY source`,
    )
    .all(sessionIds) as Array<{ source: string; cost: number; tokens: number; turns: number }>

  const displayName = project.split('/').pop() || 'Unknown'

  return {
    project,
    displayName,
    summary,
    models: modelRows.map((r) => ({
      model: r.model,
      source: r.source,
      cost: r.cost,
      tokens: r.tokens,
      turns: r.turns,
    })),
    sessions: sessionRows.map((r) => ({
      sessionId: r.session_id,
      source: r.source as 'claude' | 'codex',
      date: r.date,
      lastTimestamp: r.last_timestamp,
      model: r.model,
      cost: r.cost,
      tokens: r.tokens,
      turns: r.turns,
      description: r.description ? r.description.slice(0, 120) : null,
    })),
    daily,
    sources: sourceRows.map((r) => ({
      source: r.source,
      cost: r.cost,
      tokens: r.tokens,
      turns: r.turns,
    })),
  }
}
