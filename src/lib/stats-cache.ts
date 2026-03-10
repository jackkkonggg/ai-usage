import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

// ─── Paths ───────────────────────────────────────────────────────────────────

export const STATS_CACHE_PATH = join(homedir(), '.claude', 'stats-cache.json')
export const HISTORY_PATH = join(homedir(), '.claude', 'history.jsonl')

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StatsCache {
  dailyActivity: Array<{
    date: string
    messageCount: number
    sessionCount: number
    toolCallCount: number
  }>
  modelUsage: Record<
    string,
    {
      inputTokens: number
      outputTokens: number
      cacheReadInputTokens: number
      cacheCreationInputTokens: number
      costUSD: number
    }
  >
  totalMessages: number
  longestSession: { sessionId: string; duration: number; messageCount: number; timestamp: string }
  firstSessionDate: string
  hourCounts: Record<string, number>
  totalSpeculationTimeSavedMs: number
}

export interface HistoryEntry {
  display: string
  pastedContents: Record<string, unknown>
  timestamp: number
  project: string
  sessionId: string
}

// ─── Cache ───────────────────────────────────────────────────────────────────

let statsCacheData: StatsCache | null = null
let statsCacheTime = 0
const TTL = 30_000

export function clearStatsCache(): void {
  statsCacheTime = 0
}

export function getStatsCache(): StatsCache | null {
  const now = Date.now()
  if (statsCacheData && now - statsCacheTime < TTL) return statsCacheData
  if (!existsSync(STATS_CACHE_PATH)) return null
  try {
    statsCacheData = JSON.parse(readFileSync(STATS_CACHE_PATH, 'utf-8')) as StatsCache
    statsCacheTime = now
    return statsCacheData
  } catch {
    return null
  }
}

// ─── History ─────────────────────────────────────────────────────────────────

export function getHistory(): HistoryEntry[] {
  if (!existsSync(HISTORY_PATH)) return []
  try {
    return readFileSync(HISTORY_PATH, 'utf-8')
      .split('\n')
      .filter((l: string) => l.trim())
      .map((l: string) => JSON.parse(l) as HistoryEntry)
  } catch {
    return []
  }
}
