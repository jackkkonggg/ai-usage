// ─── Pricing (per million tokens, USD) ───────────────────────────────────────

const PRICES: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite: number }
> = {
  'claude-opus-4-6': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4-5': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4-1': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-opus-4': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4-5': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  'claude-haiku-3-5': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  // OpenAI prices with 2x priority/fast mode multiplier
  'gpt-5': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5-codex': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5-chat': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5.1': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5.1-codex': { input: 2.5, output: 20, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-5.3': { input: 3.5, output: 28, cacheRead: 0.35, cacheWrite: 0 },
  'gpt-5.3-codex': { input: 3.5, output: 28, cacheRead: 0.35, cacheWrite: 0 },
  'gpt-5.4': { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 0 },
  'gpt-4o': { input: 5, output: 20, cacheRead: 2.5, cacheWrite: 0 },
  'gpt-4o-mini': { input: 0.3, output: 1.2, cacheRead: 0.15, cacheWrite: 0 },
}

export function getPrice(model: string) {
  if (PRICES[model]) return PRICES[model]
  const stripped = model.replace(/-\d{8}.*$/, '')
  const key = Object.keys(PRICES).find((k) => stripped.startsWith(k) || k.startsWith(stripped))
  return key ? PRICES[key] : PRICES['claude-sonnet-4']
}

export function calcCost(
  model: string,
  input: number,
  output: number,
  cacheRead: number,
  cacheWrite: number,
) {
  const p = getPrice(model)
  return (
    (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheWrite * p.cacheWrite) /
    1_000_000
  )
}
