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
  project: string | null
}

export abstract class SessionParser {
  abstract readonly source: 'claude' | 'codex'
  abstract readonly sessionDirs: string[]
  abstract parseFile(filePath: string): ParseResult
}
