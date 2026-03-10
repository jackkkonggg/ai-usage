'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { C } from '@/lib/design-tokens'
import { fmt$, fmtTokens, shortModel } from '@/lib/format'
import type { ModelStat } from '@/lib/types'

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

function ModelTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: { name: string; cost: number; tokens: number; turns: number } }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={tooltipBox}>
      <div style={{ color: C.text, marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: C.amber }}>{fmt$(d.cost)}</div>
      <div style={{ color: C.textDim }}>
        {fmtTokens(d.tokens)} tok · {d.turns} turns
      </div>
    </div>
  )
}

export function ModelBreakdownChart({ models }: { models: ModelStat[] }) {
  const chartData = models.map((m) => ({
    name: shortModel(m.model),
    cost: m.cost,
    tokens: m.tokens,
    turns: m.turns,
    source: m.source,
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
        Cost by Model
      </div>
      {chartData.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          No model data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200} style={{ outline: 'none' }}>
          <BarChart data={chartData} layout="vertical" barSize={16}>
            <CartesianGrid horizontal={false} stroke={C.border} />
            <XAxis
              type="number"
              tick={{ fill: C.muted, fontSize: 11, fontFamily: C.mono }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v === 0 ? '' : `$${v.toFixed(2)}`)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: C.textDim, fontSize: 12, fontFamily: C.mono }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip content={<ModelTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
            <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.source === 'claude' ? C.orange : C.emerald} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
