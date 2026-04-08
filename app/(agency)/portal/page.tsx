import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getKpiForAgency, getRequestsForAgency } from '@/lib/supabase/queries/requests'
import { KPICard } from '@/components/shared/KPICard'
import { RequestCard } from '@/components/requests/RequestCard'
import { FileCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default async function AgencyPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: member } = await supabase
    .from('ippp_agency_members')
    .select('agency_id, name')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!member) redirect('/')

  const [kpi, requests] = await Promise.all([
    getKpiForAgency(member.agency_id),
    getRequestsForAgency(member.agency_id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1E3A5F]">포털 대시보드</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">담당 검증 건 현황을 확인하세요.</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="활성 검증 건"
          value={kpi.activeCount}
          icon={<FileCheck className="h-5 w-5" />}
          description="진행중 + 보류"
        />
        <KPICard
          title="D-7 마감 임박"
          value={kpi.dueSoonCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          description="7일 이내 마감"
        />
        <KPICard
          title="총 완료 건수"
          value={kpi.completedCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      {/* 담당 건 목록 */}
      <div className="space-y-3">
        <h2 className="font-semibold text-[#1E3A5F]">담당 검증 건</h2>
        {requests.length === 0 ? (
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-12 text-center text-[#6B7280] text-sm">
            배정된 검증 건이 없습니다.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} href={`/portal/requests/${r.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
