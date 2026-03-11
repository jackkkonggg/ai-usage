import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join, basename } from 'path'
import { calcCost } from './pricing'
import { localDateStr } from '@/lib/format'
import { SessionParser } from './session-parser'
import type { Turn, ParseResult } from './session-parser'

export class ClaudeParser extends SessionParser {
  readonly source = 'claude' as const
  readonly sessionDir = join(homedir(), '.claude', 'projects')

  parseFile(filePath: string): ParseResult {
    const turns: Turn[] = []
    const sessionId = basename(filePath, '.jsonl')
    let description: string | null = null
    let content = ''
    try {
      content = readFileSync(filePath, 'utf-8')
    } catch {
      return { turns, description, project: null }
    }

    for (const line of content.split('\n')) {
      if (!line.trim()) continue
      try {
        const obj = JSON.parse(line)

        // Capture the first user message as description
        if (!description && obj.type === 'user') {
          const msgContent = obj.message?.content
          if (typeof msgContent === 'string' && msgContent.trim()) {
            description = msgContent.trim().slice(0, 200)
          } else if (Array.isArray(msgContent)) {
            const textBlock = msgContent.find(
              (b: { type?: string; text?: string }) => b.type === 'text' && b.text,
            )
            if (textBlock?.text) description = textBlock.text.trim().slice(0, 200)
          }
        }

        if (obj.type !== 'assistant') continue
        const usage = obj.message?.usage
        if (!usage) continue
        const model: string = obj.message?.model ?? 'unknown'
        // Skip GLM turns — GLM detection is handled separately in db.ts
        if (model.startsWith('glm')) continue
        const ts: number = obj.timestamp ? new Date(obj.timestamp).getTime() : Date.now()
        const input: number = usage.input_tokens ?? 0
        const output: number = usage.output_tokens ?? 0
        const cacheRead: number = usage.cache_read_input_tokens ?? 0
        const cacheWrite: number = usage.cache_creation_input_tokens ?? 0
        if (input === 0 && output === 0) continue
        turns.push({
          source: 'claude',
          sessionId,
          date: localDateStr(ts),
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
    return { turns, description, project: null }
  }
}
