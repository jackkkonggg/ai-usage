import { C } from '@/lib/design-tokens'
import { fmt$ } from '@/lib/format'

const tooltipBox = {
  background: C.surface2,
  border: `1px solid ${C.border2}`,
  borderRadius: 8,
  padding: '10px 14px',
  fontFamily: C.mono,
  fontSize: 12,
  lineHeight: 1.8,
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}

interface TooltipProps {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: string
}

export function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const c = payload.find((p) => p.dataKey === 'claude')?.value ?? 0
  const x = payload.find((p) => p.dataKey === 'codex')?.value ?? 0
  if (c + x === 0) return null
  return (
    <div style={tooltipBox}>
      <div style={{ color: C.textDim, marginBottom: 4, fontSize: 11 }}>{label}</div>
      {c > 0 && (
        <div style={{ color: C.orange }}>
          Claude <span style={{ float: 'right', marginLeft: 24 }}>{fmt$(c)}</span>
        </div>
      )}
      {x > 0 && (
        <div style={{ color: C.emerald }}>
          Codex <span style={{ float: 'right', marginLeft: 24 }}>{fmt$(x)}</span>
        </div>
      )}
      <div
        style={{ color: C.amber, borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 4 }}
      >
        Total <span style={{ float: 'right', marginLeft: 24 }}>{fmt$(c + x)}</span>
      </div>
    </div>
  )
}

export function ActivityTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const msgs = payload.find((p) => p.dataKey === 'messages')?.value ?? 0
  const tools = payload.find((p) => p.dataKey === 'toolCalls')?.value ?? 0
  const sess = payload.find((p) => p.dataKey === 'sessions')?.value ?? 0
  if (msgs + tools === 0) return null
  return (
    <div style={tooltipBox}>
      <div style={{ color: C.textDim, marginBottom: 4, fontSize: 11 }}>{label}</div>
      <div style={{ color: C.amber }}>
        Messages <span style={{ float: 'right', marginLeft: 24 }}>{msgs}</span>
      </div>
      <div style={{ color: C.orange }}>
        Tool Calls <span style={{ float: 'right', marginLeft: 24 }}>{tools}</span>
      </div>
      <div style={{ color: C.muted }}>
        Sessions <span style={{ float: 'right', marginLeft: 24 }}>{sess}</span>
      </div>
    </div>
  )
}

export function HourlyTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const count = payload[0]?.value ?? 0
  if (count === 0) return null
  return (
    <div
      style={{
        ...tooltipBox,
        lineHeight: 'normal',
        padding: '8px 12px',
      }}
    >
      <span style={{ color: C.textDim }}>{label}</span>
      <span style={{ color: C.amber, marginLeft: 12 }}>{count} sessions</span>
    </div>
  )
}
