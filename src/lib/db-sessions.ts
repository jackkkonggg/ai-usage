import { getDb, ensureSync } from '@/lib/db'

export interface TurnDetail {
  sessionId: string
  filePath: string
  source: 'claude' | 'codex'
  timestamp: number
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
}

export interface SessionQueryResult {
  filePath: string | null
  project: string | null
  turns: TurnDetail[]
}

export function querySessionDetail(sessionId: string): SessionQueryResult | null {
  ensureSync()
  const db = getDb()

  const rows = db
    .prepare(
      `SELECT t.session_id, t.file_path, t.source, t.timestamp, t.model,
        t.input_tokens, t.output_tokens, t.cache_read_tokens, t.cache_write_tokens, t.cost_usd,
        sm.project
      FROM turns t
      LEFT JOIN session_meta sm ON sm.session_id = t.session_id
      WHERE t.session_id = ?
      ORDER BY t.timestamp ASC`,
    )
    .all(sessionId) as Array<{
    session_id: string
    file_path: string
    source: string
    timestamp: number
    model: string
    input_tokens: number
    output_tokens: number
    cache_read_tokens: number
    cache_write_tokens: number
    cost_usd: number
    project: string | null
  }>

  if (rows.length === 0) return null

  return {
    filePath: rows[0].file_path,
    project: rows[0].project,
    turns: rows.map((r) => ({
      sessionId: r.session_id,
      filePath: r.file_path,
      source: r.source as 'claude' | 'codex',
      timestamp: r.timestamp,
      model: r.model,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      cacheReadTokens: r.cache_read_tokens,
      cacheWriteTokens: r.cache_write_tokens,
      costUsd: r.cost_usd,
    })),
  }
}
