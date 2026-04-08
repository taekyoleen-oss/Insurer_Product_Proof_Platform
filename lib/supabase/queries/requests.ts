import { createClient } from '@/lib/supabase/server'
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
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

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
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

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

// ─── 기간 범위 계산 헬퍼 ──────────────────────────────────────────────

function resolvePeriodRange(period: ReportPeriod): { start: string; end: string } {
  const now = new Date()

  if (period.type === 'custom') {
    if (!period.start || !period.end) {
      throw new Error('custom 기간 타입에는 start, end가 필요합니다.')
    }
    return { start: period.start, end: period.end }
  }

  if (period.type === 'last12months') {
    const end = now.toISOString()
    const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString()
    return { start, end }
  }

  if (period.type === 'year') {
    const start = new Date(now.getFullYear(), 0, 1).toISOString()
    const end = now.toISOString()
    return { start, end }
  }

  if (period.type === 'half') {
    const halfStart = now.getMonth() < 6 ? 0 : 6
    const start = new Date(now.getFullYear(), halfStart, 1).toISOString()
    const end = now.toISOString()
    return { start, end }
  }

  if (period.type === 'quarter') {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3
    const start = new Date(now.getFullYear(), quarterStart, 1).toISOString()
    const end = now.toISOString()
    return { start, end }
  }

  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end = now.toISOString()
  return { start, end }
}

// ─── 관리자 리포트 (기관별 집계) ──────────────────────────────────────

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

  // 기관별 집계
  const agencyMap = new Map<
    string,
    { agency_name: string; total: number; completed: number; totalDays: number; completedWithDays: number }
  >()

  ;(data ?? []).forEach((row: unknown) => {
    const r = row as {
      agency_id: string
      status: string
      in_progress_at: string | null
      archive_at: string | null
      agency: { id: string; name: string } | null
    }

    if (!r.agency_id) return
    const existing = agencyMap.get(r.agency_id)
    const entry = existing ?? {
      agency_name: r.agency?.name ?? '알 수 없음',
      total: 0,
      completed: 0,
      totalDays: 0,
      completedWithDays: 0,
    }

    entry.total++
    if (r.status === 'completed' && r.in_progress_at && r.archive_at) {
      entry.completed++
      const days =
        (new Date(r.archive_at).getTime() - new Date(r.in_progress_at).getTime()) /
        (1000 * 60 * 60 * 24)
      entry.totalDays += days
      entry.completedWithDays++
    } else if (r.status === 'completed') {
      entry.completed++
    }

    agencyMap.set(r.agency_id, entry)
  })

  return Array.from(agencyMap.entries()).map(([agency_id, entry]) => ({
    agency_id,
    agency_name: entry.agency_name,
    total: entry.total,
    completed: entry.completed,
    completionRate: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
    avgDays:
      entry.completedWithDays > 0
        ? Math.round(entry.totalDays / entry.completedWithDays)
        : null,
  }))
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
  const completedWithDays = completed.filter(
    (r) => r.in_progress_at && r.archive_at
  )
  const totalDays = completedWithDays.reduce((acc, r) => {
    return (
      acc +
      (new Date(r.archive_at!).getTime() - new Date(r.in_progress_at!).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  }, 0)

  return {
    total: rows.length,
    completed: completed.length,
    completionRate:
      rows.length > 0 ? Math.round((completed.length / rows.length) * 100) : 0,
    avgDays:
      completedWithDays.length > 0
        ? Math.round(totalDays / completedWithDays.length)
        : null,
    requests: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      in_progress_at: r.in_progress_at,
      archive_at: r.archive_at,
    })) as Request[],
  }
}
