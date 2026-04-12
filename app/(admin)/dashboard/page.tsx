import {
  getKpiForAdmin,
  getRequestsForAdmin,
  getActiveRequestsForPopup,
  getDueSoonRequestsForPopup,
  getCompletedThisMonthForPopup,
  getAdminChartData,
} from '@/lib/supabase/queries/requests'
import { RequestCard } from '@/components/requests/RequestCard'
import { DashboardKPICards } from '@/components/dashboard/DashboardKPICards'
import { AgencyActiveList } from '@/components/dashboard/AgencyActiveList'
import { DashboardChartsWrapper } from '@/components/dashboard/DashboardChartsWrapper'

export default async function AdminDashboardPage() {
  const [kpi, recentRequests, activeRequests, dueSoonRequests, completedThisMonth, chartData] =
    await Promise.all([
      getKpiForAdmin(),
      getRequestsForAdmin({ status: 'in_progress' }),
      getActiveRequestsForPopup(),
      getDueSoonRequestsForPopup(),
      getCompletedThisMonthForPopup(),
      getAdminChartData(),
    ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1E3A5F]">대시보드</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">전체 검증 현황을 한눈에 확인하세요.</p>
      </div>

      {/* KPI 카드 (클릭 → 팝업) */}
      <DashboardKPICards
        kpi={kpi}
        activeRequests={activeRequests}
        dueSoonRequests={dueSoonRequests}
        completedThisMonth={completedThisMonth}
      />

      {/* 차트 섹션 */}
      <DashboardChartsWrapper
        statusCounts={chartData.statusCounts}
        monthlyCompletion={chartData.monthlyCompletion}
        agencyActiveCounts={kpi.agencyActiveCounts}
      />

      {/* 최근 진행중 건 + 기관별 활성 목록 */}
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
                <RequestCard key={r.id} request={r} href={`/dashboard/requests/${r.id}`} />
              ))}
            </div>
          )}
        </div>

        {/* 기관별 활성 건수 (클릭 → 팝업) */}
        <div className="space-y-3">
          <h2 className="font-semibold text-[#1E3A5F]">기관별 활성 건수</h2>
          <AgencyActiveList
            agencyActiveCounts={kpi.agencyActiveCounts}
            activeRequests={activeRequests}
          />
        </div>
      </div>
    </div>
  )
}
