import { fmt$, fmtBig$, fmtTokens, shortDate, shortModel, localDateStr, daysAgoStr, fmtSessionDate } from '@/lib/format'

describe('fmt$', () => {
  it('returns "$0.00" for zero', () => {
    expect(fmt$(0)).toBe('$0.00')
  })

  it('returns "<$0.01" for values below half a cent', () => {
    expect(fmt$(0.004)).toBe('<$0.01')
    expect(fmt$(0.001)).toBe('<$0.01')
  })

  it('returns "<$0.01" at boundary 0.0049', () => {
    expect(fmt$(0.0049)).toBe('<$0.01')
  })

  it('returns "$0.01" at boundary 0.005', () => {
    expect(fmt$(0.005)).toBe('$0.01')
  })

  it('formats standard values with 2 decimals', () => {
    expect(fmt$(1.5)).toBe('$1.50')
    expect(fmt$(42.1)).toBe('$42.10')
  })

  it('formats large values with comma separators', () => {
    expect(fmt$(1234.56)).toBe('$1,234.56')
  })
})

describe('fmtBig$', () => {
  it('delegates to fmt$ below 1000', () => {
    expect(fmtBig$(0)).toBe('$0.00')
    expect(fmtBig$(999.99)).toBe('$999.99')
  })

  it('formats thousands with k suffix', () => {
    expect(fmtBig$(1000)).toBe('$1.0k')
    expect(fmtBig$(1234)).toBe('$1.2k')
    expect(fmtBig$(15678)).toBe('$15.7k')
  })
})

describe('fmtTokens', () => {
  it('returns raw number below 1000', () => {
    expect(fmtTokens(0)).toBe('0')
    expect(fmtTokens(999)).toBe('999')
  })

  it('formats thousands with K suffix', () => {
    expect(fmtTokens(1000)).toBe('1.0K')
    expect(fmtTokens(1500)).toBe('1.5K')
  })

  it('formats millions with M suffix', () => {
    expect(fmtTokens(1_000_000)).toBe('1.0M')
    expect(fmtTokens(2_500_000)).toBe('2.5M')
  })
})

describe('shortDate', () => {
  it('parses YYYY-MM-DD to "Mon D" format', () => {
    expect(shortDate('2024-01-15')).toBe('Jan 15')
    expect(shortDate('2024-12-01')).toBe('Dec 1')
  })

  it('strips leading zeros from day', () => {
    expect(shortDate('2024-03-05')).toBe('Mar 5')
  })
})

describe('shortModel', () => {
  it('returns dash for empty or unknown', () => {
    expect(shortModel('')).toBe('\u2014')
    expect(shortModel('unknown')).toBe('\u2014')
  })

  it('matches Claude model names', () => {
    expect(shortModel('claude-opus-4-6-20250301')).toBe('Opus 4.6')
    expect(shortModel('claude-opus-4-5-20250101')).toBe('Opus 4.5')
    expect(shortModel('claude-sonnet-4-20250101')).toBe('Sonnet 4')
    expect(shortModel('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
  })

  it('matches GPT model names with correct ordering', () => {
    expect(shortModel('gpt-5.1-codex-mini')).toBe('GPT-5.1')
    expect(shortModel('gpt-5-codex')).toBe('GPT-5')
    expect(shortModel('gpt-4o-mini-2025')).toBe('GPT-4o Mini')
    expect(shortModel('gpt-4o-2025')).toBe('GPT-4o')
  })

  it('falls back to first two segments for unknown model', () => {
    expect(shortModel('totally-unknown-model')).toBe('totally-unknown')
  })
})

describe('localDateStr', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T14:30:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats a known timestamp', () => {
    // 2024-06-01 in UTC
    const ts = new Date('2024-06-01T12:00:00.000Z').getTime()
    expect(localDateStr(ts)).toBe('2024-06-01')
  })

  it('returns today when called with no argument', () => {
    const result = localDateStr()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('zero-pads single-digit months and days', () => {
    const ts = new Date('2024-01-05T12:00:00.000Z').getTime()
    expect(localDateStr(ts)).toBe('2024-01-05')
  })
})

describe('daysAgoStr', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T14:30:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns today for n=0', () => {
    expect(daysAgoStr(0)).toBe(localDateStr())
  })

  it('returns yesterday for n=1', () => {
    const result = daysAgoStr(1)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Yesterday is 2026-03-21
    expect(result).toBe('2026-03-21')
  })
})

describe('fmtSessionDate', () => {
  it('returns shortDate when no timestamp provided', () => {
    expect(fmtSessionDate('2024-01-15')).toBe('Jan 15')
  })

  it('formats with 12-hour time', () => {
    // 2024-01-15 14:30 UTC
    const ts = new Date('2024-01-15T14:30:00.000Z').getTime()
    const result = fmtSessionDate('2024-01-15', ts)
    expect(result).toMatch(/Jan 15 · \d{1,2}:\d{2}(am|pm)/)
  })

  it('formats midnight as 12:00am', () => {
    const ts = new Date('2024-01-15T00:00:00.000Z').getTime()
    const result = fmtSessionDate('2024-01-15', ts)
    // In UTC timezone, midnight is 12:00am
    expect(result).toContain('12:00am')
  })

  it('formats noon as 12:00pm', () => {
    const ts = new Date('2024-01-15T12:00:00.000Z').getTime()
    const result = fmtSessionDate('2024-01-15', ts)
    expect(result).toContain('12:00pm')
  })

  it('zero-pads minutes', () => {
    const ts = new Date('2024-01-15T14:05:00.000Z').getTime()
    const result = fmtSessionDate('2024-01-15', ts)
    expect(result).toMatch(/:05/)
  })
})
