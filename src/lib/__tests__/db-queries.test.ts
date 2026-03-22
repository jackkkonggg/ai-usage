import Database from 'better-sqlite3'
import { createTestDb, seedTurns } from './helpers/test-db'
import {
  querySummary,
  queryDaily,
  querySessions,
  queryModels,
  queryDayDetail,
  _testSetDb,
  _testSkipSync,
} from '@/lib/db'

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

// ─── querySummary ──────────────────────────────────────────────────────────

describe('querySummary', () => {
  it('returns zero/null values for empty database', () => {
    const s = querySummary()
    expect(s.totalCost).toBe(0)
    // SQLite SUM() returns null when no rows; todayCost/weekCost/monthCost are not coalesced
    expect(s.todayCost).toBeNull()
    expect(s.totalTokens).toBe(0)
    expect(s.claudeTurns).toBeNull()
    expect(s.codexTurns).toBeNull()
    expect(s.totalSessions).toBe(0)
  })

  it('sums cost across all turns', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, costUsd: 0.5 },
      { date: '2026-03-21', timestamp: 1742500000000, costUsd: 1.5 },
    ])
    const s = querySummary()
    expect(s.totalCost).toBeCloseTo(2.0)
  })

  it('calculates today cost for matching date', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, costUsd: 0.75 },
      { date: '2026-03-21', timestamp: 1742500000000, costUsd: 1.25 },
    ])
    const s = querySummary()
    expect(s.todayCost).toBeCloseTo(0.75)
  })

  it('counts distinct sessions', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 'a' },
      { date: '2026-03-22', timestamp: 1742600001000, sessionId: 'a' },
      { date: '2026-03-22', timestamp: 1742600002000, sessionId: 'b' },
    ])
    const s = querySummary()
    expect(s.totalSessions).toBe(2)
  })

  it('splits claude vs codex turns', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, source: 'claude' },
      { date: '2026-03-22', timestamp: 1742600001000, source: 'claude' },
      { date: '2026-03-22', timestamp: 1742600002000, source: 'codex' },
    ])
    const s = querySummary()
    expect(s.claudeTurns).toBe(2)
    expect(s.codexTurns).toBe(1)
  })

  it('calculates cache hit rate', () => {
    seedTurns(testDb, [
      {
        date: '2026-03-22',
        timestamp: 1742600000000,
        inputTokens: 800,
        cacheReadTokens: 200,
      },
    ])
    const s = querySummary()
    // cacheRead / (input + cacheRead) * 100 = 200 / 1000 * 100 = 20
    expect(s.cacheHitRate).toBeCloseTo(20)
  })

  it('returns null cache hit rate when denominator is zero', () => {
    seedTurns(testDb, [
      {
        date: '2026-03-22',
        timestamp: 1742600000000,
        inputTokens: 0,
        cacheReadTokens: 0,
      },
    ])
    const s = querySummary()
    expect(s.cacheHitRate).toBeNull()
  })
})

// ─── queryDaily ────────────────────────────────────────────────────────────

describe('queryDaily', () => {
  it('returns scaffold for N days with no data', () => {
    const result = queryDaily(3)
    expect(result).toHaveLength(3)
    result.forEach((d) => {
      expect(d.claude.cost).toBe(0)
      expect(d.codex.cost).toBe(0)
    })
  })

  it('fills in data for days that have turns', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, source: 'claude', costUsd: 1.5 },
    ])
    const result = queryDaily(3)
    const today = result.find((d) => d.date === '2026-03-22')
    expect(today?.claude.cost).toBeCloseTo(1.5)
  })

  it('sorts output by date ascending', () => {
    const result = queryDaily(7)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date > result[i - 1].date).toBe(true)
    }
  })
})

// ─── querySessions ─────────────────────────────────────────────────────────

describe('querySessions', () => {
  it('returns sessions ordered by last_timestamp desc', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, sessionId: 'old' },
      { date: '2026-03-22', timestamp: 1742700000000, sessionId: 'new' },
    ])
    const result = querySessions()
    expect(result[0].sessionId).toBe('new')
    expect(result[1].sessionId).toBe('old')
  })

  it('aggregates cost and tokens per session', () => {
    seedTurns(testDb, [
      {
        date: '2026-03-22',
        timestamp: 1742600000000,
        sessionId: 'a',
        costUsd: 0.5,
        inputTokens: 100,
        outputTokens: 50,
      },
      {
        date: '2026-03-22',
        timestamp: 1742600001000,
        sessionId: 'a',
        costUsd: 0.3,
        inputTokens: 200,
        outputTokens: 100,
      },
    ])
    const result = querySessions()
    expect(result).toHaveLength(1)
    expect(result[0].cost).toBeCloseTo(0.8)
    expect(result[0].tokens).toBe(450)
    expect(result[0].turns).toBe(2)
  })
})

// ─── queryModels ───────────────────────────────────────────────────────────

describe('queryModels', () => {
  it('groups turns by model and sorts by cost desc', () => {
    seedTurns(testDb, [
      { date: '2026-03-22', timestamp: 1742600000000, model: 'claude-opus-4-5', costUsd: 5.0 },
      { date: '2026-03-22', timestamp: 1742600001000, model: 'claude-sonnet-4', costUsd: 1.0 },
      { date: '2026-03-22', timestamp: 1742600002000, model: 'claude-opus-4-5', costUsd: 3.0 },
    ])
    const result = queryModels()
    expect(result).toHaveLength(2)
    expect(result[0].model).toBe('claude-opus-4-5')
    expect(result[0].cost).toBeCloseTo(8.0)
    expect(result[0].turns).toBe(2)
    expect(result[1].model).toBe('claude-sonnet-4')
  })
})

// ─── queryDayDetail ────────────────────────────────────────────────────────

describe('queryDayDetail', () => {
  it('returns summary for a given date', () => {
    seedTurns(testDb, [
      { date: '2026-03-20', timestamp: 1742400000000, costUsd: 2.0 },
    ])
    const result = queryDayDetail('2026-03-20')
    expect(result.summary.totalCost).toBeCloseTo(2.0)
    expect(result.summary.totalTurns).toBe(1)
  })

  it('returns model breakdown for the date', () => {
    seedTurns(testDb, [
      { date: '2026-03-20', timestamp: 1742400000000, model: 'claude-opus-4-5', costUsd: 3 },
      { date: '2026-03-20', timestamp: 1742400001000, model: 'claude-sonnet-4', costUsd: 1 },
    ])
    const result = queryDayDetail('2026-03-20')
    expect(result.models).toHaveLength(2)
    expect(result.models[0].cost).toBeGreaterThan(result.models[1].cost)
  })

  it('returns sessions active on the date', () => {
    seedTurns(testDb, [
      { date: '2026-03-20', timestamp: 1742400000000, sessionId: 's1' },
      { date: '2026-03-20', timestamp: 1742400001000, sessionId: 's2' },
    ])
    const result = queryDayDetail('2026-03-20')
    expect(result.sessions).toHaveLength(2)
  })

  it('returns source split', () => {
    seedTurns(testDb, [
      { date: '2026-03-20', timestamp: 1742400000000, source: 'claude', costUsd: 2 },
      { date: '2026-03-20', timestamp: 1742400001000, source: 'codex', costUsd: 1 },
    ])
    const result = queryDayDetail('2026-03-20')
    expect(result.sources).toHaveLength(2)
    const claude = result.sources.find((s) => s.source === 'claude')
    expect(claude?.cost).toBeCloseTo(2)
  })

  // ─── Hourly truncation (the bug fix) ──────────────────────────────────

  describe('hourly truncation', () => {
    it('returns all 24 hours for a past date', () => {
      seedTurns(testDb, [
        { date: '2026-03-20', timestamp: 1742400000000 },
      ])
      const result = queryDayDetail('2026-03-20')
      expect(result.hourly).toHaveLength(24)
      expect(result.hourly[23].label).toBe('11pm')
      expect(result.hourly[23].hour).toBe(23)
    })

    it('truncates to current hour when date is today', () => {
      // System time is 2026-03-22T14:30 UTC => hour 14
      seedTurns(testDb, [
        { date: '2026-03-22', timestamp: 1742650200000 },
      ])
      const result = queryDayDetail('2026-03-22')
      // Should have hours 0-14 = 15 entries
      expect(result.hourly).toHaveLength(15)
      expect(result.hourly[result.hourly.length - 1].hour).toBe(14)
    })

    it('returns only 1 entry at midnight', () => {
      vi.setSystemTime(new Date('2026-03-22T00:15:00.000Z'))
      _testSkipSync() // re-set sync timer with new system time
      const result = queryDayDetail('2026-03-22')
      expect(result.hourly).toHaveLength(1)
      expect(result.hourly[0].label).toBe('12am')
    })

    it('returns all 24 entries at 11pm', () => {
      vi.setSystemTime(new Date('2026-03-22T23:45:00.000Z'))
      _testSkipSync()
      const result = queryDayDetail('2026-03-22')
      expect(result.hourly).toHaveLength(24)
    })

    it('excludes DB data beyond current hour from array', () => {
      const ts20 = new Date('2026-03-22T20:00:00.000Z').getTime()
      seedTurns(testDb, [{ date: '2026-03-22', timestamp: ts20 }])
      const result = queryDayDetail('2026-03-22')
      expect(result.hourly).toHaveLength(15)
      expect(result.hourly.every((h) => h.hour <= 14)).toBe(true)
    })

    it('includes activity counts for hours within range', () => {
      const ts8 = new Date('2026-03-22T08:00:00.000Z').getTime()
      const ts8b = new Date('2026-03-22T08:30:00.000Z').getTime()
      const ts10 = new Date('2026-03-22T10:00:00.000Z').getTime()
      seedTurns(testDb, [
        { date: '2026-03-22', timestamp: ts8 },
        { date: '2026-03-22', timestamp: ts8b },
        { date: '2026-03-22', timestamp: ts10 },
      ])
      const result = queryDayDetail('2026-03-22')
      expect(result.hourly[8].count).toBe(2)
      expect(result.hourly[10].count).toBe(1)
      expect(result.hourly[0].count).toBe(0)
    })

    it('uses correct 12-hour labels', () => {
      const result = queryDayDetail('2026-03-20')
      expect(result.hourly[0].label).toBe('12am')
      expect(result.hourly[6].label).toBe('6am')
      expect(result.hourly[12].label).toBe('12pm')
      expect(result.hourly[18].label).toBe('6pm')
    })
  })
})
