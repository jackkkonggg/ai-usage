import { readFileSync } from 'fs'
import { basename } from 'path'
import type { ConversationMessage, ToolCall } from '@/lib/types'

const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g
const SYSTEM_TAG_RE = /<(local-command-caveat|system-reminder|gitStatus)[^>]*>[\s\S]*?<\/\1>/g
const OUTPUT_TAG_RE = /<local-command-std(?:out|err)>([\s\S]*?)<\/local-command-std(?:out|err)>/

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '')
}

function cleanText(s: string): string {
  return stripAnsi(s.replace(SYSTEM_TAG_RE, '').trim())
}

function tryParseCommand(text: string): { command: string; stdout: string } | null {
  const cmdMatch = /<command-name>(.*?)<\/command-name>/.exec(text)
  if (!cmdMatch) return null
  const command = cmdMatch[1].trim()
  const stdoutMatch = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/.exec(text)
  const stdout = stdoutMatch ? stripAnsi(stdoutMatch[1].trim()) : ''
  return { command, stdout }
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .filter((b: { type?: string; text?: string }) => b.type === 'text' && b.text)
      .map((b: { text: string }) => b.text)
      .join('\n')
      .trim()
  }
  return ''
}

type ToolInput = Record<string, unknown>

const TOOL_SUMMARY: Record<string, (input: ToolInput) => string> = {
  Bash: (i) => (i.description as string) ?? ((i.command as string) ?? '').split('\n')[0].slice(0, 80),
  Edit: (i) => basename((i.file_path as string) ?? ''),
  Write: (i) => basename((i.file_path as string) ?? ''),
  Read: (i) => basename((i.file_path as string) ?? ''),
  Grep: (i) => {
    const pat = `"${i.pattern}"`
    const loc = i.path ? ` in ${basename(i.path as string)}` : ''
    return pat + loc
  },
  Glob: (i) => (i.pattern as string) ?? '',
  Agent: (i) => (i.description as string) ?? (i.subagent_type as string) ?? '',
}

function extractTools(content: unknown): ToolCall[] {
  if (!Array.isArray(content)) return []
  return content
    .filter((b: { type?: string }) => b.type === 'tool_use')
    .map((b: { name?: string; input?: ToolInput }) => {
      const name = b.name ?? 'Tool'
      const summarize = TOOL_SUMMARY[name]
      const summary = summarize ? summarize(b.input ?? {}) : ''
      return { name, summary }
    })
}

function parseClaudeMessages(lines: string[]): ConversationMessage[] {
  const messages: ConversationMessage[] = []
  let lastCommand: ConversationMessage | null = null

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const obj = JSON.parse(line)
      const ts = obj.timestamp ?? ''

      if (obj.type === 'user') {
        if (obj.isMeta) continue
        const rawText = extractTextContent(obj.message?.content)
        if (!rawText) continue

        // stdout/stderr arrive as a separate message right after the command
        const outputMatch = OUTPUT_TAG_RE.exec(rawText)
        if (outputMatch && lastCommand) {
          const output = stripAnsi(outputMatch[1].trim())
          if (output) lastCommand.content += '\n' + output
          continue
        }

        const cmd = tryParseCommand(rawText)
        if (cmd) {
          const msg: ConversationMessage = {
            role: 'user',
            content: cmd.stdout ? `${cmd.command}\n${cmd.stdout}` : cmd.command,
            timestamp: ts,
            kind: 'command',
          }
          messages.push(msg)
          lastCommand = msg
        } else {
          lastCommand = null
          const text = cleanText(rawText)
          if (text) messages.push({ role: 'user', content: text, timestamp: ts })
        }
      } else if (obj.type === 'assistant') {
        lastCommand = null
        const content = obj.message?.content
        const text = extractTextContent(content)
        const tools = extractTools(content)
        if (text || tools.length > 0) {
          messages.push({
            role: 'assistant',
            content: text || '',
            timestamp: ts,
            tools: tools.length > 0 ? tools : undefined,
          })
        }
      }
    } catch {
      /* skip */
    }
  }
  return messages
}

function parseCodexMessages(lines: string[]): ConversationMessage[] {
  const messages: ConversationMessage[] = []
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const obj = JSON.parse(line)
      if (obj.type !== 'event_msg') continue
      const payload = obj.payload
      if (!payload) continue
      const ts = obj.timestamp ?? ''

      if (payload.type === 'user_message') {
        const text = typeof payload.message === 'string' ? payload.message.trim() : ''
        if (text) {
          messages.push({ role: 'user', content: text, timestamp: ts })
        }
      } else if (payload.type === 'agent_message') {
        const text = typeof payload.message === 'string' ? payload.message.trim() : ''
        if (text) {
          messages.push({ role: 'assistant', content: text, timestamp: ts })
        }
      }
    } catch {
      /* skip */
    }
  }
  return messages
}

export function readSessionMessages(
  filePath: string,
  source: 'claude' | 'codex',
): ConversationMessage[] {
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }
  const lines = content.split('\n')
  return source === 'claude' ? parseClaudeMessages(lines) : parseCodexMessages(lines)
}
