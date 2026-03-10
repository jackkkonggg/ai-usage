import type { Metadata } from 'next'
import { queryDayDetail } from '@/lib/db'
import DayDetail from './day-detail'

export const metadata: Metadata = {
  title: 'Day Detail',
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Invalid date format</p>
      </div>
    )
  }
  const data = queryDayDetail(date)
  return <DayDetail date={date} data={data} />
}
