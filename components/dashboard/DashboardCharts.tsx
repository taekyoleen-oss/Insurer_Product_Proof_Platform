'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8',
  in_progress: '#3B82F6',
  hold: '#F59E0B',
  completed: '#10B981',
}

interface StatusItem {
  status: string
  label: string
  count: number
}

interface MonthlyItem {
  month: string
  label: string
  count: number
}

interface DashboardChartsProps {
  statusCounts: StatusItem[]
  monthlyCompletion: MonthlyItem[]
  agencyActiveCounts: { agency_id: string; agency_name: string; count: number }[]
}

export function DashboardCharts({
  statusCounts,
  monthlyCompletion,
  agencyActiveCounts,
}: DashboardChartsProps) {
  const totalRequests = statusCounts.reduce((sum, s) => sum + s.count, 0)
  const activeOnly = statusCounts.filter((s) => s.count > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 상태별 건수 도넛 차트 */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-0 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-[#1E3A5F]">
            상태별 검증 건 현황
          </CardTitle>
          <p className="text-xs text-[#6B7280]">전체 {totalRequests}건</p>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-1">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={activeOnly.length > 0 ? activeOnly : statusCounts}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                dataKey="count"
                nameKey="label"
              >
                {(activeOnly.length > 0 ? activeOnly : statusCounts).map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#CBD5E1'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}건`, '']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 월별 완료 추이 */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-0 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-[#1E3A5F]">월별 완료 추이</CardTitle>
          <p className="text-xs text-[#6B7280]">최근 6개월 완료 건수</p>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-3">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyCompletion} barSize={26} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [`${value}건`, '완료']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              />
              <Bar dataKey="count" fill="#1E3A5F" radius={[4, 4, 0, 0]} name="완료" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 기관별 활성 건수 바 차트 */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-0 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-[#1E3A5F]">기관별 활성 건수</CardTitle>
          <p className="text-xs text-[#6B7280]">진행중 + 보류</p>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-3">
          {agencyActiveCounts.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-[#6B7280]">
              활성 건 없음
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={agencyActiveCounts.map((a) => ({
                  name: a.agency_name.length > 7 ? a.agency_name.slice(0, 7) + '…' : a.agency_name,
                  fullName: a.agency_name,
                  count: a.count,
                }))}
                layout="vertical"
                barSize={18}
                margin={{ top: 0, right: 20, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#374151' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={(value) => [`${value}건`, '활성']}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload?.fullName ?? _label
                  }
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="활성" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
