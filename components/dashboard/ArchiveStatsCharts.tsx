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
import type { RequestWithAgency } from '@/types'

interface ArchiveStatsChartsProps {
  requests: RequestWithAgency[]
}

const COLORS = ['#1E3A5F', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export function ArchiveStatsCharts({ requests }: ArchiveStatsChartsProps) {
  // 월별 완료 트렌드 (최근 12개월)
  const monthlyData = (() => {
    const now = new Date()
    const months: { month: string; count: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        month: `${d.getFullYear().toString().slice(2)}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        count: 0,
      })
    }
    requests.forEach((r) => {
      if (!r.archive_at) return
      const d = new Date(r.archive_at)
      const label = `${d.getFullYear().toString().slice(2)}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = months.find((m) => m.month === label)
      if (entry) entry.count++
    })
    return months
  })()

  // 유형 분포 (위험률 vs 상품)
  const typeData = (() => {
    let hazard = 0
    let product = 0
    requests.forEach((r) => {
      if (r.type === 'hazard_rate') hazard++
      else product++
    })
    return [
      { name: '위험률 검증', value: hazard },
      { name: '상품 검증', value: product },
    ].filter((d) => d.value > 0)
  })()

  // 기관별 완료 건수
  const agencyData = (() => {
    const map = new Map<string, number>()
    requests.forEach((r) => {
      const name = r.agency?.name ?? '알 수 없음'
      map.set(name, (map.get(name) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([agency, count]) => ({ agency, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  })()

  if (requests.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 월별 완료 트렌드 */}
      <Card className="lg:col-span-2 border-[#E5E7EB]">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-[#1E3A5F]">월별 완료 트렌드 (최근 12개월)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB' }}
                formatter={(v) => [`${v}건`, '완료']}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 유형 분포 */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-[#1E3A5F]">검증 유형 분포</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4 flex items-center justify-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {typeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ fontSize: 11, color: '#6B7280' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 기관별 완료 건수 */}
      {agencyData.length > 0 && (
        <Card className="lg:col-span-3 border-[#E5E7EB]">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-[#1E3A5F]">기관별 완료 건수</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={agencyData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="agency"
                  width={90}
                  tick={{ fontSize: 11, fill: '#374151' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB' }}
                  formatter={(v) => [`${v}건`, '완료']}
                />
                <Bar dataKey="count" fill="#10B981" radius={[0, 3, 3, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
