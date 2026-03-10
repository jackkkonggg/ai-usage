'use client'

import { C } from '@/lib/design-tokens'
import { fmt$, fmtTokens, shortModel, fmtSessionDate } from '@/lib/format'
import type { Session } from '@/lib/types'
import { SourceBadge } from '@/components/source-badge'
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

export function DaySessions({ sessions }: { sessions: Session[] }) {
  return (
    <TooltipProvider delayDuration={300}>
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '22px 24px',
        overflow: 'hidden',
      }}
    >
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
        Sessions
        <span style={{ marginLeft: 10, color: C.muted, fontWeight: 400 }}>
          ({sessions.length})
        </span>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 420 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Time', 'Source', 'Model', 'Turns', 'Tokens', 'Cost'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    paddingBottom: 10,
                    paddingRight: 12,
                    color: C.muted,
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    borderBottom: `1px solid ${C.border}`,
                    position: 'sticky',
                    top: 0,
                    background: C.surface,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((sess, i) => (
              <tr
                key={sess.sessionId}
                style={{
                  borderBottom: `1px solid ${i < sessions.length - 1 ? C.border : 'transparent'}`,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = C.surface2
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'top' }}>
                  <div
                    style={{ color: C.textDim, fontFamily: C.mono, fontSize: 12, whiteSpace: 'nowrap' }}
                  >
                    {fmtSessionDate(sess.date, sess.lastTimestamp)}
                  </div>
                  {sess.description && (
                    <TooltipRoot>
                      <TooltipTrigger asChild>
                        <div
                          style={{
                            color: C.muted,
                            fontSize: 11,
                            marginTop: 3,
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'default',
                          }}
                        >
                          {sess.description.length > 100
                            ? sess.description.slice(0, 100) + '…'
                            : sess.description}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{sess.description}</TooltipContent>
                    </TooltipRoot>
                  )}
                </td>
                <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'top' }}>
                  <SourceBadge source={sess.source} />
                </td>
                <td
                  style={{
                    padding: '10px 12px 10px 0',
                    color: C.text,
                    fontFamily: C.mono,
                    fontSize: 12,
                    verticalAlign: 'top',
                  }}
                >
                  {shortModel(sess.model)}
                </td>
                <td
                  style={{
                    padding: '10px 12px 10px 0',
                    color: C.textDim,
                    fontFamily: C.mono,
                    fontSize: 12,
                    verticalAlign: 'top',
                  }}
                >
                  {sess.turns}
                </td>
                <td
                  style={{
                    padding: '10px 12px 10px 0',
                    color: C.textDim,
                    fontFamily: C.mono,
                    fontSize: 12,
                    verticalAlign: 'top',
                  }}
                >
                  {fmtTokens(sess.tokens)}
                </td>
                <td
                  style={{
                    padding: '10px 0',
                    color: C.amber,
                    fontFamily: C.mono,
                    fontSize: 12,
                    fontWeight: 600,
                    verticalAlign: 'top',
                  }}
                >
                  {fmt$(sess.cost)}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '32px 0',
                    color: C.muted,
                    textAlign: 'center',
                    fontSize: 13,
                  }}
                >
                  No sessions
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </TooltipProvider>
  )
}
