export interface Turn {
  source: 'claude' | 'codex'
  sessionId: string
  date: string // YYYY-MM-DD
  timestamp: number // unix ms
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
}

export interface ParseResult {
  turns: Turn[]
  description: string | null
  project: string | null
}

export abstract class SessionParser {
  abstract readonly source: 'claude' | 'codex'
  abstract readonly sessionDir: string
  abstract parseFile(filePath: string): ParseResult
}
