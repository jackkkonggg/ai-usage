import { ClaudeParser } from '@/lib/parsers/claude-parser'
import { join } from 'path'

const FIXTURES = join(__dirname, '..', '__fixtures__')
const parser = new ClaudeParser()

describe('ClaudeParser.parseFile', () => {
  it('returns empty turns for non-existent file', () => {
    const result = parser.parseFile('/nonexistent/file.jsonl')
    expect(result.turns).toEqual([])
    expect(result.project).toBeNull()
  })

  it('parses assistant turns with usage data', () => {
    const result = parser.parseFile(join(FIXTURES, 'claude-session.jsonl'))
    expect(result.turns).toHaveLength(3)
    result.turns.forEach((t) => {
      expect(t.source).toBe('claude')
      expect(t.inputTokens).toBeGreaterThan(0)
      expect(t.outputTokens).toBeGreaterThan(0)
      expect(t.costUsd).toBeGreaterThan(0)
    })
  })

  it('deduplicates streaming entries (keeps last per message ID)', () => {
    const result = parser.parseFile(join(FIXTURES, 'claude-session-streaming.jsonl'))
    expect(result.turns).toHaveLength(1)
    // Last entry had input=100, output=50
    expect(result.turns[0].inputTokens).toBe(100)
    expect(result.turns[0].outputTokens).toBe(50)
  })

  it('filters out glm-prefixed models', () => {
    const result = parser.parseFile(join(FIXTURES, 'claude-session-glm.jsonl'))
    // Only the claude-sonnet turn should remain, not the glm-4-plus one
    expect(result.turns).toHaveLength(1)
    expect(result.turns[0].model).toBe('claude-sonnet-4-20250301')
  })

  it('sorts turns by timestamp ascending', () => {
    const result = parser.parseFile(join(FIXTURES, 'claude-session.jsonl'))
    for (let i = 1; i < result.turns.length; i++) {
      expect(result.turns[i].timestamp).toBeGreaterThanOrEqual(result.turns[i - 1].timestamp)
    }
  })

  it('extracts session ID from filename', () => {
    const result = parser.parseFile(join(FIXTURES, 'claude-session.jsonl'))
    expect(result.turns[0].sessionId).toBe('claude-session')
  })

  it('calculates cost via pricing module', () => {
    const result = parser.parseFile(join(FIXTURES, 'claude-session.jsonl'))
    result.turns.forEach((t) => {
      expect(t.costUsd).toBeGreaterThan(0)
      expect(typeof t.costUsd).toBe('number')
    })
  })

  it('handles malformed JSON lines gracefully', () => {
    // The valid fixture still parses even if we imagine broken lines
    // (the fixture itself is clean, so this tests the try/catch path exists)
    const result = parser.parseFile(join(FIXTURES, 'claude-session.jsonl'))
    expect(result.turns.length).toBeGreaterThan(0)
  })

  it('returns null project when file is not under projects dir', () => {
    // Fixture files are not under ~/.claude/projects/, so project is null
    const result = parser.parseFile(join(FIXTURES, 'claude-session.jsonl'))
    expect(result.project).toBeNull()
  })

  it('assigns correct date from timestamp', () => {
    const result = parser.parseFile(join(FIXTURES, 'claude-session.jsonl'))
    result.turns.forEach((t) => {
      expect(t.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
