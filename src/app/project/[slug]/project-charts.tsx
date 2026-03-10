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
import { shortDate } from '@/lib/format'
import { ChartTooltip } from '@/components/chart-tooltip'
import type { ProjectDailyEntry } from '@/lib/types'

const panelStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '22px 24px',
}

export function DailyActivityChart({ daily }: { daily: ProjectDailyEntry[] }) {
  const chartData = daily.map((d) => ({
    date: shortDate(d.date),
    claude: d.claude,
    codex: d.codex,
  }))

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
        Daily Cost
      </div>
      {chartData.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          No daily data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200} style={{ outline: 'none' }}>
          <BarChart data={chartData} barSize={chartData.length > 30 ? 6 : 14}>
            <CartesianGrid vertical={false} stroke={C.border} />
            <XAxis
              dataKey="date"
              tick={{ fill: C.muted, fontSize: 10, fontFamily: C.mono }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: C.muted, fontSize: 11, fontFamily: C.mono }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => (v === 0 ? '' : `$${v.toFixed(2)}`)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
            <Bar dataKey="claude" stackId="cost" fill={C.orange} radius={[0, 0, 0, 0]} />
            <Bar dataKey="codex" stackId="cost" fill={C.emerald} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
