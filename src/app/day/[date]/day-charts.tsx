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
import type { ModelStat, HourlyEntry, DaySummary } from '@/lib/types'

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

const sectionHeader: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: C.textDim,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 18,
}

const panelStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '22px 24px',
}

// ─── Model Breakdown Chart ────────────────────────────────────────────────────

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
      <div style={sectionHeader}>Cost by Model</div>
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
      <div style={sectionHeader}>Activity by Hour</div>
      <ResponsiveContainer width="100%" height={200} style={{ outline: 'none' }}>
        <BarChart data={hourly} barSize={10}>
          <CartesianGrid vertical={false} stroke={C.border} />
          <XAxis
            dataKey="label"
            tick={{ fill: C.muted, fontSize: 10, fontFamily: C.mono }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            ticks={['12a', '6a', '12p', '6p']}
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

// ─── Token Breakdown Chart ────────────────────────────────────────────────────

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
