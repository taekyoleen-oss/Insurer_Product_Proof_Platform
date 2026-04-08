import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getReportForAgency } from '@/lib/supabase/queries/requests'
import { AgencyReportSummary } from '@/components/dashboard/AgencyReportSummary'
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

export default async function AgencyReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: member } = await supabase
    .from('ippp_agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!member) redirect('/')

  const params = await searchParams
  const period = resolveReportPeriod(params)
  const data = await getReportForAgency(member.agency_id, period)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1E3A5F]">실적 조회</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">기간별 검증 건 실적을 확인하세요.</p>
      </div>

      <AgencyReportSummary data={data} />
    </div>
  )
}
