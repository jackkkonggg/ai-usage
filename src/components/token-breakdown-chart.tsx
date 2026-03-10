'use client'

import { C } from '@/lib/design-tokens'
import { fmtTokens } from '@/lib/format'
import type { DaySummary } from '@/lib/types'

const panelStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '22px 24px',
}

const sectionHeader: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: C.textDim,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 18,
}

export function TokenBreakdownChart({ summary }: { summary: DaySummary }) {
  const { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens } = summary
  const total = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
  if (total === 0) {
    return (
      <div style={panelStyle}>
        <div style={sectionHeader}>Token Breakdown</div>
        <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          No token data
        </div>
      </div>
    )
  }

  const segments: { label: string; value: number; color: string }[] = [
    { label: 'Input', value: inputTokens, color: C.amber },
    { label: 'Output', value: outputTokens, color: C.orange },
    { label: 'Cache Read', value: cacheReadTokens, color: C.emerald },
    { label: 'Cache Write', value: cacheWriteTokens, color: C.textDim },
  ].filter((s) => s.value > 0)

  return (
    <div style={panelStyle}>
      <div style={sectionHeader}>Token Breakdown</div>

      {/* Stacked bar */}
      <div
        style={{
          display: 'flex',
          height: 20,
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{
              width: `${(seg.value / total) * 100}%`,
              background: seg.color,
              minWidth: 2,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: seg.color,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 13, color: C.textDim }}>{seg.label}</span>
            </div>
            <span style={{ fontFamily: C.mono, fontSize: 13, color: C.text }}>
              {fmtTokens(seg.value)}
              <span style={{ color: C.muted, marginLeft: 8 }}>
                {((seg.value / total) * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
