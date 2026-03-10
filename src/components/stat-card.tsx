import { C } from '@/lib/design-tokens'

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
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
