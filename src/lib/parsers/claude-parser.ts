import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join, basename, relative, sep } from 'path'
import { calcCost } from './pricing'
import { localDateStr } from '@/lib/format'
import { SessionParser } from './session-parser'
import type { Turn, ParseResult } from './session-parser'

const PROJECTS_BASE = join(homedir(), '.claude', 'projects')

export class ClaudeParser extends SessionParser {
  readonly source = 'claude' as const
  readonly sessionDirs = [PROJECTS_BASE]

  parseFile(filePath: string): ParseResult {
    const sessionId = basename(filePath, '.jsonl')
    let content = ''
    try {
      content = readFileSync(filePath, 'utf-8')
    } catch {
      return { turns: [], project: null }
    }

    // Extract project from directory structure: ~/.claude/projects/<encoded-path>/...
    let project: string | null = null
    if (filePath.startsWith(PROJECTS_BASE + sep)) {
      const rel = relative(PROJECTS_BASE, filePath)
      const firstSeg = rel.split(sep)[0]
      if (firstSeg) project = firstSeg
    }

    // Deduplicate streaming entries: keep only the last entry per message ID
    const lastByMsgId = new Map<
      string,
      { model: string; ts: number; input: number; output: number; cacheRead: number; cacheWrite: number }
    >()

    for (const line of content.split('\n')) {
      if (!line.trim()) continue
      try {
        const obj = JSON.parse(line)
        if (obj.type !== 'assistant') continue
        const usage = obj.message?.usage
        if (!usage) continue
        const model: string = obj.message?.model ?? 'unknown'
        if (model.startsWith('glm')) continue
        const msgId: string = obj.message?.id ?? ''
        if (!msgId) continue
        const rawTs = obj.timestamp ? new Date(obj.timestamp).getTime() : NaN
        const ts: number = Number.isFinite(rawTs) ? rawTs : Date.now()
        const input: number = usage.input_tokens ?? 0
        const output: number = usage.output_tokens ?? 0
        const cacheRead: number = usage.cache_read_input_tokens ?? 0
        const cacheWrite: number = usage.cache_creation_input_tokens ?? 0
        if (input === 0 && output === 0) continue
        // Later entries for the same message ID overwrite earlier ones
        lastByMsgId.set(msgId, { model, ts, input, output, cacheRead, cacheWrite })
      } catch {
        /* skip */
      }
    }

    const turns: Turn[] = []
    for (const [, entry] of lastByMsgId) {
      turns.push({
        source: 'claude',
        sessionId,
        date: localDateStr(entry.ts),
        timestamp: entry.ts,
        model: entry.model,
        inputTokens: entry.input,
        outputTokens: entry.output,
        cacheReadTokens: entry.cacheRead,
        cacheWriteTokens: entry.cacheWrite,
        costUsd: calcCost(entry.model, entry.input, entry.output, entry.cacheRead, entry.cacheWrite),
      })
    }
    // Sort by timestamp to preserve order
    turns.sort((a, b) => a.timestamp - b.timestamp)
    return { turns, project }
  }
}
