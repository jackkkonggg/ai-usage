'use client'

import { useRouter } from 'next/navigation'
import { C } from '@/lib/design-tokens'
import { fmt$, fmtTokens } from '@/lib/format'
import type { ProjectDetail as ProjectDetailType } from '@/lib/types'
import { StatCard } from '@/components/stat-card'
import { SourceCard } from '@/components/source-card'
import { ModelBreakdownChart } from '@/components/model-breakdown-chart'
import { TokenBreakdownChart } from '@/components/token-breakdown-chart'
import { DailyActivityChart } from './project-charts'
import { ProjectSessions } from './project-sessions'

export default function ProjectDetail({ data }: { data: ProjectDetailType }) {
  const router = useRouter()

  const { summary: s, sources } = data
  const claudeSrc = sources.find((src) => src.source === 'claude')
  const codexSrc = sources.find((src) => src.source === 'codex')

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
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: C.text,
              fontFamily: C.sans,
              margin: 0,
            }}
          >
            {data.displayName}
          </h1>
          {data.project !== data.displayName && (
            <div
              style={{
                fontSize: 12,
                color: C.muted,
                fontFamily: C.mono,
                marginTop: 4,
              }}
            >
              {data.project}
            </div>
          )}
        </div>
        <div style={{ width: 90 }} />
      </div>

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
        <DailyActivityChart daily={data.daily} />
        <ModelBreakdownChart models={data.models} />
      </div>

      {/* Bottom row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <TokenBreakdownChart summary={s} />
        <ProjectSessions sessions={data.sessions} />
      </div>
    </div>
  )
}
