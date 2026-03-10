import type { Metadata } from 'next'
import { queryProjectDetail } from '@/lib/db-project'
import ProjectDetail from './project-detail'
import { C } from '@/lib/design-tokens'

export const metadata: Metadata = {
  title: 'Project Detail',
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = decodeURIComponent(slug)

  if (!project || project.includes('\0')) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: C.muted,
          fontFamily: C.mono,
          fontSize: 14,
        }}
      >
        Invalid project
      </div>
    )
  }

  const data = queryProjectDetail(project)

  if (!data) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: C.muted,
          fontFamily: C.mono,
          fontSize: 14,
        }}
      >
        Project not found
      </div>
    )
  }

  return <ProjectDetail data={data} />
}
