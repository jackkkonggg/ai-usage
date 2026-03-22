import Database from 'better-sqlite3'
import { createTestDb, seedTurns, seedSessionMeta } from './helpers/test-db'
import { _testSetDb, _testSkipSync } from '@/lib/db'
import { querySessionDetail } from '@/lib/db-sessions'

let testDb: Database.Database

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-22T14:30:00.000Z'))
  testDb = createTestDb()
  _testSetDb(testDb)
  _testSkipSync()
})

afterEach(() => {
  vi.useRealTimers()
  testDb.close()
})

describe('querySessionDetail', () => {
  it('returns null for non-existent session', () => {
    expect(querySessionDetail('nonexistent')).toBeNull()
  })

  it('returns filePath and project from session_meta', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 's1', filePath: '/tmp/s1.jsonl' },
    ])
    seedSessionMeta(testDb, [{ sessionId: 's1', source: 'claude', project: 'my-project' }])
    const result = querySessionDetail('s1')
    expect(result).not.toBeNull()
    expect(result!.filePath).toBe('/tmp/s1.jsonl')
    expect(result!.project).toBe('my-project')
  })

  it('returns turns ordered by timestamp ascending', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600002000, sessionId: 's1' },
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 's1' },
      { date: '2026-03-22', timestamp: 1742600001000, sessionId: 's1' },
    ])
    const result = querySessionDetail('s1')!
    expect(result.turns).toHaveLength(3)
    expect(result.turns[0].timestamp).toBe(1742600000000)
    expect(result.turns[1].timestamp).toBe(1742600001000)
    expect(result.turns[2].timestamp).toBe(1742600002000)
  })

  it('maps all turn fields correctly', () => {
    seedTurns(testDb, [
      {
        date: '2026-03-22',
        timestamp: 1742600000000,
        sessionId: 's1',
        source: 'claude',
        model: 'claude-sonnet-4',
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 200,
        cacheWriteTokens: 10,
        costUsd: 0.05,
      },
    ])
    const result = querySessionDetail('s1')!
    const t = result.turns[0]
    expect(t.sessionId).toBe('s1')
    expect(t.source).toBe('claude')
    expect(t.model).toBe('claude-sonnet-4')
    expect(t.inputTokens).toBe(100)
    expect(t.outputTokens).toBe(50)
    expect(t.cacheReadTokens).toBe(200)
    expect(t.cacheWriteTokens).toBe(10)
    expect(t.costUsd).toBeCloseTo(0.05)
  })

  it('returns null project when session_meta has no project', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 's1' },
    ])
    const result = querySessionDetail('s1')
    expect(result).not.toBeNull()
    expect(result!.project).toBeNull()
  })
})
