import { createClient } from '@/lib/supabase/server'
import { getArchive } from '@/lib/supabase/queries/requests'
import { FilterBar } from '@/components/requests/FilterBar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AgencyAvatar } from '@/components/shared/AgencyAvatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Archive } from 'lucide-react'
import type { ArchiveFilters, RequestStatus } from '@/types'

interface SearchParams {
  status?: string
  agency_id?: string
  fiscal_year?: string
  keyword?: string
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const filters: ArchiveFilters = {}
  if (params.agency_id && params.agency_id !== 'all') filters.agency_id = params.agency_id
  if (params.fiscal_year && params.fiscal_year !== 'all') filters.fiscal_year = parseInt(params.fiscal_year)
  if (params.keyword) filters.keyword = params.keyword

  const [requests, { data: agencies }] = await Promise.all([
    getArchive(filters),
    supabase.from('ippp_agencies').select('id, name').order('name'),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Archive className="h-5 w-5 text-[#1E3A5F]" />
        <div>
          <h1 className="text-xl font-bold text-[#1E3A5F]">검증 DB 아카이브</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">완료된 검증 건 목록 — 전체 {requests.length}건</p>
        </div>
      </div>

      <FilterBar agencies={agencies ?? []} showStatus={false} showFiscalYear />

      <Card className="border-[#E5E7EB]">
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="py-12 text-center text-[#6B7280] text-sm">
              검색 조건에 맞는 아카이브가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>기관</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>연도</TableHead>
                  <TableHead>완료일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium max-w-[200px] truncate">{r.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <AgencyAvatar name={(r as { agency?: { name: string } }).agency?.name ?? ''} size="sm" />
                        <span className="text-sm">{(r as { agency?: { name: string } }).agency?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-[#6B7280]">
                        {r.type === 'hazard_rate' ? '위험률' : '상품'}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status as RequestStatus} /></TableCell>
                    <TableCell className="text-sm text-[#6B7280]">{r.fiscal_year ?? '-'}년</TableCell>
                    <TableCell className="text-sm text-[#6B7280]">
                      {r.archive_at ? new Date(r.archive_at).toLocaleDateString('ko-KR') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
