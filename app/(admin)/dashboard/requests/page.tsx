import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRequestsForAdmin } from '@/lib/supabase/queries/requests'
import { RequestCard } from '@/components/requests/RequestCard'
import { FilterBar } from '@/components/requests/FilterBar'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { RequestFilters } from '@/types'

interface SearchParams {
  status?: string
  agency_id?: string
  fiscal_year?: string
  keyword?: string
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const filters: RequestFilters = {}
  if (params.status && params.status !== 'all') {
    filters.status = params.status as RequestFilters['status']
  }
  if (params.agency_id && params.agency_id !== 'all') filters.agency_id = params.agency_id
  if (params.fiscal_year && params.fiscal_year !== 'all') filters.fiscal_year = parseInt(params.fiscal_year)
  if (params.keyword) filters.keyword = params.keyword

  const [requests, { data: agencies }] = await Promise.all([
    getRequestsForAdmin(filters),
    supabase.from('ippp_agencies').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E3A5F]">검증 건 목록</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">전체 {requests.length}건</p>
        </div>
        <Button asChild className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white">
          <Link href="/dashboard/requests/new">
            <Plus className="h-4 w-4 mr-1.5" />새 검증 건
          </Link>
        </Button>
      </div>

      <FilterBar agencies={agencies ?? []} showStatus showFiscalYear />

      {requests.length === 0 ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-12 text-center space-y-2">
          <p className="text-[#6B7280]">검색 조건에 맞는 검증 건이 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} href={`/dashboard/requests/${r.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
