'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { C } from '@/lib/design-tokens'
import { fmt$, fmtTokens, shortModel } from '@/lib/format'
import type { ModelStat, HourlyEntry, ProjectStat } from '@/lib/types'
import { HourlyTooltip } from '@/components/chart-tooltip'

const sectionHeader: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: C.textDim,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

const panelStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '22px 24px',
}

export function HourlyPanel({ hourly }: { hourly: HourlyEntry[] }) {
  return (
    <div style={panelStyle}>
      <div style={{ ...sectionHeader, marginBottom: 18 }}>Activity by Hour</div>
      <ResponsiveContainer width="100%" height={120} style={{ outline: 'none' }}>
        <BarChart data={hourly} barSize={8}>
          <XAxis
            dataKey="label"
            tick={{ fill: C.muted, fontSize: 10, fontFamily: C.mono }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            ticks={['12a', '6a', '12p', '6p']}
          />
          <YAxis hide />
          <Tooltip content={<HourlyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
          <Bar dataKey="count" fill={C.amber} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProjectsPanel({ projects }: { projects: ProjectStat[] }) {
  const maxMsgs = projects[0]?.messageCount || 1

  return (
    <div style={panelStyle}>
      <div style={{ ...sectionHeader, marginBottom: 22 }}>By Project</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {projects.slice(0, 8).map((p) => {
          const pct = (p.messageCount / maxMsgs) * 100
          return (
            <div key={p.project}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 8, color: C.amber, lineHeight: 1 }}>●</span>
                  <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>
                    {p.displayName}
                  </span>
                </div>
                <span
                  style={{ fontSize: 13, fontFamily: C.mono, color: C.amber, fontWeight: 600 }}
                >
                  {fmtTokens(p.messageCount)}
                </span>
              </div>
              <div
                style={{
                  height: 3,
                  background: C.border,
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: C.amber,
                    borderRadius: 2,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
                {p.sessionCount} sessions · {p.lastActive}
              </div>
            </div>
          )
        })}
        {projects.length === 0 && (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No project data found
          </div>
        )}
      </div>
    </div>
  )
}

export function ModelsPanel({ models }: { models: ModelStat[] }) {
  const maxCost = models[0]?.cost || 1

  return (
    <div style={panelStyle}>
      <div style={{ ...sectionHeader, marginBottom: 22 }}>By Model</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {models.map((m) => {
          const pct = (m.cost / maxCost) * 100
          const color = m.source === 'claude' ? C.orange : C.emerald
          return (
            <div key={m.model}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 8, color, lineHeight: 1 }}>●</span>
                  <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>
                    {shortModel(m.model)}
                  </span>
                </div>
                <span
                  style={{ fontSize: 13, fontFamily: C.mono, color: C.amber, fontWeight: 600 }}
                >
                  {fmt$(m.cost)}
                </span>
              </div>
              <div
                style={{
                  height: 3,
                  background: C.border,
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: color,
                    borderRadius: 2,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
                {fmtTokens(m.tokens)} tokens · {m.turns} turns
              </div>
            </div>
          )
        })}
        {models.length === 0 && (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No model data found
          </div>
        )}
      </div>
    </div>
  )
}
