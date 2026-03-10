'use client'

import { C } from '@/lib/design-tokens'
import { fmt$, fmtTokens, shortModel, fmtSessionDate } from '@/lib/format'
import type { Session } from '@/lib/types'
import { SourceBadge } from '@/components/source-badge'

const HEADERS = ['Date', 'Source', 'Model', 'Turns', 'Tokens', 'Cost']

export function SessionsPanel({ sessions }: { sessions: Session[] }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '22px 28px',
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
        Recent Sessions
        <span style={{ marginLeft: 10, color: C.muted, fontWeight: 400 }}>
          ({Math.min(sessions.length, 50)} of {sessions.length})
        </span>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 420 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {HEADERS.map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    paddingBottom: 10,
                    paddingRight: 16,
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
            {sessions.slice(0, 50).map((sess, i) => (
              <tr
                key={sess.sessionId}
                style={{ borderBottom: `1px solid ${i < 49 ? C.border : 'transparent'}` }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = C.surface2
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <td
                  style={{
                    padding: '11px 16px 11px 0',
                    color: C.textDim,
                    fontFamily: C.mono,
                    fontSize: 12,
                  }}
                >
                  {fmtSessionDate(sess.date, sess.lastTimestamp)}
                </td>
                <td style={{ padding: '11px 16px 11px 0' }}>
                  <SourceBadge source={sess.source} />
                </td>
                <td
                  style={{
                    padding: '11px 16px 11px 0',
                    color: C.text,
                    fontFamily: C.mono,
                    fontSize: 12,
                  }}
                >
                  {shortModel(sess.model)}
                </td>
                <td
                  style={{
                    padding: '11px 16px 11px 0',
                    color: C.textDim,
                    fontFamily: C.mono,
                    fontSize: 12,
                  }}
                >
                  {sess.turns}
                </td>
                <td
                  style={{
                    padding: '11px 16px 11px 0',
                    color: C.textDim,
                    fontFamily: C.mono,
                    fontSize: 12,
                  }}
                >
                  {fmtTokens(sess.tokens)}
                </td>
                <td
                  style={{
                    padding: '11px 0',
                    color: C.amber,
                    fontFamily: C.mono,
                    fontSize: 12,
                    fontWeight: 600,
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
                  No sessions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
