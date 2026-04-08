import { createClient } from '@/lib/supabase/server'
import { getKpiForAdmin, getRequestsForAdmin } from '@/lib/supabase/queries/requests'
import { KPICard } from '@/components/shared/KPICard'
import { RequestCard } from '@/components/requests/RequestCard'
import { AgencyAvatar } from '@/components/shared/AgencyAvatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const [kpi, recentRequests] = await Promise.all([
    getKpiForAdmin(),
    getRequestsForAdmin({ status: 'in_progress' }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1E3A5F]">대시보드</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">전체 검증 현황을 한눈에 확인하세요.</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="전체 활성 건수"
          value={kpi.totalActive}
          icon={<FileCheck className="h-5 w-5" />}
          description="진행중 + 보류"
        />
        <KPICard
          title="이번 달 완료"
          value={kpi.completedThisMonth}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KPICard
          title="D-7 마감 임박"
          value={kpi.dueSoonCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          description="7일 이내 마감"
        />
        <KPICard
          title="참여 기관 수"
          value={kpi.agencyActiveCounts.length}
          icon={<Building2 className="h-5 w-5" />}
          description="활성 건 보유 기관"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 최근 진행중 건 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-[#1E3A5F]">최근 진행중 검증 건</h2>
          {recentRequests.length === 0 ? (
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-8 text-center text-[#6B7280] text-sm">
              진행중인 검증 건이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {recentRequests.slice(0, 8).map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  href={`/dashboard/requests/${r.id}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* 기관별 활성 건 수 */}
        <div className="space-y-3">
          <h2 className="font-semibold text-[#1E3A5F]">기관별 활성 건수</h2>
          <Card className="border-[#E5E7EB]">
            <CardContent className="p-0">
              {kpi.agencyActiveCounts.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#6B7280]">
                  활성 건을 보유한 기관이 없습니다.
                </div>
              ) : (
                <ul className="divide-y divide-[#E5E7EB]">
                  {kpi.agencyActiveCounts.map((a) => (
                    <li key={a.agency_id} className="flex items-center gap-3 px-4 py-3">
                      <AgencyAvatar name={a.agency_name} size="sm" />
                      <span className="flex-1 text-sm font-medium truncate">{a.agency_name}</span>
                      <span className="text-sm font-bold text-[#1E3A5F]">{a.count}건</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
