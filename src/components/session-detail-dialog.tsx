'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { SourceBadge } from '@/components/source-badge'
import { C } from '@/lib/design-tokens'
import { fmt$, fmtTokens, shortModel, fmtSessionDate } from '@/lib/format'
import { MarkdownContent } from '@/components/markdown-content'
import type { SessionDetail, ConversationMessage, ToolCall } from '@/lib/types'

function formatMessageTime(ts: string): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: C.surface2,
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 12,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
      }}
    >
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: C.text, fontFamily: C.mono, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function CommandBubble({ message }: { message: ConversationMessage }) {
  const [cmd, ...lines] = message.content.split('\n')
  const output = lines.join('\n').trim()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '6px 10px',
        background: C.surface2,
        borderRadius: 6,
        borderLeft: `2px solid ${C.border}`,
        opacity: 0.75,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text, fontWeight: 600 }}>
          {cmd}
        </span>
        {output && (
          <div
            style={{
              fontSize: 11,
              color: C.textDim,
              fontFamily: C.mono,
              marginTop: 2,
              whiteSpace: 'pre-wrap',
            }}
          >
            {output}
          </div>
        )}
      </div>
      {message.timestamp && (
        <span style={{ fontSize: 10, color: C.muted, marginLeft: 'auto', flexShrink: 0, lineHeight: 1.8 }}>
          {formatMessageTime(message.timestamp)}
        </span>
      )}
    </div>
  )
}

const TOOL_ICON: Record<string, string> = {
  Bash: '⌨',
  Edit: '✏',
  Write: '📝',
  Read: '👁',
  Grep: '🔍',
  Glob: '📂',
  Agent: '🤖',
}

function ToolChip({ tool }: { tool: ToolCall }) {
  const icon = TOOL_ICON[tool.name] ?? '⚙'
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: `${C.amber}12`,
        border: `1px solid ${C.amber}30`,
        borderRadius: 4,
        padding: '2px 7px',
        fontSize: 11,
        color: C.amber,
        fontFamily: C.mono,
        maxWidth: 280,
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon} {tool.name}</span>
      {tool.summary && (
        <span
          style={{
            color: C.textDim,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {tool.summary}
        </span>
      )}
    </div>
  )
}

function MessageItem({ message }: { message: ConversationMessage }) {
  if (message.kind === 'command') return <CommandBubble message={message} />
  const isUser = message.role === 'user'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {message.content && (
        <div
          style={{
            background: isUser ? C.surface2 : C.surface3,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: C.text,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          <MarkdownContent content={message.content} />
        </div>
      )}
      {message.tools && message.tools.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 2 }}>
          {message.tools.map((t, i) => (
            <ToolChip key={i} tool={t} />
          ))}
        </div>
      )}
    </div>
  )
}

interface MessageGroup {
  role: 'user' | 'assistant'
  firstTimestamp: string
  messages: ConversationMessage[]
}

function groupMessages(messages: ConversationMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  for (const msg of messages) {
    const last = groups[groups.length - 1]
    if (last && last.role === msg.role) {
      last.messages.push(msg)
    } else {
      groups.push({ role: msg.role, firstTimestamp: msg.timestamp, messages: [msg] })
    }
  }
  return groups
}

function MessageGroupView({ group }: { group: MessageGroup }) {
  const isUser = group.role === 'user'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: C.muted }}>
        <span style={{ fontWeight: 600, color: isUser ? C.text : C.amber }}>
          {isUser ? 'You' : 'Assistant'}
        </span>
        {group.firstTimestamp && <span>{formatMessageTime(group.firstTimestamp)}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {group.messages.map((msg, i) => (
          <MessageItem key={i} message={msg} />
        ))}
      </div>
    </div>
  )
}

export function SessionDetailDialog({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SessionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !sessionId) return
    setLoading(true)
    setError(null)
    setData(null)

    fetch(`/api/sessions/${encodeURIComponent(sessionId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Session not found' : 'Failed to load')
        return res.json()
      })
      .then((d: SessionDetail) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [open, sessionId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          width: '90vw',
          maxWidth: 720,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        <DialogTitle style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
          Session Details
        </DialogTitle>

        {loading && (
          <div style={{ padding: 48, textAlign: 'center', color: C.textDim, fontSize: 14 }}>
            Loading session...
          </div>
        )}

        {error && (
          <div style={{ padding: 48, textAlign: 'center', color: '#ef4444', fontSize: 14 }}>
            {error}
          </div>
        )}

        {data && <SessionContent data={data} />}
      </DialogContent>
    </Dialog>
  )
}

function SessionContent({ data }: { data: SessionDetail }) {
  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <SourceBadge source={data.source} />
          <span style={{ color: C.text, fontFamily: C.mono, fontSize: 13, fontWeight: 600 }}>
            {shortModel(data.model)}
          </span>
          <span style={{ color: C.muted, fontSize: 12 }}>
            {fmtSessionDate(data.date, data.lastTimestamp)}
          </span>
          <span style={{ marginLeft: 'auto', color: C.muted, fontFamily: C.mono, fontSize: 11 }}>
            {data.sessionId}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <StatPill label="Cost" value={fmt$(data.cost)} />
          <StatPill label="Tokens" value={fmtTokens(data.tokens)} />
          <StatPill label="Turns" value={String(data.turns)} />
          <StatPill label="Messages" value={String(data.messages.length)} />
        </div>

        {data.project && (
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            {data.project}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {data.messages.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>
            No conversation messages found in the session file.
          </div>
        ) : (
          groupMessages(data.messages).map((group, i) => (
            <MessageGroupView key={i} group={group} />
          ))
        )}
      </div>
    </>
  )
}
