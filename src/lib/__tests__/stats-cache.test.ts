import { vi } from 'vitest'

vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs')>()
  return {
    ...original,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  }
})

const fs = await import('fs')
const { getStatsCache, clearStatsCache, getHistory } = await import('@/lib/stats-cache')

const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
const mockReadFileSync = fs.readFileSync as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-22T14:00:00.000Z'))
  clearStatsCache()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getStatsCache', () => {
  it('returns null when file does not exist', () => {
    mockExistsSync.mockReturnValue(false)
    expect(getStatsCache()).toBeNull()
  })

  it('parses valid JSON from file', () => {
    const fakeCache = {
      dailyActivity: [],
      modelUsage: {},
      totalMessages: 42,
      longestSession: { sessionId: 's1', duration: 100, messageCount: 5, timestamp: '' },
      firstSessionDate: '2024-01-01',
      hourCounts: {},
      totalSpeculationTimeSavedMs: 0,
    }
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify(fakeCache))
    const result = getStatsCache()
    expect(result).not.toBeNull()
    expect(result!.totalMessages).toBe(42)
  })

  it('returns cached value within TTL', () => {
    const fakeCache = { totalMessages: 1 }
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify(fakeCache))

    getStatsCache() // first call reads file
    mockReadFileSync.mockClear()

    getStatsCache() // second call should use cache
    expect(mockReadFileSync).not.toHaveBeenCalled()
  })

  it('refetches after TTL expires', () => {
    const fakeCache = { totalMessages: 1 }
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify(fakeCache))

    getStatsCache() // first call
    vi.advanceTimersByTime(31_000) // advance past 30s TTL
    mockReadFileSync.mockClear()
    mockReadFileSync.mockReturnValue(JSON.stringify(fakeCache))

    getStatsCache() // should refetch
    expect(mockReadFileSync).toHaveBeenCalled()
  })

  it('returns null on parse error', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('not json{{{')
    expect(getStatsCache()).toBeNull()
  })
})

describe('clearStatsCache', () => {
  it('invalidates TTL so next call refetches', () => {
    const fakeCache = { totalMessages: 1 }
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify(fakeCache))

    getStatsCache()
    clearStatsCache()
    mockReadFileSync.mockClear()
    mockReadFileSync.mockReturnValue(JSON.stringify(fakeCache))

    getStatsCache()
    expect(mockReadFileSync).toHaveBeenCalled()
  })
})

describe('getHistory', () => {
  it('returns empty array when file does not exist', () => {
    mockExistsSync.mockReturnValue(false)
    expect(getHistory()).toEqual([])
  })

  it('parses JSONL lines', () => {
    const lines = [
      JSON.stringify({ display: 'cmd1', pastedContents: {}, timestamp: 1, project: 'p', sessionId: 's1' }),
      JSON.stringify({ display: 'cmd2', pastedContents: {}, timestamp: 2, project: 'p', sessionId: 's2' }),
    ].join('\n')
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(lines)
    const result = getHistory()
    expect(result).toHaveLength(2)
    expect(result[0].sessionId).toBe('s1')
  })

  it('returns empty array on parse error', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockImplementation(() => {
      throw new Error('read error')
    })
    expect(getHistory()).toEqual([])
  })
})
