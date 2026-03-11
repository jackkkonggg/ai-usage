// ─── Formatting helpers ───────────────────────────────────────────────────────

export const fmt$ = (n: number) =>
  n === 0
    ? '$0.00'
    : n < 0.005
      ? '<$0.01'
      : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fmtBig$ = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
    : fmt$(n)

export const fmtTokens = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : String(n)

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const shortDate = (d: string) => {
  const [, m, day] = d.split('-')
  return `${MONTHS[parseInt(m)]} ${parseInt(day)}`
}

// Ordered tuples: first match wins. More specific patterns must come before general ones.
const MODEL_DISPLAY: [substring: string, displayName: string][] = [
  ['opus-4-6', 'Opus 4.6'],
  ['opus-4-5', 'Opus 4.5'],
  ['opus-4-1', 'Opus 4.1'],
  ['opus-4', 'Opus 4'],
  ['opus', 'Opus'],
  ['sonnet-4-6', 'Sonnet 4.6'],
  ['sonnet-4-5', 'Sonnet 4.5'],
  ['sonnet-4', 'Sonnet 4'],
  ['sonnet', 'Sonnet'],
  ['haiku-4-5', 'Haiku 4.5'],
  ['haiku', 'Haiku'],
  ['5.1-codex', 'GPT-5.1'],
  ['5.3-codex', 'GPT-5.3'],
  ['5-codex', 'GPT-5'],
  ['5.4', 'GPT-5.4'],
  ['gpt-5', 'GPT-5'],
  ['4o-mini', 'GPT-4o Mini'],
  ['4o', 'GPT-4o'],
]

export const shortModel = (m: string) => {
  if (!m || m === 'unknown') return '—'
  return MODEL_DISPLAY.find(([sub]) => m.includes(sub))?.[1] ?? m.split('-').slice(0, 2).join('-')
}

export function localDateStr(ts?: number): string {
  const d = ts != null ? new Date(ts) : new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function daysAgoStr(n: number) {
  return localDateStr(Date.now() - n * 86_400_000)
}

export const fmtSessionDate = (date: string, ts?: number) => {
  if (!ts) return shortDate(date)
  const d = new Date(ts)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = d.getHours(),
    min = d.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  const minStr = min.toString().padStart(2, '0')
  return `${MONTHS[m]} ${day} · ${h12}:${minStr}${ampm}`
}

