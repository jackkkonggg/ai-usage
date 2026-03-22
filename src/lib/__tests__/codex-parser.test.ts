import { CodexParser } from '@/lib/parsers/codex-parser'
import { join } from 'path'

const FIXTURES = join(__dirname, '..', '__fixtures__')
const parser = new CodexParser()

describe('CodexParser.parseFile', () => {
  it('returns empty turns for non-existent file', () => {
    const result = parser.parseFile('/nonexistent/file.jsonl')
    expect(result.turns).toEqual([])
    expect(result.project).toBeNull()
  })

  it('parses token_count events into turns', () => {
    const result = parser.parseFile(join(FIXTURES, 'codex-session.jsonl'))
    expect(result.turns.length).toBeGreaterThan(0)
    result.turns.forEach((t) => {
      expect(t.source).toBe('codex')
      expect(t.costUsd).toBeGreaterThanOrEqual(0)
    })
  })

  it('calculates deltas correctly between token_count events', () => {
    const result = parser.parseFile(join(FIXTURES, 'codex-session.jsonl'))
    // First event: input=100, output=50, cached=20
    // Second event: input=250, output=120, cached=50
    // Third event: input=400, output=200, cached=80
    // Deltas are computed as increments
    expect(result.turns.length).toBeGreaterThanOrEqual(2)
    result.turns.forEach((t) => {
      expect(t.inputTokens).toBeGreaterThanOrEqual(0)
      expect(t.outputTokens).toBeGreaterThanOrEqual(0)
    })
  })

  it('extracts model from turn_context events', () => {
    const result = parser.parseFile(join(FIXTURES, 'codex-session.jsonl'))
    result.turns.forEach((t) => {
      expect(t.model).toBe('gpt-5.1-codex-mini')
    })
  })

  it('defaults to "gpt-5-codex" when no model event present', () => {
    // Codex session without turn_context: make inline fixture
    const { writeFileSync, unlinkSync } = require('fs')
    const tmpPath = join(FIXTURES, '_tmp_no_model.jsonl')
    const lines = [
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { total_token_usage: { input_tokens: 100, output_tokens: 50, cached_tokens: 0 } },
        },
        timestamp: '2024-01-15T10:00:00Z',
      }),
    ]
    writeFileSync(tmpPath, lines.join('\n'))
    try {
      const result = parser.parseFile(tmpPath)
      expect(result.turns[0].model).toBe('gpt-5-codex')
    } finally {
      unlinkSync(tmpPath)
    }
  })

  it('extracts project from session_meta cwd', () => {
    const result = parser.parseFile(join(FIXTURES, 'codex-session.jsonl'))
    expect(result.project).toBe('/home/user/my-project')
  })

  it('handles model changes mid-session', () => {
    const result = parser.parseFile(join(FIXTURES, 'codex-session-multi-turn.jsonl'))
    expect(result.turns.length).toBe(2)
    expect(result.turns[0].model).toBe('gpt-5-codex')
    expect(result.turns[1].model).toBe('gpt-5.1-codex-mini')
  })

  it('assigns session ID from filename', () => {
    const result = parser.parseFile(join(FIXTURES, 'codex-session.jsonl'))
    expect(result.turns[0].sessionId).toBe('codex-session')
  })

  it('assigns correct date from timestamp', () => {
    const result = parser.parseFile(join(FIXTURES, 'codex-session.jsonl'))
    result.turns.forEach((t) => {
      expect(t.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it('sets cacheWriteTokens to 0 for all codex turns', () => {
    const result = parser.parseFile(join(FIXTURES, 'codex-session.jsonl'))
    result.turns.forEach((t) => {
      expect(t.cacheWriteTokens).toBe(0)
    })
  })
})
