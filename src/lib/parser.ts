import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join, basename } from 'path'

// ─── Paths ────────────────────────────────────────────────────────────────────

export const CLAUDE_DIR = join(homedir(), '.claude', 'projects')
export const CODEX_DIR = join(homedir(), '.codex', 'sessions')

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Pricing (per million tokens, USD) ───────────────────────────────────────

const PRICES: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite: number }
> = {
  'claude-opus-4-6': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4-5': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4-1': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-opus-4': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4-5': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  'claude-haiku-3-5': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  // OpenAI prices with 2x priority/fast mode multiplier
  'gpt-5': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5-codex': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5-chat': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5.1': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5.1-codex': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5.3': { input: 3.5, output: 28, cacheRead: 0.35, cacheWrite: 0 },
  'gpt-5.3-codex': { input: 3.5, output: 28, cacheRead: 0.35, cacheWrite: 0 },
  'gpt-5.4': { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 0 },
  'gpt-4o': { input: 5, output: 20, cacheRead: 2.5, cacheWrite: 0 },
  'gpt-4o-mini': { input: 0.3, output: 1.2, cacheRead: 0.15, cacheWrite: 0 },
}

function getPrice(model: string) {
  if (PRICES[model]) return PRICES[model]
  const stripped = model.replace(/-\d{8}.*$/, '')
  const key = Object.keys(PRICES).find((k) => stripped.startsWith(k) || k.startsWith(stripped))
  return key ? PRICES[key] : PRICES['claude-sonnet-4']
}

export function calcCost(
  model: string,
  input: number,
  output: number,
  cacheRead: number,
  cacheWrite: number,
) {
  const p = getPrice(model)
  return (
    (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheWrite * p.cacheWrite) /
    1_000_000
  )
}

// ─── Single-file Parsers ─────────────────────────────────────────────────────

export function parseClaudeFile(filePath: string): { turns: Turn[]; glmSessionIds: string[] } {
  const turns: Turn[] = []
  const glmSessionIds: string[] = []
  const sessionId = basename(filePath, '.jsonl')
  let content = ''
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return { turns, glmSessionIds }
  }

  for (const line of content.split('\n')) {
    if (!line.trim()) continue
    try {
      const obj = JSON.parse(line)
      if (obj.type !== 'assistant') continue
      const usage = obj.message?.usage
      if (!usage) continue
      const model: string = obj.message?.model ?? 'unknown'
      if (model.startsWith('glm')) {
        glmSessionIds.push(sessionId)
        continue
      }
      const ts: number = obj.timestamp ? new Date(obj.timestamp).getTime() : Date.now()
      const input: number = usage.input_tokens ?? 0
      const output: number = usage.output_tokens ?? 0
      const cacheRead: number = usage.cache_read_input_tokens ?? 0
      const cacheWrite: number = usage.cache_creation_input_tokens ?? 0
      if (input === 0 && output === 0) continue
      turns.push({
        source: 'claude',
        sessionId,
        date: new Date(ts).toISOString().slice(0, 10),
        timestamp: ts,
        model,
        inputTokens: input,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: cacheWrite,
        costUsd: calcCost(model, input, output, cacheRead, cacheWrite),
      })
    } catch {
      /* skip */
    }
  }
  return { turns, glmSessionIds }
}

export function parseCodexFile(filePath: string): { turns: Turn[]; project: string | null } {
  const turns: Turn[] = []
  const sessionId = basename(filePath, '.jsonl')
  let project: string | null = null
  let content = ''
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return { turns, project }
  }

  let prevInput = 0,
    prevOutput = 0,
    prevCached = 0
  let currentModel = 'gpt-5-codex'

  for (const line of content.split('\n')) {
    if (!line.trim()) continue
    try {
      const obj = JSON.parse(line)
      // Extract project from session_meta
      if (obj.type === 'session_meta' && obj.payload?.cwd) {
        project = obj.payload.cwd as string
      }
      // Model comes from turn_context events
      if (obj.type === 'turn_context' && obj.payload?.model) {
        currentModel = obj.payload.model as string
        continue
      }
      if (obj.type !== 'event_msg') continue
      const payload = obj.payload
      if (!payload) continue
      // Legacy format: model in payload.turn_context
      if (payload.turn_context?.model) currentModel = payload.turn_context.model as string
      if (payload.type !== 'token_count') continue
      // New format: payload.info.total_token_usage; legacy: payload.totals
      const totals = payload.info?.total_token_usage ?? payload.totals
      if (!totals) continue
      const currInput = (totals.input_tokens ?? 0) as number
      const currOutput = (totals.output_tokens ?? 0) as number
      const currCached = (totals.cached_input_tokens ?? 0) as number
      const deltaInput = Math.max(0, currInput - prevInput)
      const deltaOutput = Math.max(0, currOutput - prevOutput)
      const deltaCached = Math.max(0, currCached - prevCached)
      if (deltaInput > 0 || deltaOutput > 0) {
        const ts: number = obj.timestamp
          ? new Date(obj.timestamp).getTime()
          : typeof obj.ts === 'number'
            ? obj.ts
            : Date.now()
        turns.push({
          source: 'codex',
          sessionId,
          date: new Date(ts).toISOString().slice(0, 10),
          timestamp: ts,
          model: currentModel,
          inputTokens: deltaInput,
          outputTokens: deltaOutput,
          cacheReadTokens: deltaCached,
          cacheWriteTokens: 0,
          costUsd: calcCost(currentModel, deltaInput, deltaOutput, deltaCached, 0),
        })
      }
      prevInput = currInput
      prevOutput = currOutput
      prevCached = currCached
    } catch {
      /* skip */
    }
  }
  return { turns, project }
}

// ─── Backward-compatible exports (now backed by SQLite) ─────────────────────

export { getAllTurnsFromDb as getAllTurns, getGlmSessionIdsFromDb as getGlmSessionIds } from './db'

export function daysAgoStr(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
}

// ─── Stats Cache & History ───────────────────────────────────────────────────

export const STATS_CACHE_PATH = join(homedir(), '.claude', 'stats-cache.json')
export const HISTORY_PATH = join(homedir(), '.claude', 'history.jsonl')

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
