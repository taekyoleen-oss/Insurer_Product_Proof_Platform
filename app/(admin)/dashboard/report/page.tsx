import { Suspense } from 'react'
import { getReportForAdmin } from '@/lib/supabase/queries/requests'
import { AgencyPerformanceTable } from '@/components/dashboard/AgencyPerformanceTable'
import { ReportPeriodSelector } from '@/components/dashboard/ReportPeriodSelector'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReportPeriod } from '@/types'

interface SearchParams {
  period?: string
  start?: string
  end?: string
}

function resolveReportPeriod(params: SearchParams): ReportPeriod {
  const type = (params.period ?? 'month') as ReportPeriod['type']
  if (type === 'custom') {
    return { type: 'custom', start: params.start, end: params.end }
  }
  return { type }
}

async function ReportTable({ period }: { period: ReportPeriod }) {
  const data = await getReportForAdmin(period)
  return <AgencyPerformanceTable data={data} />
}

export default async function AdminReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const period = resolveReportPeriod(params)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1E3A5F]">기관별 실적 리포트</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">기간별 검증기관 실적을 집계합니다.</p>
      </div>

      <ReportPeriodSelector />

      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <ReportTable period={period} />
      </Suspense>
    </div>
  )
}
