import { NextResponse, NextRequest } from 'next/server'
import { queryDaily, forceSync } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('force') === 'true') forceSync()
  const raw = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10)
  const days = Math.min(90, Math.max(1, Number.isNaN(raw) ? 30 : raw))
  return NextResponse.json(queryDaily(days))
}
