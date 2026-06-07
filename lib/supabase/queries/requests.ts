import { createClient } from '@/lib/supabase/server'
import {
  resolvePeriodRange,
  dueSoonWindow,
  averageDays,
  completionRate,
} from '@/lib/domain/requests'
import type {
  RequestFilters,
  ArchiveFilters,
  ReportPeriod,
  AdminKpi,
  AgencyKpi,
  AgencyReportRow,
  AgencyOwnReportRow,
  RequestWithAgency,
  Request,
} from '@/types'

// ─── 관리자용 전체 건 목록 ─────────────────────────────────────────────────

export async function getRequestsForAdmin(
  filters: RequestFilters = {}
): Promise<RequestWithAgency[]> {
  const supabase = await createClient()

  let query = supabase
    .from('ippp_requests')
    .select('*, agency:ippp_agencies(id, name, is_active)')
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.agency_id) {
    query = query.eq('agency_id', filters.agency_id)
  }
  if (filters.keyword) {
    query = query.ilike('title', `%${filters.keyword}%`)
  }
  if (filters.fiscal_year) {
    query = query.eq('fiscal_year', filters.fiscal_year)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as unknown as RequestWithAgency[]
}

// ─── 대시보드 팝업용 조회 ────────────────────────────────────────────────

export async function getActiveRequestsForPopup(): Promise<RequestWithAgency[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ippp_requests')
    .select('*, agency:ippp_agencies(id, name, is_active)')
    .in('status', ['in_progress', 'hold'])
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []) as unknown as RequestWithAgency[]
}

export async function getDueSoonRequestsForPopup(): Promise<RequestWithAgency[]> {
  const supabase = await createClient()

  const { today, until: sevenDaysLater } = dueSoonWindow(new Date())

  const { data, error } = await supabase
    .from('ippp_requests')
    .select('*, agency:ippp_agencies(id, name, is_active)')
    .neq('status', 'completed')
    .gte('due_date', today)
    .lte('due_date', sevenDaysLater)
    .order('due_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as RequestWithAgency[]
}

export async function getCompletedThisMonthForPopup(): Promise<RequestWithAgency[]> {
  const supabase = await createClient()

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data, error } = await supabase
    .from('ippp_requests')
    .select('*, agency:ippp_agencies(id, name, is_active)')
    .eq('status', 'completed')
    .gte('archive_at', firstDayOfMonth)
    .order('archive_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as RequestWithAgency[]
}

// ─── 기관용 건 목록 (draft 제외) ──────────────────────────────────────────

export async function getRequestsForAgency(agencyId: string): Promise<RequestWithAgency[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ippp_requests')
    .select('*, agency:ippp_agencies(id, name, is_active)')
    .eq('agency_id', agencyId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as RequestWithAgency[]
}

// ─── 단건 상세 ──────────────────────────────────────────────────────────

export async function getRequestById(id: string): Promise<RequestWithAgency | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ippp_requests')
    .select('*, agency:ippp_agencies(id, name, is_active)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }

  return data as unknown as RequestWithAgency
}

// ─── 관리자 KPI ─────────────────────────────────────────────────────────

export async function getKpiForAdmin(): Promise<AdminKpi> {
  const supabase = await createClient()

  // 전체 활성 건수 (in_progress + hold)
  const { count: totalActive, error: activeError } = await supabase
    .from('ippp_requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['in_progress', 'hold'])

  if (activeError) throw activeError

  // 이번 달 완료 건수
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: completedThisMonth, error: completedError } = await supabase
    .from('ippp_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('archive_at', firstDayOfMonth)

  if (completedError) throw completedError

  // D-7 마감 임박 건수 (오늘 이후 7일 이내 due_date, 완료 제외)
  const { today, until: sevenDaysLater } = dueSoonWindow(new Date())

  const { count: dueSoonCount, error: dueSoonError } = await supabase
    .from('ippp_requests')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'completed')
    .gte('due_date', today)
    .lte('due_date', sevenDaysLater)

  if (dueSoonError) throw dueSoonError

  // 기관별 활성 건수
  const { data: agencyData, error: agencyError } = await supabase
    .from('ippp_requests')
    .select('agency_id, agency:ippp_agencies(id, name)')
    .in('status', ['in_progress', 'hold'])

  if (agencyError) throw agencyError

  // 집계
  const agencyMap = new Map<string, { agency_id: string; agency_name: string; count: number }>()
  ;(agencyData ?? []).forEach((row: unknown) => {
    const r = row as { agency_id: string; agency: { id: string; name: string } | null }
    if (!r.agency_id) return
    const existing = agencyMap.get(r.agency_id)
    if (existing) {
      existing.count++
    } else {
      agencyMap.set(r.agency_id, {
        agency_id: r.agency_id,
        agency_name: r.agency?.name ?? '알 수 없음',
        count: 1,
      })
    }
  })

  return {
    totalActive: totalActive ?? 0,
    completedThisMonth: completedThisMonth ?? 0,
    dueSoonCount: dueSoonCount ?? 0,
    agencyActiveCounts: Array.from(agencyMap.values()),
  }
}

// ─── 대시보드 차트 데이터 ────────────────────────────────────────────────

export async function getAdminChartData() {
  const supabase = await createClient()

  // 상태별 건수
  const { data: statusData, error: statusError } = await supabase
    .from('ippp_requests')
    .select('status')

  if (statusError) throw statusError

  const statusCounts: Record<string, number> = { draft: 0, in_progress: 0, hold: 0, completed: 0 }
  ;(statusData ?? []).forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
  })

  // 월별 완료 추이 (최근 6개월)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  const { data: monthlyData, error: monthlyError } = await supabase
    .from('ippp_requests')
    .select('archive_at')
    .eq('status', 'completed')
    .gte('archive_at', sixMonthsAgo.toISOString())

  if (monthlyError) throw monthlyError

  const monthMap = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, 0)
  }
  ;(monthlyData ?? []).forEach((r) => {
    if (!r.archive_at) return
    const d = new Date(r.archive_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
  })

  return {
    statusCounts: [
      { status: 'draft', label: '초안', count: statusCounts.draft },
      { status: 'in_progress', label: '진행중', count: statusCounts.in_progress },
      { status: 'hold', label: '보류', count: statusCounts.hold },
      { status: 'completed', label: '완료', count: statusCounts.completed },
    ],
    monthlyCompletion: Array.from(monthMap.entries()).map(([month, count]) => ({
      month,
      label: `${parseInt(month.slice(5))}월`,
      count,
    })),
  }
}

// ─── 기관 KPI ───────────────────────────────────────────────────────────

export async function getKpiForAgency(agencyId: string): Promise<AgencyKpi> {
  const supabase = await createClient()

  // 활성 건수
  const { count: activeCount, error: activeError } = await supabase
    .from('ippp_requests')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .in('status', ['in_progress', 'hold'])

  if (activeError) throw activeError

  // D-7 마감 임박
  const { today, until: sevenDaysLater } = dueSoonWindow(new Date())

  const { count: dueSoonCount, error: dueSoonError } = await supabase
    .from('ippp_requests')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .neq('status', 'completed')
    .gte('due_date', today)
    .lte('due_date', sevenDaysLater)

  if (dueSoonError) throw dueSoonError

  // 완료 건수
  const { count: completedCount, error: completedError } = await supabase
    .from('ippp_requests')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('status', 'completed')

  if (completedError) throw completedError

  return {
    activeCount: activeCount ?? 0,
    dueSoonCount: dueSoonCount ?? 0,
    completedCount: completedCount ?? 0,
  }
}

// ─── 아카이브 조회 ─────────────────────────────────────────────────────

export async function getArchive(filters: ArchiveFilters = {}): Promise<RequestWithAgency[]> {
  const supabase = await createClient()

  let query = supabase
    .from('ippp_requests')
    .select('*, agency:ippp_agencies(id, name, is_active)')
    .eq('status', 'completed')
    .order('archive_at', { ascending: false })

  if (filters.keyword) {
    query = query.ilike('title', `%${filters.keyword}%`)
  }
  if (filters.agency_id) {
    query = query.eq('agency_id', filters.agency_id)
  }
  if (filters.fiscal_year) {
    query = query.eq('fiscal_year', filters.fiscal_year)
  }
  if (filters.product_type) {
    query = query.eq('product_type', filters.product_type)
  }
  if (filters.hazard_type && filters.hazard_type.length > 0) {
    query = query.overlaps('hazard_type', filters.hazard_type)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as unknown as RequestWithAgency[]
}

// ─── 관리자 리포트 (기관별 집계) ──────────────────────────────────────
// 기간 범위 계산은 lib/domain/requests.ts(resolvePeriodRange)로 추출 — 앱·하네스 공유.

export async function getReportForAdmin(period: ReportPeriod): Promise<AgencyReportRow[]> {
  const supabase = await createClient()
  const { start, end } = resolvePeriodRange(period)

  const { data, error } = await supabase
    .from('ippp_requests')
    .select('agency_id, status, in_progress_at, archive_at, agency:ippp_agencies(id, name)')
    .gte('created_at', start)
    .lte('created_at', end)
    .neq('status', 'draft')

  if (error) throw error

  type Row = {
    agency_id: string
    status: string
    in_progress_at: string | null
    archive_at: string | null
    agency: { id: string; name: string } | null
  }

  // 기관별 원시 행 그룹화 → 집계는 도메인 헬퍼(averageDays/completionRate)로 계산
  const agencyMap = new Map<string, { agency_name: string; rows: Row[] }>()

  ;(data ?? []).forEach((row: unknown) => {
    const r = row as Row
    if (!r.agency_id) return
    const entry = agencyMap.get(r.agency_id) ?? {
      agency_name: r.agency?.name ?? '알 수 없음',
      rows: [],
    }
    entry.rows.push(r)
    agencyMap.set(r.agency_id, entry)
  })

  return Array.from(agencyMap.entries()).map(([agency_id, entry]) => {
    const total = entry.rows.length
    const completed = entry.rows.filter((r) => r.status === 'completed').length
    return {
      agency_id,
      agency_name: entry.agency_name,
      total,
      completed,
      completionRate: completionRate(total, completed),
      avgDays: averageDays(entry.rows),
    }
  })
}

// ─── 기관 자신 리포트 ─────────────────────────────────────────────────

export async function getReportForAgency(
  agencyId: string,
  period: ReportPeriod
): Promise<AgencyOwnReportRow> {
  const supabase = await createClient()
  const { start, end } = resolvePeriodRange(period)

  const { data, error } = await supabase
    .from('ippp_requests')
    .select('id, title, status, in_progress_at, archive_at')
    .eq('agency_id', agencyId)
    .neq('status', 'draft')
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) throw error

  const rows = data ?? []
  const completed = rows.filter((r) => r.status === 'completed')

  return {
    total: rows.length,
    completed: completed.length,
    completionRate: completionRate(rows.length, completed.length),
    avgDays: averageDays(rows),
    requests: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      in_progress_at: r.in_progress_at,
      archive_at: r.archive_at,
    })) as Request[],
  }
}
