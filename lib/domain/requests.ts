// ============================================================
// IPPP — 순수 도메인 로직 (DB·프레임워크 비의존)
//   서버 액션/쿼리와 테스트 하네스가 동일 코드를 공유하도록 추출.
//   참조: docs/IPPP_appropriateness_assessment_v1.md (P2-2)
// ============================================================

import type { RequestStatus, ReportPeriod } from '@/types'

// ─── 상태 전이 (설계서 §5.2) ──────────────────────────────────────────────

export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  draft: ['in_progress'],
  in_progress: ['hold', 'completed'],
  hold: ['in_progress'],
  completed: [],
}

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

// ─── 스토리지 경로 ─────────────────────────────────────────────────────────
// 패턴: agencies/{agency_id}/requests/{request_id}/{filename}
//   v2 이상은 파일명 앞에 vN_ 접두사를 붙여 동일 파일명 충돌을 방지.

export function buildStoragePath(
  agencyId: string,
  requestId: string,
  filename: string,
  version: number
): string {
  const base = `agencies/${agencyId}/requests/${requestId}`
  return version > 1 ? `${base}/v${version}_${filename}` : `${base}/${filename}`
}

export function parseRequestIdFromStoragePath(path: string): string | null {
  const parts = path.split('/')
  const i = parts.indexOf('requests')
  return i !== -1 && parts[i + 1] ? parts[i + 1] : null
}

export function parseAgencyIdFromStoragePath(path: string): string | null {
  const parts = path.split('/')
  const i = parts.indexOf('agencies')
  return i !== -1 && parts[i + 1] ? parts[i + 1] : null
}

// ─── 날짜/기간 유틸 ────────────────────────────────────────────────────────

export function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function daysBetween(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000
}

/** D-day 임박 윈도우 [today, today+days] (마감 임박, 미래 구간) */
export function dueSoonWindow(now: Date, days = 7): { today: string; until: string } {
  return {
    today: toDateString(now),
    until: toDateString(new Date(now.getTime() + days * 86_400_000)),
  }
}

/** 평균 소요일 — in_progress_at→archive_at 이 모두 있는 완료 건만 평균 (없으면 null) */
export function averageDays(
  rows: { status: string; in_progress_at: string | null; archive_at: string | null }[]
): number | null {
  const eligible = rows.filter(
    (r) => r.status === 'completed' && r.in_progress_at && r.archive_at
  )
  if (eligible.length === 0) return null
  const total = eligible.reduce(
    (acc, r) => acc + daysBetween(r.in_progress_at!, r.archive_at!),
    0
  )
  return Math.round(total / eligible.length)
}

export function completionRate(total: number, completed: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

/** 리포트 기간 → [start, end] ISO 범위. now 주입 가능(테스트). */
export function resolvePeriodRange(
  period: ReportPeriod,
  now: Date = new Date()
): { start: string; end: string } {
  if (period.type === 'custom') {
    if (!period.start || !period.end) {
      throw new Error('custom 기간 타입에는 start, end가 필요합니다.')
    }
    return { start: period.start, end: period.end }
  }

  const end = now.toISOString()

  if (period.type === 'last12months') {
    return {
      start: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString(),
      end,
    }
  }
  if (period.type === 'year') {
    return { start: new Date(now.getFullYear(), 0, 1).toISOString(), end }
  }
  if (period.type === 'half') {
    const halfStart = now.getMonth() < 6 ? 0 : 6
    return { start: new Date(now.getFullYear(), halfStart, 1).toISOString(), end }
  }
  if (period.type === 'quarter') {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3
    return { start: new Date(now.getFullYear(), quarterStart, 1).toISOString(), end }
  }
  // month
  return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end }
}

// ─── 완료 자격 (2단계 완료 통제, 설계서 §1.3/§5) ──────────────────────────
//   기관(외부) 업로더가 올린 미삭제 파일이 1개 이상 있어야 완료 가능.
//   admin 본인이 올린 파일만으로는 완료 불가(독립 검증확인서 통제).

export function hasAgencyCertificate(
  files: { deleted_at: string | null; uploaded_by_agency: boolean }[]
): boolean {
  return files.some((f) => f.deleted_at === null && f.uploaded_by_agency)
}
