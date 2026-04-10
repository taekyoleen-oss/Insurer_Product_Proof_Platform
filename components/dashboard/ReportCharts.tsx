'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AgencyReportRow } from '@/types'

interface ReportChartsProps {
  data: AgencyReportRow[]
}

type CompletionEntry = {
  agency: string
  fullName: string
  완료율: number
  총건수: number
  완료건: number
}

type AvgDaysEntry = {
  agency: string
  fullName: string
  평균소요일: number
}

export function ReportCharts({ data }: ReportChartsProps) {
  if (data.length === 0) return null

  const completionData: CompletionEntry[] = [...data]
    .sort((a, b) => b.completionRate - a.completionRate)
    .map((r) => ({
      agency: r.agency_name.length > 8 ? r.agency_name.slice(0, 8) + '…' : r.agency_name,
      fullName: r.agency_name,
      완료율: r.completionRate,
      총건수: r.total,
      완료건: r.completed,
    }))

  const avgDaysData: AvgDaysEntry[] = [...data]
    .filter((r) => r.avgDays !== null)
    .sort((a, b) => (a.avgDays ?? 0) - (b.avgDays ?? 0))
    .map((r) => ({
      agency: r.agency_name.length > 8 ? r.agency_name.slice(0, 8) + '…' : r.agency_name,
      fullName: r.agency_name,
      평균소요일: r.avgDays ?? 0,
    }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 기관별 완료율 */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-[#1E3A5F]">기관별 완료율 (%)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={completionData} margin={{ top: 4, right: 8, left: -20, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="agency"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB' }}
                formatter={(value, _name, props) => {
                  const entry = props.payload as CompletionEntry | undefined
                  return [`${value}% (${entry?.완료건}/${entry?.총건수}건)`, entry?.fullName ?? '완료율']
                }}
                labelFormatter={() => ''}
              />
              <Bar dataKey="완료율" radius={[3, 3, 0, 0]} maxBarSize={40}>
                {completionData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.완료율 >= 80 ? '#10B981' : entry.완료율 >= 50 ? '#3B82F6' : '#F59E0B'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 기관별 평균 소요일 */}
      {avgDaysData.length > 0 ? (
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-[#1E3A5F]">기관별 평균 소요일</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={avgDaysData} margin={{ top: 4, right: 8, left: -20, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="agency"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  unit="일"
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB' }}
                  formatter={(value, _name, props) => {
                    const entry = props.payload as AvgDaysEntry | undefined
                    return [`${value}일`, entry?.fullName ?? '평균소요일']
                  }}
                  labelFormatter={() => ''}
                />
                <Bar dataKey="평균소요일" fill="#8B5CF6" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#E5E7EB] flex items-center justify-center">
          <p className="text-sm text-[#6B7280] py-8">완료 건이 없어 소요일 차트를 표시할 수 없습니다.</p>
        </Card>
      )}
    </div>
  )
}
