import Database from 'better-sqlite3'

const SCHEMA_VERSION = 7

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
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
      session_id  TEXT PRIMARY KEY,
      source      TEXT NOT NULL,
      project     TEXT
    );
    PRAGMA user_version = ${SCHEMA_VERSION};
  `)
  return db
}

interface TurnSeed {
  source?: string
  sessionId?: string
  filePath?: string
  date: string
  timestamp: number
  model?: string
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  costUsd?: number
}

export function seedTurns(db: Database.Database, entries: TurnSeed[]) {
  const stmt = db.prepare(`
    INSERT INTO turns (source, session_id, file_path, date, timestamp, model,
      input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const e of entries) {
    stmt.run(
      e.source ?? 'claude',
      e.sessionId ?? 'sess-1',
      e.filePath ?? '/tmp/test.jsonl',
      e.date,
      e.timestamp,
      e.model ?? 'claude-sonnet-4',
      e.inputTokens ?? 1000,
      e.outputTokens ?? 500,
      e.cacheReadTokens ?? 200,
      e.cacheWriteTokens ?? 50,
      e.costUsd ?? 0.01,
    )
  }
}

export function seedSessionMeta(
  db: Database.Database,
  entries: Array<{ sessionId: string; source: string; project?: string }>,
) {
  const stmt = db.prepare('INSERT INTO session_meta (session_id, source, project) VALUES (?, ?, ?)')
  for (const e of entries) {
    stmt.run(e.sessionId, e.source, e.project ?? null)
  }
}
