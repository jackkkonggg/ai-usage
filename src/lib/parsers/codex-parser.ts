import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join, basename } from 'path'
import { calcCost } from './pricing'
import { localDateStr } from '@/lib/format'
import { SessionParser } from './session-parser'
import type { Turn, ParseResult } from './session-parser'

export class CodexParser extends SessionParser {
  readonly source = 'codex' as const
  readonly sessionDirs = [
    join(homedir(), '.codex', 'sessions'),
    join(homedir(), '.codex', 'archived_sessions'),
  ]

  parseFile(filePath: string): ParseResult {
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
        const deltaOutput = Math.max(0, currOutput - prevOutput)
        const deltaCached = Math.max(0, currCached - prevCached)
        // OpenAI reports input_tokens inclusive of cached; compute delta of non-cached input directly
        const deltaInput = Math.max(0, (currInput - currCached) - (prevInput - prevCached))
        if (deltaInput > 0 || deltaOutput > 0) {
          const rawTs = obj.timestamp ? new Date(obj.timestamp).getTime() : NaN
          const ts: number = Number.isFinite(rawTs)
            ? rawTs
            : typeof obj.ts === 'number'
              ? obj.ts
              : Date.now()
          turns.push({
            source: 'codex',
            sessionId,
            date: localDateStr(ts),
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
}
