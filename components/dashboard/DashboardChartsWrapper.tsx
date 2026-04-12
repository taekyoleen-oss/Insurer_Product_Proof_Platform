'use client'

import dynamic from 'next/dynamic'

const DashboardCharts = dynamic(
  () => import('./DashboardCharts').then((m) => m.DashboardCharts),
  { ssr: false, loading: () => <div className="h-[232px]" /> }
)

interface Props {
  statusCounts: { status: string; label: string; count: number }[]
  monthlyCompletion: { month: string; label: string; count: number }[]
  agencyActiveCounts: { agency_id: string; agency_name: string; count: number }[]
}

export function DashboardChartsWrapper(props: Props) {
  return <DashboardCharts {...props} />
}
