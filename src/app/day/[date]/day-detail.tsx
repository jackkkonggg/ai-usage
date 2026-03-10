'use client'

import { useRouter } from 'next/navigation'
import { C } from '@/lib/design-tokens'
import { fmt$, fmtTokens } from '@/lib/format'
import type { DayDetail as DayDetailType } from '@/lib/types'
import { StatCard } from '@/components/stat-card'
import { SourceCard } from '@/components/source-card'
import { ModelBreakdownChart, HourlyChart, TokenBreakdownChart } from './day-charts'
import { DaySessions } from './day-sessions'

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function DayDetail({ date, data }: { date: string; data: DayDetailType }) {
  const router = useRouter()

  const { summary: s, sources } = data
  const claudeSrc = sources.find((src) => src.source === 'claude')
  const codexSrc = sources.find((src) => src.source === 'codex')
  const isEmpty = s.totalTurns === 0

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
          marginBottom: 32,
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.textDim,
            padding: '8px 18px',
            borderRadius: 7,
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: C.sans,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ← Back
        </button>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: C.text,
            fontFamily: C.sans,
          }}
        >
          {formatFullDate(date)}
        </h1>
        <div style={{ width: 90 }} />
      </div>

      {isEmpty ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 0',
            color: C.muted,
            fontFamily: C.mono,
            fontSize: 14,
          }}
        >
          No activity on this date
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard label="Total Cost" value={fmt$(s.totalCost)} />
            <StatCard label="Tokens" value={fmtTokens(s.totalTokens)} />
            <StatCard label="Turns" value={String(s.totalTurns)} />
            <StatCard label="Sessions" value={String(s.sessionCount)} />
            <StatCard
              label="Cache Hit Rate"
              value={s.cacheHitRate != null ? `${s.cacheHitRate.toFixed(1)}%` : '—'}
            />
          </div>

          {/* Source split */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <SourceCard label="Claude" color={C.orange} data={claudeSrc} />
            <SourceCard label="Codex" color={C.emerald} data={codexSrc} />
          </div>

          {/* Charts row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <ModelBreakdownChart models={data.models} />
            <HourlyChart hourly={data.hourly} />
          </div>

          {/* Token breakdown + Sessions */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <TokenBreakdownChart summary={s} />
            <DaySessions sessions={data.sessions} />
          </div>
        </>
      )}
    </div>
  )
}
