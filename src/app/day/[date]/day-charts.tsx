'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { C } from '@/lib/design-tokens'
import type { HourlyEntry } from '@/lib/types'

export { ModelBreakdownChart } from '@/components/model-breakdown-chart'
export { TokenBreakdownChart } from '@/components/token-breakdown-chart'

// ─── Shared tooltip style ─────────────────────────────────────────────────────

const tooltipBox: React.CSSProperties = {
  background: C.surface2,
  border: `1px solid ${C.border2}`,
  borderRadius: 8,
  padding: '8px 12px',
  fontFamily: C.mono,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}

const panelStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '22px 24px',
}

// ─── Hourly Chart ─────────────────────────────────────────────────────────────

function HourlyTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const count = payload[0]?.value ?? 0
  if (count === 0) return null
  return (
    <div style={tooltipBox}>
      <span style={{ color: C.textDim }}>{label}</span>
      <span style={{ color: C.amber, marginLeft: 12 }}>{count} turns</span>
    </div>
  )
}

export function HourlyChart({ hourly }: { hourly: HourlyEntry[] }) {
  return (
    <div style={panelStyle}>
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
      <ResponsiveContainer width="100%" height={200} style={{ outline: 'none' }}>
        <BarChart data={hourly} barSize={10}>
          <CartesianGrid vertical={false} stroke={C.border} />
          <XAxis
            dataKey="label"
            tick={{ fill: C.muted, fontSize: 10, fontFamily: C.mono }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            ticks={['12am', '6am', '12pm', '6pm']}
          />
          <YAxis
            tick={{ fill: C.muted, fontSize: 11, fontFamily: C.mono }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={<HourlyTooltipContent />}
            cursor={{ fill: 'rgba(255,255,255,0.025)' }}
          />
          <Bar dataKey="count" fill={C.amber} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
