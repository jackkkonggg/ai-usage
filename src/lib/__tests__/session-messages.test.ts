import { parseClaudeMessages, parseCodexMessages, readSessionMessages } from '@/lib/session-messages'
import { join } from 'path'

const FIXTURES = join(__dirname, '..', '__fixtures__')

describe('parseClaudeMessages', () => {
  it('parses a simple user text message', () => {
    const lines = [JSON.stringify({ type: 'user', message: { content: 'Hello' }, timestamp: '2024-01-15T10:00:00Z' })]
    const msgs = parseClaudeMessages(lines)
    expect(msgs).toHaveLength(1)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].content).toBe('Hello')
  })

  it('parses an assistant text message', () => {
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: { content: 'Hi there' },
        timestamp: '2024-01-15T10:00:00Z',
      }),
    ]
    const msgs = parseClaudeMessages(lines)
    expect(msgs).toHaveLength(1)
    expect(msgs[0].role).toBe('assistant')
    expect(msgs[0].content).toBe('Hi there')
  })

  it('skips isMeta user messages', () => {
    const lines = [
      JSON.stringify({ type: 'user', isMeta: true, message: { content: 'meta info' } }),
    ]
    expect(parseClaudeMessages(lines)).toHaveLength(0)
  })

  it('extracts text from content block arrays', () => {
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: ' world' },
          ],
        },
      }),
    ]
    const msgs = parseClaudeMessages(lines)
    expect(msgs[0].content).toBe('Hello\n world')
  })

  it('extracts tool_use blocks into tools array', () => {
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Running a command' },
            { type: 'tool_use', name: 'Read', input: { file_path: '/tmp/test.ts' } },
          ],
        },
      }),
    ]
    const msgs = parseClaudeMessages(lines)
    expect(msgs[0].tools).toHaveLength(1)
    expect(msgs[0].tools![0].name).toBe('Read')
    expect(msgs[0].tools![0].summary).toBe('test.ts')
  })

  it('summarizes Bash tool with description', () => {
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', name: 'Bash', input: { description: 'Run tests', command: 'npm test' } },
          ],
        },
      }),
    ]
    const msgs = parseClaudeMessages(lines)
    expect(msgs[0].tools![0].summary).toBe('Run tests')
  })

  it('summarizes Grep tool with pattern and path', () => {
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', name: 'Grep', input: { pattern: 'TODO', path: '/src/lib/db.ts' } },
          ],
        },
      }),
    ]
    const msgs = parseClaudeMessages(lines)
    expect(msgs[0].tools![0].summary).toBe('"TODO" in db.ts')
  })

  it('strips ANSI escape codes from user text', () => {
    const lines = [
      JSON.stringify({
        type: 'user',
        message: { content: '\x1b[31mred text\x1b[0m' },
      }),
    ]
    const msgs = parseClaudeMessages(lines)
    expect(msgs[0].content).toBe('red text')
  })

  it('strips system-reminder tags', () => {
    const lines = [
      JSON.stringify({
        type: 'user',
        message: { content: 'Hello <system-reminder>ignore this</system-reminder> world' },
      }),
    ]
    const msgs = parseClaudeMessages(lines)
    expect(msgs[0].content).toBe('Hello  world')
  })

  it('parses command-name tags into kind: "command"', () => {
    const lines = [
      JSON.stringify({
        type: 'user',
        message: { content: '<command-name>git status</command-name>' },
      }),
    ]
    const msgs = parseClaudeMessages(lines)
    expect(msgs[0].kind).toBe('command')
    expect(msgs[0].content).toBe('git status')
  })

  it('appends stdout output to preceding command message', () => {
    const lines = [
      JSON.stringify({
        type: 'user',
        message: { content: '<command-name>ls</command-name>' },
      }),
      JSON.stringify({
        type: 'user',
        message: { content: '<local-command-stdout>file1.ts\nfile2.ts</local-command-stdout>' },
      }),
    ]
    const msgs = parseClaudeMessages(lines)
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toContain('file1.ts')
  })

  it('skips malformed JSON lines without throwing', () => {
    const lines = ['not json', '{ broken', JSON.stringify({ type: 'assistant', message: { content: 'ok' } })]
    const msgs = parseClaudeMessages(lines)
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toBe('ok')
  })

  it('returns empty array for empty input', () => {
    expect(parseClaudeMessages([])).toEqual([])
    expect(parseClaudeMessages(['', '  '])).toEqual([])
  })
})

describe('parseCodexMessages', () => {
  it('parses user_message events', () => {
    const lines = [
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'user_message', message: 'Hello' },
        timestamp: '2024-01-15T10:00:00Z',
      }),
    ]
    const msgs = parseCodexMessages(lines)
    expect(msgs).toHaveLength(1)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].content).toBe('Hello')
  })

  it('parses agent_message events', () => {
    const lines = [
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'agent_message', message: 'Response' },
        timestamp: '2024-01-15T10:00:00Z',
      }),
    ]
    const msgs = parseCodexMessages(lines)
    expect(msgs[0].role).toBe('assistant')
  })

  it('skips non-event_msg types', () => {
    const lines = [
      JSON.stringify({ type: 'session_meta', payload: { cwd: '/home' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'user_message', message: 'Hello' },
      }),
    ]
    const msgs = parseCodexMessages(lines)
    expect(msgs).toHaveLength(1)
  })

  it('skips events without payload', () => {
    const lines = [JSON.stringify({ type: 'event_msg' })]
    expect(parseCodexMessages(lines)).toHaveLength(0)
  })

  it('preserves timestamps', () => {
    const lines = [
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'user_message', message: 'Hi' },
        timestamp: '2024-01-15T10:30:00Z',
      }),
    ]
    const msgs = parseCodexMessages(lines)
    expect(msgs[0].timestamp).toBe('2024-01-15T10:30:00Z')
  })

  it('skips empty message text', () => {
    const lines = [
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'user_message', message: '   ' },
      }),
    ]
    expect(parseCodexMessages(lines)).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    expect(parseCodexMessages([])).toEqual([])
  })
})

describe('readSessionMessages', () => {
  it('returns empty array for non-existent file', () => {
    expect(readSessionMessages('/nonexistent/path.jsonl', 'claude')).toEqual([])
  })

  it('reads a Claude JSONL fixture file', () => {
    const msgs = readSessionMessages(join(FIXTURES, 'claude-messages.jsonl'), 'claude')
    expect(msgs.length).toBeGreaterThan(0)
    expect(msgs[0].role).toBeDefined()
  })

  it('reads a Codex JSONL fixture file', () => {
    const msgs = readSessionMessages(join(FIXTURES, 'codex-messages.jsonl'), 'codex')
    expect(msgs.length).toBeGreaterThan(0)
  })
})
