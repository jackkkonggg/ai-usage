import { NextResponse } from 'next/server'
import { querySessionDetail } from '@/lib/db-sessions'
import { readSessionMessages } from '@/lib/session-messages'
import type { SessionDetail } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  const result = querySessionDetail(sessionId)
  if (!result) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { filePath, project, turns } = result

  const messages = filePath
    ? readSessionMessages(filePath, turns[0]?.source ?? 'claude')
    : []

  const totalCost = turns.reduce((s, t) => s + t.costUsd, 0)
  const totalTokens = turns.reduce((s, t) => s + t.inputTokens + t.outputTokens, 0)
  const firstTurn = turns[0]
  const lastTurn = turns[turns.length - 1]

  const detail: SessionDetail = {
    sessionId,
    source: firstTurn?.source ?? 'claude',
    date: firstTurn
      ? new Date(firstTurn.timestamp).toISOString().slice(0, 10)
      : '',
    lastTimestamp: lastTurn?.timestamp,
    model: firstTurn?.model ?? 'unknown',
    cost: totalCost,
    tokens: totalTokens,
    turns: turns.length,
    filePath,
    project,
    messages,
  }

  return NextResponse.json(detail)
}
