'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { CategoricalChartFunc } from 'recharts/types/chart/types'
import { C } from '@/lib/design-tokens'
import { fmt$, fmtBig$, fmtTokens, shortDate } from '@/lib/format'
import type { Summary, DailyEntry, Session, ModelStat, HourlyEntry, ProjectStat, ActivityEntry } from '@/lib/types'
import { StatCard } from '@/components/stat-card'
import { FullPageLoader } from '@/components/loader'
import { DashboardCharts } from './dashboard-charts'
import { HourlyPanel, ProjectsPanel, ModelsPanel } from './dashboard-panels'
import { SessionsPanel } from './dashboard-sessions'

export default function Dashboard() {
  const router = useRouter()
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
    return <FullPageLoader message="parsing session data…" />
  }

  const s = summary!
  const costChartData = daily.map((d) => ({
    date: shortDate(d.date),
    rawDate: d.date,
    claude: d.claude.cost,
    codex: d.codex.cost,
  }))
  const activityChartData = activity.map((d) => ({
    date: shortDate(d.date),
    messages: d.messages,
    toolCalls: d.toolCalls,
    sessions: d.sessions,
  }))

  const handleChartClick: CategoricalChartFunc = (nextState) => {
    const idx = Number(nextState?.activeTooltipIndex)
    if (!Number.isNaN(idx) && costChartData[idx]) {
      router.push(`/day/${costChartData[idx].rawDate}`)
    }
  }

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

      {/* Stats row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 12 }}
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
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}
      >
        {[
          { label: 'Claude Code Turns', value: fmtTokens(s.claudeTurns), color: C.orange, icon: '◆' },
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

      <DashboardCharts
        costData={costChartData}
        activityData={activityChartData}
        chartTab={chartTab}
        onTabChange={setChartTab}
        range={range}
        onRangeChange={handleRange}
        onChartClick={handleChartClick}
      />

      {/* Lower section — two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <HourlyPanel hourly={hourly} />
          <ProjectsPanel projects={projects} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ModelsPanel models={models} />
          <SessionsPanel sessions={sessions} />
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
