import { getPrice, calcCost } from '@/lib/parsers/pricing'

describe('getPrice', () => {
  it('returns exact match', () => {
    const p = getPrice('claude-sonnet-4')
    expect(p.input).toBe(3)
    expect(p.output).toBe(15)
  })

  it('strips date suffix and matches', () => {
    const p = getPrice('claude-opus-4-5-20250301')
    expect(p.input).toBe(5)
    expect(p.output).toBe(25)
  })

  it('finds longest prefix match', () => {
    // "gpt-5.1-codex-mini" should match the exact key
    const p = getPrice('gpt-5.1-codex-mini')
    expect(p.input).toBe(0.25)
    expect(p.output).toBe(2)
  })

  it('falls back to claude-sonnet-4 for completely unknown model', () => {
    const p = getPrice('totally-unknown-model-xyz')
    const sonnet = getPrice('claude-sonnet-4')
    expect(p).toEqual(sonnet)
  })

  it('returns correct prices for spot-checked models', () => {
    const opus = getPrice('claude-opus-4-6')
    expect(opus.input).toBe(5)
    expect(opus.cacheRead).toBe(0.5)
    expect(opus.cacheWrite).toBe(6.25)

    const gpt4o = getPrice('gpt-4o')
    expect(gpt4o.input).toBe(2.5)
    expect(gpt4o.cacheWrite).toBe(0)
  })
})

describe('calcCost', () => {
  it('returns 0 for zero tokens', () => {
    expect(calcCost('claude-sonnet-4', 0, 0, 0, 0)).toBe(0)
  })

  it('calculates cost per million tokens', () => {
    // 1M input of claude-sonnet-4 at $3/M = $3.00
    expect(calcCost('claude-sonnet-4', 1_000_000, 0, 0, 0)).toBe(3)
  })

  it('calculates mixed tokens with cache for Claude', () => {
    // claude-opus-4-6: input=$5, output=$25, cacheRead=$0.50, cacheWrite=$6.25
    const cost = calcCost('claude-opus-4-6', 100_000, 50_000, 200_000, 10_000)
    const expected =
      (100_000 * 5 + 50_000 * 25 + 200_000 * 0.5 + 10_000 * 6.25) / 1_000_000
    expect(cost).toBeCloseTo(expected)
  })

  it('GPT models have zero cache write cost', () => {
    const withCacheWrite = calcCost('gpt-5-codex', 0, 0, 0, 100_000)
    expect(withCacheWrite).toBe(0)
  })

  it('uses default pricing for unknown model', () => {
    const unknown = calcCost('unknown-model', 1_000_000, 0, 0, 0)
    const sonnet = calcCost('claude-sonnet-4', 1_000_000, 0, 0, 0)
    expect(unknown).toBe(sonnet)
  })
})
