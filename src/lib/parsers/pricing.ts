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
  // OpenAI standard API pricing
  'gpt-5': { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 },
  'gpt-5-codex': { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 },
  'gpt-5-chat': { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 },
  'gpt-5.1': { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 },
  'gpt-5.1-codex': { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 },
  'gpt-5.1-codex-mini': { input: 0.25, output: 2, cacheRead: 0.025, cacheWrite: 0 },
  'gpt-5.2': { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 },
  'gpt-5.2-codex': { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 },
  'gpt-5.3': { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 },
  'gpt-5.3-codex': { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 },
  'gpt-5.3-codex-spark': { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 },
  'gpt-5.4': { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 0 },
  'gpt-4o': { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6, cacheRead: 0.075, cacheWrite: 0 },
}

export function getPrice(model: string) {
  if (PRICES[model]) return PRICES[model]
  const stripped = model.replace(/-\d{8}.*$/, '')
  if (PRICES[stripped]) return PRICES[stripped]
  // Find the longest matching key prefix (model name starts with key)
  let bestKey: string | null = null
  for (const k of Object.keys(PRICES)) {
    if (stripped.startsWith(k)) {
      if (!bestKey || k.length > bestKey.length) bestKey = k
    }
  }
  return bestKey ? PRICES[bestKey] : PRICES['claude-sonnet-4']
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
