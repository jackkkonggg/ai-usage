import { C } from '@/lib/design-tokens'
import { fmt$, fmtTokens } from '@/lib/format'

export function SourceCard({
  label,
  color,
  data,
}: {
  label: string
  color: string
  data?: { cost: number; tokens: number; turns: number }
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '16px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <span style={{ fontSize: 20, color, flexShrink: 0 }}>
        {label === 'Claude' ? '◆' : '◇'}
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        {data ? (
          <div style={{ display: 'flex', gap: 20, fontFamily: C.mono, fontSize: 13 }}>
            <span style={{ color }}>{fmt$(data.cost)}</span>
            <span style={{ color: C.textDim }}>{fmtTokens(data.tokens)} tok</span>
            <span style={{ color: C.textDim }}>{data.turns} turns</span>
          </div>
        ) : (
          <span style={{ color: C.muted, fontFamily: C.mono, fontSize: 13 }}>—</span>
        )}
      </div>
    </div>
  )
}
