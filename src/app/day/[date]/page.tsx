import DayDetail from './day-detail'

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  return <DayDetail date={date} />
}
