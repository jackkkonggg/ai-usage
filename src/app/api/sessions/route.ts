import { NextResponse, NextRequest } from 'next/server'
import { querySessions, forceSync } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('force') === 'true') forceSync()
  return NextResponse.json(querySessions())
}
