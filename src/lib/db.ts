import Database from 'better-sqlite3'
import { mkdirSync, statSync, unlinkSync } from 'fs'
import { globSync } from 'glob'
import { join } from 'path'
import {
  CLAUDE_DIR,
  CODEX_DIR,
  type Turn,
  parseClaudeFile,
  parseCodexFile,
  daysAgoStr,
} from './parser'

// ─── Database Setup ─────────────────────────────────────────────────────────

const DB_DIR = join(process.cwd(), '.cache')
const DB_PATH = join(DB_DIR, 'usage.db')
const SCHEMA_VERSION = 3

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db

  mkdirSync(DB_DIR, { recursive: true })

  let db = new Database(DB_PATH)

  // Check schema version — if outdated, drop and recreate
  const currentVersion = (db.pragma('user_version', { simple: true }) as number) ?? 0
  if (currentVersion !== SCHEMA_VERSION) {
    db.close()
    try {
      unlinkSync(DB_PATH)
    } catch {
      /* ok */
    }
    try {
      unlinkSync(DB_PATH + '-wal')
    } catch {
      /* ok */
    }
    try {
      unlinkSync(DB_PATH + '-shm')
    } catch {
      /* ok */
    }
    db = new Database(DB_PATH)
  }

  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS tracked_files (
      file_path   TEXT PRIMARY KEY,
      source      TEXT NOT NULL,
      mtime_ms    INTEGER NOT NULL,
      size_bytes  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS turns (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      source             TEXT NOT NULL,
      session_id         TEXT NOT NULL,
      file_path          TEXT NOT NULL,
      date               TEXT NOT NULL,
      timestamp          INTEGER NOT NULL,
      model              TEXT NOT NULL,
      input_tokens       INTEGER NOT NULL,
      output_tokens      INTEGER NOT NULL,
      cache_read_tokens  INTEGER NOT NULL,
      cache_write_tokens INTEGER NOT NULL,
      cost_usd           REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_turns_date ON turns(date);
    CREATE INDEX IF NOT EXISTS idx_turns_session_id ON turns(session_id);
    CREATE INDEX IF NOT EXISTS idx_turns_model ON turns(model);
    CREATE INDEX IF NOT EXISTS idx_turns_file_path ON turns(file_path);

    CREATE TABLE IF NOT EXISTS glm_sessions (
      session_id TEXT PRIMARY KEY,
      file_path  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_meta (
      session_id TEXT PRIMARY KEY,
      source     TEXT NOT NULL,
      project    TEXT
    );

    PRAGMA user_version = ${SCHEMA_VERSION};
  `)

  _db = db
  return _db
}

// ─── Sync Logic ─────────────────────────────────────────────────────────────

let lastSyncTime = 0
let syncing = false
const MIN_SYNC_INTERVAL = 10_000

export function forceSync(): void {
  lastSyncTime = 0
  ensureSync()
}

export function ensureSync(): void {
  const now = Date.now()
  if (now - lastSyncTime < MIN_SYNC_INTERVAL) return
  if (syncing) return
  syncing = true
  try {
    lastSyncTime = now
    syncFiles()
  } finally {
    syncing = false
  }
}

function syncFiles(): void {
  const db = getDb()

  // Gather all JSONL files from both sources
  const claudeFiles: string[] = []
  const codexFiles: string[] = []
  try {
    claudeFiles.push(...globSync(`${CLAUDE_DIR}/**/*.jsonl`, { nodir: true }))
  } catch {
    /* empty */
  }
  try {
    codexFiles.push(...globSync(`${CODEX_DIR}/**/*.jsonl`, { nodir: true }))
  } catch {
    /* empty */
  }

  const allFiles = new Map<string, 'claude' | 'codex'>()
  for (const f of claudeFiles) allFiles.set(f, 'claude')
  for (const f of codexFiles) allFiles.set(f, 'codex')

  // Get existing tracked files
  const tracked = new Map<string, { mtime_ms: number; size_bytes: number }>(
    (
      db.prepare('SELECT file_path, mtime_ms, size_bytes FROM tracked_files').all() as Array<{
        file_path: string
        mtime_ms: number
        size_bytes: number
      }>
    ).map((r) => [r.file_path, { mtime_ms: r.mtime_ms, size_bytes: r.size_bytes }]),
  )

  // Prepare statements
  const deleteTurns = db.prepare('DELETE FROM turns WHERE file_path = ?')
  const deleteTracked = db.prepare('DELETE FROM tracked_files WHERE file_path = ?')
  const deleteGlm = db.prepare('DELETE FROM glm_sessions WHERE file_path = ?')
  const upsertTracked = db.prepare(
    'INSERT OR REPLACE INTO tracked_files (file_path, source, mtime_ms, size_bytes) VALUES (?, ?, ?, ?)',
  )
  const insertTurn = db.prepare(`
    INSERT INTO turns (source, session_id, file_path, date, timestamp, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertGlm = db.prepare(
    'INSERT OR REPLACE INTO glm_sessions (session_id, file_path) VALUES (?, ?)',
  )
  const upsertSessionMeta = db.prepare(
    'INSERT OR REPLACE INTO session_meta (session_id, source, project) VALUES (?, ?, ?)',
  )
  const deleteSessionMeta = db.prepare(
    'DELETE FROM session_meta WHERE session_id IN (SELECT DISTINCT session_id FROM turns WHERE file_path = ?)',
  )

  const transaction = db.transaction(() => {
    // Process new/modified files
    for (const [filePath, source] of allFiles) {
      let st: { mtimeMs: number; size: number }
      try {
        st = statSync(filePath)
      } catch {
        continue
      }

      const existing = tracked.get(filePath)
      if (
        existing &&
        existing.mtime_ms === Math.floor(st.mtimeMs) &&
        existing.size_bytes === st.size
      ) {
        continue // unchanged
      }

      // File is new or modified — remove old data and re-parse
      deleteSessionMeta.run(filePath)
      deleteGlm.run(filePath)
      deleteTurns.run(filePath)

      let turns: Turn[]
      let glmSessionIds: string[]
      let project: string | null = null
      if (source === 'claude') {
        const result = parseClaudeFile(filePath)
        turns = result.turns
        glmSessionIds = result.glmSessionIds
      } else {
        const result = parseCodexFile(filePath)
        turns = result.turns
        glmSessionIds = []
        project = result.project
      }

      for (const t of turns) {
        insertTurn.run(
          t.source,
          t.sessionId,
          filePath,
          t.date,
          t.timestamp,
          t.model,
          t.inputTokens,
          t.outputTokens,
          t.cacheReadTokens,
          t.cacheWriteTokens,
          t.costUsd,
        )
      }

      // Store session → project mapping (Codex only; Claude uses history.jsonl)
      if (project && turns.length > 0) {
        upsertSessionMeta.run(turns[0].sessionId, source, project)
      }

      for (const sid of glmSessionIds) {
        insertGlm.run(sid, filePath)
      }

      upsertTracked.run(filePath, source, Math.floor(st.mtimeMs), st.size)
    }

    // Remove deleted files
    for (const [filePath] of tracked) {
      if (!allFiles.has(filePath)) {
        deleteSessionMeta.run(filePath)
        deleteGlm.run(filePath)
        deleteTurns.run(filePath)
        deleteTracked.run(filePath)
      }
    }
  })

  transaction()
}

// ─── Query Functions ────────────────────────────────────────────────────────

export function querySummary() {
  ensureSync()
  const db = getDb()
  const todayStr = new Date().toISOString().slice(0, 10)
  const weekCutoff = daysAgoStr(7)
  const monthCutoff = daysAgoStr(30)

  const row = db
    .prepare(
      `
    SELECT
      SUM(cost_usd) AS total_cost,
      SUM(CASE WHEN date = ? THEN cost_usd ELSE 0 END) AS today_cost,
      SUM(CASE WHEN date >= ? THEN cost_usd ELSE 0 END) AS week_cost,
      SUM(CASE WHEN date >= ? THEN cost_usd ELSE 0 END) AS month_cost,
      SUM(input_tokens + output_tokens) AS total_tokens,
      SUM(input_tokens) AS total_input,
      SUM(cache_read_tokens) AS total_cache_read,
      SUM(CASE WHEN source = 'claude' THEN 1 ELSE 0 END) AS claude_turns,
      SUM(CASE WHEN source = 'codex' THEN 1 ELSE 0 END) AS codex_turns,
      COUNT(DISTINCT session_id) AS total_sessions
    FROM turns
  `,
    )
    .get(todayStr, weekCutoff, monthCutoff) as {
    total_cost: number | null
    today_cost: number
    week_cost: number
    month_cost: number
    total_tokens: number | null
    total_input: number | null
    total_cache_read: number | null
    claude_turns: number
    codex_turns: number
    total_sessions: number
  }

  const denom = (row.total_input ?? 0) + (row.total_cache_read ?? 0)
  const cacheHitRate = denom > 0 ? ((row.total_cache_read ?? 0) / denom) * 100 : null

  return {
    totalCost: row.total_cost ?? 0,
    todayCost: row.today_cost,
    weekCost: row.week_cost,
    monthCost: row.month_cost,
    totalTokens: row.total_tokens ?? 0,
    claudeTurns: row.claude_turns,
    codexTurns: row.codex_turns,
    totalSessions: row.total_sessions,
    cacheHitRate,
  }
}

export function queryDaily(days: number) {
  ensureSync()
  const db = getDb()
  const cutoff = daysAgoStr(days)

  const rows = db
    .prepare(
      `
    SELECT date, source,
      SUM(cost_usd) AS cost,
      SUM(input_tokens + output_tokens) AS tokens
    FROM turns
    WHERE date >= ?
    GROUP BY date, source
  `,
    )
    .all(cutoff) as Array<{ date: string; source: string; cost: number; tokens: number }>

  // Build scaffold with all dates
  const byDate: Record<
    string,
    { claude: { cost: number; tokens: number }; codex: { cost: number; tokens: number } }
  > = {}
  for (let i = 0; i < days; i++) {
    byDate[daysAgoStr(i)] = { claude: { cost: 0, tokens: 0 }, codex: { cost: 0, tokens: 0 } }
  }

  for (const r of rows) {
    if (!byDate[r.date]) continue
    byDate[r.date][r.source as 'claude' | 'codex'] = { cost: r.cost, tokens: r.tokens }
  }

  return Object.entries(byDate)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function querySessions() {
  ensureSync()
  const db = getDb()

  const rows = db
    .prepare(
      `
    WITH first_models AS (
      SELECT session_id, source, model,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp ASC) AS rn
      FROM turns
    )
    SELECT
      t.session_id,
      fm.source,
      MIN(t.date) AS date,
      MAX(t.timestamp) AS last_timestamp,
      fm.model,
      SUM(t.cost_usd) AS cost,
      SUM(t.input_tokens + t.output_tokens) AS tokens,
      COUNT(*) AS turns
    FROM turns t
    JOIN first_models fm ON fm.session_id = t.session_id AND fm.rn = 1
    GROUP BY t.session_id
    ORDER BY last_timestamp DESC
  `,
    )
    .all() as Array<{
    session_id: string
    source: string
    date: string
    last_timestamp: number
    model: string
    cost: number
    tokens: number
    turns: number
  }>

  return rows.map((r) => ({
    sessionId: r.session_id,
    source: r.source,
    date: r.date,
    lastTimestamp: r.last_timestamp,
    model: r.model,
    cost: r.cost,
    tokens: r.tokens,
    turns: r.turns,
  }))
}

export function queryModels() {
  ensureSync()
  const db = getDb()

  const rows = db
    .prepare(
      `
    SELECT
      model,
      MIN(source) AS source,
      SUM(cost_usd) AS cost,
      SUM(input_tokens + output_tokens) AS tokens,
      COUNT(*) AS turns
    FROM turns
    GROUP BY model
    ORDER BY cost DESC
  `,
    )
    .all() as Array<{
    model: string
    source: string
    cost: number
    tokens: number
    turns: number
  }>

  return rows.map((r) => ({
    model: r.model,
    source: r.source,
    cost: r.cost,
    tokens: r.tokens,
    turns: r.turns,
  }))
}

export function queryCodexProjects() {
  ensureSync()
  const db = getDb()

  // Get project data for Codex sessions from session_meta
  const rows = db
    .prepare(
      `
    SELECT
      sm.project,
      COUNT(DISTINCT sm.session_id) AS session_count,
      COUNT(t.id) AS turn_count,
      MAX(t.timestamp) AS last_ts
    FROM session_meta sm
    JOIN turns t ON t.session_id = sm.session_id
    WHERE sm.project IS NOT NULL
    GROUP BY sm.project
  `,
    )
    .all() as Array<{
    project: string
    session_count: number
    turn_count: number
    last_ts: number
  }>

  return rows.map((r) => ({
    project: r.project,
    sessionCount: r.session_count,
    turnCount: r.turn_count,
    lastActive: new Date(r.last_ts).toISOString().slice(0, 10),
  }))
}

export function getGlmSessionIdsFromDb(): Set<string> {
  ensureSync()
  const db = getDb()
  const rows = db.prepare('SELECT session_id FROM glm_sessions').all() as Array<{
    session_id: string
  }>
  return new Set(rows.map((r) => r.session_id))
}

export function getKnownSessionIds(): Set<string> {
  ensureSync()
  const db = getDb()
  const rows = db.prepare('SELECT DISTINCT session_id FROM turns').all() as Array<{
    session_id: string
  }>
  return new Set(rows.map((r) => r.session_id))
}

export function getAllTurnsFromDb(): Turn[] {
  ensureSync()
  const db = getDb()
  const rows = db
    .prepare(
      `
    SELECT source, session_id, date, timestamp, model,
      input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd
    FROM turns
    ORDER BY timestamp
  `,
    )
    .all() as Array<{
    source: 'claude' | 'codex'
    session_id: string
    date: string
    timestamp: number
    model: string
    input_tokens: number
    output_tokens: number
    cache_read_tokens: number
    cache_write_tokens: number
    cost_usd: number
  }>

  return rows.map((r) => ({
    source: r.source,
    sessionId: r.session_id,
    date: r.date,
    timestamp: r.timestamp,
    model: r.model,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    cacheReadTokens: r.cache_read_tokens,
    cacheWriteTokens: r.cache_write_tokens,
    costUsd: r.cost_usd,
  }))
}
