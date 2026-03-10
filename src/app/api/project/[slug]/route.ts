import { NextResponse } from 'next/server'
import { queryProjectDetail } from '@/lib/db-project'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const project = decodeURIComponent(slug)

  if (!project || project.includes('\0')) {
    return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
  }

  const data = queryProjectDetail(project)

  if (!data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
