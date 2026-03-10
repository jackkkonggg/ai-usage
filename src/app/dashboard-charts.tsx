'use client'

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { CategoricalChartFunc } from 'recharts/types/chart/types'
import { C } from '@/lib/design-tokens'
import { ChartTooltip, ActivityTooltip } from '@/components/chart-tooltip'

interface CostEntry {
  date: string
  rawDate: string
  claude: number
  codex: number
}

interface ActivityEntry {
  date: string
  messages: number
  toolCalls: number
  sessions: number
}

interface ChartLegendItem {
  color: string
  label: string
}

function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 14, justifyContent: 'flex-end' }}>
      {items.map((l) => (
        <div
          key={l.label}
          style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.textDim }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: l.color,
              display: 'inline-block',
            }}
          />
          {l.label}
        </div>
      ))}
    </div>
  )
}

export function DashboardCharts({
  costData,
  activityData,
  chartTab,
  onTabChange,
  range,
  onRangeChange,
  onChartClick,
}: {
  costData: CostEntry[]
  activityData: ActivityEntry[]
  chartTab: 'cost' | 'activity'
  onTabChange: (tab: 'cost' | 'activity') => void
  range: number
  onRangeChange: (days: number) => void
  onChartClick: CategoricalChartFunc
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '22px 28px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {(['cost', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                background: chartTab === tab ? C.surface3 : 'transparent',
                border: `1px solid ${chartTab === tab ? C.border2 : 'transparent'}`,
                color: chartTab === tab ? C.text : C.muted,
                padding: '5px 14px',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: C.sans,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {tab === 'cost' ? 'Cost' : 'Activity'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => onRangeChange(d)}
              style={{
                background: range === d ? C.surface3 : 'transparent',
                border: `1px solid ${range === d ? C.border2 : 'transparent'}`,
                color: range === d ? C.text : C.muted,
                padding: '4px 12px',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: C.sans,
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {chartTab === 'cost' ? (
        <>
          <ResponsiveContainer width="100%" height={180} style={{ outline: 'none' }}>
            <BarChart
              data={costData}
              barSize={range <= 7 ? 24 : range <= 30 ? 12 : 5}
              barGap={1}
              onClick={onChartClick}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid vertical={false} stroke={C.border} />
              <XAxis
                dataKey="date"
                tick={{ fill: C.muted, fontSize: 11, fontFamily: C.mono }}
                axisLine={false}
                tickLine={false}
                interval={costData.length <= 7 ? 0 : costData.length <= 30 ? 4 : 9}
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 11, fontFamily: C.mono }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v === 0 ? '' : `$${v.toFixed(2)}`)}
                width={58}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
              <Bar dataKey="claude" stackId="s" fill={C.orange} radius={[0, 0, 2, 2]} />
              <Bar dataKey="codex" stackId="s" fill={C.emerald} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend
            items={[
              { color: C.orange, label: 'Claude Code' },
              { color: C.emerald, label: 'OpenAI Codex' },
            ]}
          />
        </>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180} style={{ outline: 'none' }}>
            <AreaChart data={activityData}>
              <CartesianGrid vertical={false} stroke={C.border} />
              <XAxis
                dataKey="date"
                tick={{ fill: C.muted, fontSize: 11, fontFamily: C.mono }}
                axisLine={false}
                tickLine={false}
                interval={activityData.length <= 7 ? 0 : activityData.length <= 30 ? 4 : 9}
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 11, fontFamily: C.mono }}
                axisLine={false}
                tickLine={false}
                width={58}
              />
              <Tooltip content={<ActivityTooltip />} cursor={{ stroke: C.border2 }} />
              <Area
                type="monotone"
                dataKey="messages"
                stroke={C.amber}
                fill={C.amber}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="toolCalls"
                stroke={C.orange}
                fill={C.orange}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          <ChartLegend
            items={[
              { color: C.amber, label: 'Messages' },
              { color: C.orange, label: 'Tool Calls' },
            ]}
          />
        </>
      )}
    </div>
  )
}
