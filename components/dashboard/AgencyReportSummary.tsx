import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { KPICard } from '@/components/shared/KPICard'
import { CheckCircle2, Clock, BarChart2 } from 'lucide-react'
import { ReportPeriodSelector } from './ReportPeriodSelector'
import type { AgencyOwnReportRow, RequestStatus } from '@/types'

interface AgencyReportSummaryProps {
  data: AgencyOwnReportRow
}

export function AgencyReportSummary({ data }: AgencyReportSummaryProps) {
  return (
    <div className="space-y-6">
      <ReportPeriodSelector />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="전체 건수"
          value={data.total}
          icon={<BarChart2 className="h-5 w-5" />}
        />
        <KPICard
          title="완료 건수"
          value={data.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          description={`완료율 ${data.completionRate.toFixed(0)}%`}
        />
        <KPICard
          title="평균 소요일"
          value={data.avgDays !== null ? `${data.avgDays.toFixed(1)}일` : '-'}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {data.requests.length > 0 && (
        <Card className="border-[#E5E7EB]">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>검증 건 제목</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-center">진행 시작일</TableHead>
                  <TableHead className="text-center">완료일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.requests.map((r) => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={r.status as RequestStatus} />
                    </TableCell>
                    <TableCell className="text-center text-sm text-[#6B7280]">
                      {r.in_progress_at
                        ? new Date(r.in_progress_at).toLocaleDateString('ko-KR')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center text-sm text-[#6B7280]">
                      {r.archive_at
                        ? new Date(r.archive_at).toLocaleDateString('ko-KR')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
