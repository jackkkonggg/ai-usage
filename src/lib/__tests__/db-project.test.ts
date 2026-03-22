import Database from 'better-sqlite3'
import { createTestDb, seedTurns, seedSessionMeta } from './helpers/test-db'
import { _testSetDb, _testSkipSync } from '@/lib/db'

// Mock stats-cache (external dependency — vi.mock works for cross-module imports)
vi.mock('@/lib/stats-cache', () => ({
  getHistory: vi.fn(() => []),
}))

import { getHistory } from '@/lib/stats-cache'
import { queryProjectDetail } from '@/lib/db-project'

const mockGetHistory = getHistory as ReturnType<typeof vi.fn>

let testDb: Database.Database

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-22T14:30:00.000Z'))
  testDb = createTestDb()
  _testSetDb(testDb)
  _testSkipSync()
  mockGetHistory.mockReturnValue([])
})

afterEach(() => {
  vi.useRealTimers()
  testDb.close()
})

describe('queryProjectDetail', () => {
  it('returns null when no sessions found for project', () => {
    expect(queryProjectDetail('nonexistent')).toBeNull()
  })

  it('aggregates summary across project sessions (via session_meta)', () => {
    seedSessionMeta(testDb, [
      { sessionId: 's1', source: 'codex', project: 'my-project' },
    ])
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 's1', costUsd: 1.5 },
      { date: '2026-03-22', timestamp: 1742600001000, sessionId: 's1', costUsd: 0.5 },
    ])
    const result = queryProjectDetail('my-project')
    expect(result).not.toBeNull()
    expect(result!.summary.totalCost).toBeCloseTo(2.0)
    expect(result!.summary.totalTurns).toBe(2)
  })

  it('includes sessions from history.jsonl', () => {
    mockGetHistory.mockReturnValue([
      { display: 'cmd', pastedContents: {}, timestamp: 1, project: 'my-project', sessionId: 'h1' },
    ])
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 'h1', costUsd: 3.0 },
    ])
    const result = queryProjectDetail('my-project')
    expect(result).not.toBeNull()
    expect(result!.summary.totalCost).toBeCloseTo(3.0)
  })

  it('returns model breakdown sorted by cost desc', () => {
    seedSessionMeta(testDb, [
      { sessionId: 's1', source: 'claude', project: 'p1' },
    ])
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 's1', model: 'claude-opus-4-5', costUsd: 5 },
      { date: '2026-03-22', timestamp: 1742600001000, sessionId: 's1', model: 'claude-sonnet-4', costUsd: 1 },
    ])
    const result = queryProjectDetail('p1')!
    expect(result.models[0].model).toBe('claude-opus-4-5')
    expect(result.models[0].cost).toBeGreaterThan(result.models[1].cost)
  })

  it('returns daily cost breakdown by source', () => {
    seedSessionMeta(testDb, [
      { sessionId: 's1', source: 'claude', project: 'p1' },
    ])
    seedTurns(testDb, [
      { date: '2026-03-20', timestamp: 1742400000000, sessionId: 's1', source: 'claude', costUsd: 2 },
      { date: '2026-03-21', timestamp: 1742500000000, sessionId: 's1', source: 'claude', costUsd: 3 },
    ])
    const result = queryProjectDetail('p1')!
    expect(result.daily).toHaveLength(2)
    expect(result.daily[0].date < result.daily[1].date).toBe(true)
  })

  it('returns source split', () => {
    seedSessionMeta(testDb, [
      { sessionId: 's1', source: 'claude', project: 'p1' },
      { sessionId: 's2', source: 'codex', project: 'p1' },
    ])
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 's1', source: 'claude', costUsd: 2 },
      { date: '2026-03-22', timestamp: 1742600001000, sessionId: 's2', source: 'codex', costUsd: 1 },
    ])
    const result = queryProjectDetail('p1')!
    expect(result.sources).toHaveLength(2)
  })

  it('extracts displayName from last path segment', () => {
    seedSessionMeta(testDb, [
      { sessionId: 's1', source: 'codex', project: '/home/user/my-project' },
    ])
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 's1', costUsd: 1 },
    ])
    const result = queryProjectDetail('/home/user/my-project')!
    expect(result.displayName).toBe('my-project')
  })
})
