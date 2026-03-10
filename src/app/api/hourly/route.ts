import { NextResponse, NextRequest } from 'next/server'
import { getStatsCache, clearStatsCache } from '@/lib/stats-cache'

export const dynamic = 'force-dynamic'

const LABELS = [
  '12am',
  '1am',
  '2am',
  '3am',
  '4am',
  '5am',
  '6am',
  '7am',
  '8am',
  '9am',
  '10am',
  '11am',
  '12pm',
  '1pm',
  '2pm',
  '3pm',
  '4pm',
  '5pm',
  '6pm',
  '7pm',
  '8pm',
  '9pm',
  '10pm',
  '11pm',
]

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('force') === 'true') clearStatsCache()
  const sc = getStatsCache()
  const hourCounts = sc?.hourCounts ?? {}

  const data = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: LABELS[i],
    count: hourCounts[String(i)] ?? 0,
  }))

  return NextResponse.json(data)
}
