'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg: '#070707',
  surface: '#0f0f0f',
  surface2: '#141414',
  surface3: '#181818',
  border: '#1e1e1e',
  border2: '#242424',
  amber: '#f59e0b',
  orange: '#f97316',
  emerald: '#10b981',
  text: '#e8e8e8',
  textDim: '#999',
  muted: '#444',
  mono: "'JetBrains Mono', monospace",
  sans: "'Outfit', sans-serif",
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  totalCost: number
  todayCost: number
  weekCost: number
  monthCost: number
  totalTokens: number
  claudeTurns: number
  codexTurns: number
  totalSessions: number
  claudeFound: boolean
  codexFound: boolean
  totalMessages: number | null
  timeSavedMs: number
  firstSessionDate: string | null
  cacheHitRate: number | null
}
interface DailyEntry {
  date: string
  claude: { cost: number; tokens: number }
  codex: { cost: number; tokens: number }
}
interface Session {
  sessionId: string
  source: 'claude' | 'codex'
  date: string
  lastTimestamp?: number
  model: string
  cost: number
  tokens: number
  turns: number
}
interface ModelStat {
  model: string
  source: string
  cost: number
  tokens: number
  turns: number
}
interface HourlyEntry {
  hour: number
  label: string
  count: number
}
interface ProjectStat {
  project: string
  displayName: string
  sessionCount: number
  messageCount: number
  lastActive: string
}
interface ActivityEntry {
  date: string
  messages: number
  sessions: number
  toolCalls: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt$ = (n: number) =>
  n === 0
    ? '$0.00'
    : n < 0.005
      ? '<$0.01'
      : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtBig$ = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
    : fmt$(n)
const fmtTokens = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : String(n)
const shortDate = (d: string) => {
  const [, m, day] = d.split('-')
  const months = [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[parseInt(m)]} ${parseInt(day)}`
}
const shortModel = (m: string) => {
  if (!m || m === 'unknown') return '—'
  if (m.includes('opus-4-6')) return 'Opus 4.6'
  if (m.includes('opus-4-5')) return 'Opus 4.5'
  if (m.includes('opus-4-1')) return 'Opus 4.1'
  if (m.includes('opus-4')) return 'Opus 4'
  if (m.includes('opus')) return 'Opus'
  if (m.includes('sonnet-4-6')) return 'Sonnet 4.6'
  if (m.includes('sonnet-4-5')) return 'Sonnet 4.5'
  if (m.includes('sonnet-4')) return 'Sonnet 4'
  if (m.includes('sonnet')) return 'Sonnet'
  if (m.includes('haiku-4-5')) return 'Haiku 4.5'
  if (m.includes('haiku')) return 'Haiku'
  if (m.includes('5.1-codex')) return 'GPT-5.1'
  if (m.includes('5.3-codex')) return 'GPT-5.3'
  if (m.includes('5-codex')) return 'GPT-5'
  if (m.includes('5.4')) return 'GPT-5.4'
  if (m.includes('gpt-5')) return 'GPT-5'
  if (m.includes('4o-mini')) return 'GPT-4o Mini'
  if (m.includes('4o')) return 'GPT-4o'
  return m.split('-').slice(0, 2).join('-')
}
const fmtSessionDate = (date: string, ts?: number) => {
  if (!ts) return shortDate(date)
  const d = new Date(ts)
  const [, m, day] = d.toISOString().slice(0, 10).split('-')
  const months = [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const h = d.getHours(),
    min = d.getMinutes()
  const ampm = h >= 12 ? 'p' : 'a'
  const h12 = h % 12 || 12
  const minStr = min.toString().padStart(2, '0')
  return `${months[parseInt(m)]} ${parseInt(day)} · ${h12}:${minStr}${ampm}`
}
const fmtTimeSaved = (ms: number) => {
  if (ms <= 0) return '—'
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── Custom tooltips ─────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const c = payload.find((p) => p.dataKey === 'claude')?.value ?? 0
  const x = payload.find((p) => p.dataKey === 'codex')?.value ?? 0
  if (c + x === 0) return null
  return (
    <div
      style={{
        background: C.surface2,
        border: `1px solid ${C.border2}`,
        borderRadius: 8,
        padding: '10px 14px',
        fontFamily: C.mono,
        fontSize: 12,
        lineHeight: 1.8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ color: C.textDim, marginBottom: 4, fontSize: 11 }}>{label}</div>
      {c > 0 && (
        <div style={{ color: C.orange }}>
          Claude <span style={{ float: 'right', marginLeft: 24 }}>{fmt$(c)}</span>
        </div>
      )}
      {x > 0 && (
        <div style={{ color: C.emerald }}>
          Codex <span style={{ float: 'right', marginLeft: 24 }}>{fmt$(x)}</span>
        </div>
      )}
      <div
        style={{ color: C.amber, borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 4 }}
      >
        Total <span style={{ float: 'right', marginLeft: 24 }}>{fmt$(c + x)}</span>
      </div>
    </div>
  )
}

function ActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const msgs = payload.find((p) => p.dataKey === 'messages')?.value ?? 0
  const tools = payload.find((p) => p.dataKey === 'toolCalls')?.value ?? 0
  const sess = payload.find((p) => p.dataKey === 'sessions')?.value ?? 0
  if (msgs + tools === 0) return null
  return (
    <div
      style={{
        background: C.surface2,
        border: `1px solid ${C.border2}`,
        borderRadius: 8,
        padding: '10px 14px',
        fontFamily: C.mono,
        fontSize: 12,
        lineHeight: 1.8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ color: C.textDim, marginBottom: 4, fontSize: 11 }}>{label}</div>
      <div style={{ color: C.amber }}>
        Messages <span style={{ float: 'right', marginLeft: 24 }}>{msgs}</span>
      </div>
      <div style={{ color: C.orange }}>
        Tool Calls <span style={{ float: 'right', marginLeft: 24 }}>{tools}</span>
      </div>
      <div style={{ color: C.muted }}>
        Sessions <span style={{ float: 'right', marginLeft: 24 }}>{sess}</span>
      </div>
    </div>
  )
}

function HourlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const count = payload[0]?.value ?? 0
  if (count === 0) return null
  return (
    <div
      style={{
        background: C.surface2,
        border: `1px solid ${C.border2}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontFamily: C.mono,
        fontSize: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <span style={{ color: C.textDim }}>{label}</span>
      <span style={{ color: C.amber, marginLeft: 12 }}>{count} sessions</span>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: C.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 30,
          fontWeight: 700,
          fontFamily: C.mono,
          color: C.amber,
          letterSpacing: '-1.5px',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      {sub && <span style={{ fontSize: 12, color: C.textDim }}>{sub}</span>}
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  const isClaude = source === 'claude'
  const color = isClaude ? C.orange : C.emerald
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 4,
        background: `${color}18`,
        color,
        letterSpacing: '0.02em',
      }}
    >
      {isClaude ? 'Claude' : 'Codex'}
    </span>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [daily, setDaily] = useState<DailyEntry[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [models, setModels] = useState<ModelStat[]>([])
  const [hourly, setHourly] = useState<HourlyEntry[]>([])
  const [projects, setProjects] = useState<ProjectStat[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState(30)
  const [chartTab, setChartTab] = useState<'cost' | 'activity'>('cost')

  const fetchAll = useCallback(
    async (days = range, force = false) => {
      setRefreshing(true)
      const f = force ? '&force=true' : ''
      try {
        const [s, d, sess, m, h, p, a] = await Promise.all([
          fetch(`/api/summary?${f}`).then((r) => r.json()),
          fetch(`/api/daily?days=${days}${f}`).then((r) => r.json()),
          fetch(`/api/sessions?${f}`).then((r) => r.json()),
          fetch(`/api/models?${f}`).then((r) => r.json()),
          fetch(`/api/hourly?${f}`).then((r) => r.json()),
          fetch(`/api/projects?${f}`).then((r) => r.json()),
          fetch(`/api/activity?days=${days}${f}`).then((r) => r.json()),
        ])
        setSummary(s)
        setDaily(d)
        setSessions(sess)
        setModels(m)
        setHourly(h)
        setProjects(p)
        setActivity(a)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [range],
  )

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleRange = (days: number) => {
    setRange(days)
    fetchAll(days)
  }

  if (loading) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 36,
              marginBottom: 12,
              animation: 'spin 1s linear infinite',
              display: 'inline-block',
            }}
          >
            ◌
          </div>
          <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 13 }}>
            parsing session data…
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  const s = summary!
  const maxModelCost = models[0]?.cost || 1
  const costChartData = daily.map((d) => ({
    date: shortDate(d.date),
    claude: d.claude.cost,
    codex: d.codex.cost,
  }))
  const activityChartData = activity.map((d) => ({
    date: shortDate(d.date),
    messages: d.messages,
    toolCalls: d.toolCalls,
    sessions: d.sessions,
  }))
  const maxProjectMsgs = projects[0]?.messageCount || 1

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        padding: '28px 36px 48px',
        maxWidth: 1600,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 36,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: C.text }}>
              AI Subscription Usage
            </h1>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: C.amber,
                boxShadow: `0 0 8px ${C.amber}`,
                display: 'inline-block',
              }}
            />
          </div>
          <div style={{ fontSize: 13, color: C.muted, display: 'flex', gap: 12 }}>
            <span style={{ color: s?.claudeFound ? C.orange : C.muted }}>
              {s?.claudeFound ? '✓' : '✗'} Claude Code
            </span>
            <span style={{ color: s?.codexFound ? C.emerald : C.muted }}>
              {s?.codexFound ? '✓' : '✗'} OpenAI Codex
            </span>
          </div>
        </div>
        <button
          onClick={() => fetchAll(range, true)}
          disabled={refreshing}
          style={{
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: refreshing ? C.muted : C.textDim,
            padding: '8px 18px',
            borderRadius: 7,
            cursor: refreshing ? 'default' : 'pointer',
            fontSize: 13,
            fontFamily: C.sans,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span className={refreshing ? 'spin' : undefined}>↻</span>
          Refresh
        </button>
      </div>

      {/* Stats row — 6 cols */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <StatCard
          label="All Time"
          value={fmtBig$(s.totalCost)}
          sub={`${fmtTokens(s.totalTokens)} tokens`}
        />
        <StatCard label="Today" value={fmt$(s.todayCost)} />
        <StatCard label="Last 7 Days" value={fmt$(s.weekCost)} />
        <StatCard label="Last 30 Days" value={fmt$(s.monthCost)} />
        <StatCard
          label="Messages"
          value={s.totalMessages != null ? fmtTokens(s.totalMessages) : '—'}
          sub={s.firstSessionDate ? `since ${s.firstSessionDate}` : undefined}
        />
        <StatCard
          label="Cache Hit Rate"
          value={s.cacheHitRate != null ? `${s.cacheHitRate.toFixed(1)}%` : '—'}
          sub="of input tokens"
        />
      </div>

      {/* Source row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: 'Claude Code Turns',
            value: fmtTokens(s.claudeTurns),
            color: C.orange,
            icon: '◆',
          },
          { label: 'Codex Turns', value: fmtTokens(s.codexTurns), color: C.emerald, icon: '◇' },
          { label: 'Total Sessions', value: fmtTokens(s.totalSessions), color: C.amber, icon: '▸' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span style={{ fontSize: 22, color: item.color, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.09em',
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: C.mono,
                  color: C.text,
                  letterSpacing: '-1px',
                }}
              >
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabbed chart panel */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '22px 28px',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', gap: 4 }}>
            {(['cost', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setChartTab(tab)}
                style={{
                  background: chartTab === tab ? C.surface3 : 'transparent',
                  border: `1px solid ${chartTab === tab ? C.border2 : 'transparent'}`,
                  color: chartTab === tab ? C.text : C.muted,
                  padding: '5px 14px',
                  borderRadius: 5,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: C.sans,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {tab === 'cost' ? 'Cost' : 'Activity'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => handleRange(d)}
                style={{
                  background: range === d ? C.surface3 : 'transparent',
                  border: `1px solid ${range === d ? C.border2 : 'transparent'}`,
                  color: range === d ? C.text : C.muted,
                  padding: '4px 12px',
                  borderRadius: 5,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: C.sans,
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {chartTab === 'cost' ? (
          <>
            <ResponsiveContainer width="100%" height={180} style={{ outline: 'none' }}>
              <BarChart
                data={costChartData}
                barSize={range <= 7 ? 24 : range <= 30 ? 12 : 5}
                barGap={1}
              >
                <CartesianGrid vertical={false} stroke={C.border} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: C.muted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  interval={costChartData.length <= 7 ? 0 : costChartData.length <= 30 ? 4 : 9}
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v === 0 ? '' : `$${v.toFixed(2)}`)}
                  width={58}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
                <Bar dataKey="claude" stackId="s" fill={C.orange} radius={[0, 0, 2, 2]} />
                <Bar dataKey="codex" stackId="s" fill={C.emerald} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 20, marginTop: 14, justifyContent: 'flex-end' }}>
              {[
                { color: C.orange, label: 'Claude Code' },
                { color: C.emerald, label: 'OpenAI Codex' },
              ].map((l) => (
                <div
                  key={l.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12,
                    color: C.textDim,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: l.color,
                      display: 'inline-block',
                    }}
                  />
                  {l.label}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180} style={{ outline: 'none' }}>
              <AreaChart data={activityChartData}>
                <CartesianGrid vertical={false} stroke={C.border} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: C.muted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  interval={
                    activityChartData.length <= 7 ? 0 : activityChartData.length <= 30 ? 4 : 9
                  }
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                />
                <Tooltip content={<ActivityTooltip />} cursor={{ stroke: C.border2 }} />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke={C.amber}
                  fill={C.amber}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="toolCalls"
                  stroke={C.orange}
                  fill={C.orange}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 20, marginTop: 14, justifyContent: 'flex-end' }}>
              {[
                { color: C.amber, label: 'Messages' },
                { color: C.orange, label: 'Tool Calls' },
              ].map((l) => (
                <div
                  key={l.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12,
                    color: C.textDim,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: l.color,
                      display: 'inline-block',
                    }}
                  />
                  {l.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Lower section — two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
        {/* LEFT col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hourly chart */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '22px 24px',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.textDim,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 18,
              }}
            >
              Activity by Hour
            </div>
            <ResponsiveContainer width="100%" height={120} style={{ outline: 'none' }}>
              <BarChart data={hourly} barSize={8}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.muted, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  ticks={['12a', '6a', '12p', '6p']}
                />
                <YAxis hide />
                <Tooltip content={<HourlyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
                <Bar dataKey="count" fill={C.amber} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Projects panel */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '22px 24px',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.textDim,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 22,
              }}
            >
              By Project
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {projects.slice(0, 8).map((p) => {
                const pct = (p.messageCount / maxProjectMsgs) * 100
                return (
                  <div key={p.project}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 8, color: C.amber, lineHeight: 1 }}>●</span>
                        <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>
                          {p.displayName}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontFamily: C.mono,
                          color: C.amber,
                          fontWeight: 600,
                        }}
                      >
                        {fmtTokens(p.messageCount)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: C.border,
                        borderRadius: 2,
                        overflow: 'hidden',
                        marginBottom: 5,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: C.amber,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
                      {p.sessionCount} sessions · {p.lastActive}
                    </div>
                  </div>
                )
              })}
              {projects.length === 0 && (
                <div
                  style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}
                >
                  No project data found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Models */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '22px 24px',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.textDim,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 22,
              }}
            >
              By Model
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {models.map((m) => {
                const pct = (m.cost / maxModelCost) * 100
                const color = m.source === 'claude' ? C.orange : C.emerald
                return (
                  <div key={m.model}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 8, color, lineHeight: 1 }}>●</span>
                        <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>
                          {shortModel(m.model)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontFamily: C.mono,
                          color: C.amber,
                          fontWeight: 600,
                        }}
                      >
                        {fmt$(m.cost)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: C.border,
                        borderRadius: 2,
                        overflow: 'hidden',
                        marginBottom: 5,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: color,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
                      {fmtTokens(m.tokens)} tokens · {m.turns} turns
                    </div>
                  </div>
                )
              })}
              {models.length === 0 && (
                <div
                  style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}
                >
                  No model data found
                </div>
              )}
            </div>
          </div>

          {/* Sessions */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '22px 28px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.textDim,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 18,
              }}
            >
              Recent Sessions
              <span style={{ marginLeft: 10, color: C.muted, fontWeight: 400 }}>
                ({Math.min(sessions.length, 50)} of {sessions.length})
              </span>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 420 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Source', 'Model', 'Turns', 'Tokens', 'Cost'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          paddingBottom: 10,
                          paddingRight: 16,
                          color: C.muted,
                          fontSize: 11,
                          fontWeight: 500,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          borderBottom: `1px solid ${C.border}`,
                          position: 'sticky',
                          top: 0,
                          background: C.surface,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 50).map((sess, i) => (
                    <tr
                      key={sess.sessionId}
                      style={{ borderBottom: `1px solid ${i < 49 ? C.border : 'transparent'}` }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background = C.surface2
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                      }}
                    >
                      <td
                        style={{
                          padding: '11px 16px 11px 0',
                          color: C.textDim,
                          fontFamily: C.mono,
                          fontSize: 12,
                        }}
                      >
                        {fmtSessionDate(sess.date, sess.lastTimestamp)}
                      </td>
                      <td style={{ padding: '11px 16px 11px 0' }}>
                        <SourceBadge source={sess.source} />
                      </td>
                      <td
                        style={{
                          padding: '11px 16px 11px 0',
                          color: C.text,
                          fontFamily: C.mono,
                          fontSize: 12,
                        }}
                      >
                        {shortModel(sess.model)}
                      </td>
                      <td
                        style={{
                          padding: '11px 16px 11px 0',
                          color: C.textDim,
                          fontFamily: C.mono,
                          fontSize: 12,
                        }}
                      >
                        {sess.turns}
                      </td>
                      <td
                        style={{
                          padding: '11px 16px 11px 0',
                          color: C.textDim,
                          fontFamily: C.mono,
                          fontSize: 12,
                        }}
                      >
                        {fmtTokens(sess.tokens)}
                      </td>
                      <td
                        style={{
                          padding: '11px 0',
                          color: C.amber,
                          fontFamily: C.mono,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {fmt$(sess.cost)}
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: '32px 0',
                          color: C.muted,
                          textAlign: 'center',
                          fontSize: 13,
                        }}
                      >
                        No sessions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 32,
          textAlign: 'center',
          color: C.muted,
          fontSize: 11,
          fontFamily: C.mono,
        }}
      >
        ~/.claude/projects · ~/.codex/sessions · ~/.claude/stats-cache.json ·
        ~/.claude/history.jsonl · local data only
      </div>
    </div>
  )
}
