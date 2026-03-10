import { NextResponse } from 'next/server'
import { getStatsCache } from '@/lib/parser'

export const dynamic = 'force-dynamic'

const LABELS = ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a',
                '12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p']

export async function GET() {
  const sc = getStatsCache()
  const hourCounts = sc?.hourCounts ?? {}

  const data = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: LABELS[i],
    count: hourCounts[String(i)] ?? 0,
  }))

  return NextResponse.json(data)
}
