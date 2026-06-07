// ============================================================
// IPPP 하네스 — 순수 도메인 로직 회귀 테스트 (의존성 0)
//   실행: node --experimental-strip-types --test harness/logic/domain.test.ts
//   (lib/domain/requests.ts 의 type-only import 는 스트리핑 시 제거되어
//    경로 별칭 없이도 그대로 실행됨)
// ============================================================

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  canTransition,
  buildStoragePath,
  parseRequestIdFromStoragePath,
  parseAgencyIdFromStoragePath,
  resolvePeriodRange,
  averageDays,
  completionRate,
  dueSoonWindow,
  hasAgencyCertificate,
  daysBetween,
} from '../../lib/domain/requests.ts'

// ─── 상태 전이 (설계서 §5.2) ──────────────────────────────────────────────
test('canTransition: 허용 전이만 통과', () => {
  assert.equal(canTransition('draft', 'in_progress'), true)
  assert.equal(canTransition('in_progress', 'hold'), true)
  assert.equal(canTransition('in_progress', 'completed'), true)
  assert.equal(canTransition('hold', 'in_progress'), true)
})

test('canTransition: 불허 전이 차단', () => {
  assert.equal(canTransition('draft', 'completed'), false)
  assert.equal(canTransition('draft', 'hold'), false)
  assert.equal(canTransition('completed', 'in_progress'), false)
  assert.equal(canTransition('hold', 'completed'), false)
})

// ─── 스토리지 경로 ─────────────────────────────────────────────────────────
test('buildStoragePath: v1 은 접두사 없음, v2+ 는 vN_ 접두사', () => {
  assert.equal(
    buildStoragePath('AG', 'RQ', 'report.xlsx', 1),
    'agencies/AG/requests/RQ/report.xlsx'
  )
  assert.equal(
    buildStoragePath('AG', 'RQ', 'report.xlsx', 3),
    'agencies/AG/requests/RQ/v3_report.xlsx'
  )
})

test('parse*FromStoragePath: 경로에서 id 추출', () => {
  const p = 'agencies/ag-1/requests/rq-9/v2_a.pdf'
  assert.equal(parseRequestIdFromStoragePath(p), 'rq-9')
  assert.equal(parseAgencyIdFromStoragePath(p), 'ag-1')
  assert.equal(parseRequestIdFromStoragePath('bad/path'), null)
})

// ─── 기간 범위 ─────────────────────────────────────────────────────────────
test('resolvePeriodRange: custom 은 start/end 필수', () => {
  assert.throws(() => resolvePeriodRange({ type: 'custom' }))
  assert.deepEqual(
    resolvePeriodRange({ type: 'custom', start: 'A', end: 'B' }),
    { start: 'A', end: 'B' }
  )
})

test('resolvePeriodRange: 분기/연/월 시작 경계 (now 주입)', () => {
  const now = new Date('2026-05-15T10:00:00Z') // 2분기, 5월
  const q = resolvePeriodRange({ type: 'quarter' }, now)
  assert.equal(new Date(q.start).getMonth(), 3) // 4월(0-base 3)
  const y = resolvePeriodRange({ type: 'year' }, now)
  assert.equal(new Date(y.start).getMonth(), 0)
  const m = resolvePeriodRange({ type: 'month' }, now)
  assert.equal(new Date(m.start).getMonth(), 4) // 5월
})

// ─── 집계 헬퍼 ─────────────────────────────────────────────────────────────
test('averageDays: 완료+양끝값 존재 건만 평균, 없으면 null', () => {
  const rows = [
    { status: 'completed', in_progress_at: '2025-01-01T00:00:00Z', archive_at: '2025-01-11T00:00:00Z' }, // 10일
    { status: 'completed', in_progress_at: '2025-02-01T00:00:00Z', archive_at: '2025-02-21T00:00:00Z' }, // 20일
    { status: 'in_progress', in_progress_at: '2025-03-01T00:00:00Z', archive_at: null }, // 제외
    { status: 'completed', in_progress_at: null, archive_at: '2025-03-10T00:00:00Z' }, // 제외
  ]
  assert.equal(averageDays(rows), 15)
  assert.equal(averageDays([]), null)
  assert.equal(averageDays([{ status: 'in_progress', in_progress_at: null, archive_at: null }]), null)
})

test('completionRate: 0 분모 안전, 반올림', () => {
  assert.equal(completionRate(0, 0), 0)
  assert.equal(completionRate(3, 1), 33)
  assert.equal(completionRate(4, 3), 75)
})

test('daysBetween: 정확한 일수', () => {
  assert.equal(daysBetween('2025-01-01T00:00:00Z', '2025-01-08T00:00:00Z'), 7)
})

// ─── 마감 임박 윈도우 ──────────────────────────────────────────────────────
test('dueSoonWindow: today ~ today+7', () => {
  const now = new Date('2026-06-07T09:00:00Z')
  const { today, until } = dueSoonWindow(now)
  assert.equal(today, '2026-06-07')
  assert.equal(until, '2026-06-14')
})

// ─── 2단계 완료 통제 (P1-1 회귀) ──────────────────────────────────────────
test('hasAgencyCertificate: admin 단독 파일만으로는 완료 불가', () => {
  // admin 파일만 → false (회귀 방지: 기존 버그는 true 였음)
  assert.equal(
    hasAgencyCertificate([{ deleted_at: null, uploaded_by_agency: false }]),
    false
  )
  // 기관 파일 존재 → true
  assert.equal(
    hasAgencyCertificate([
      { deleted_at: null, uploaded_by_agency: false },
      { deleted_at: null, uploaded_by_agency: true },
    ]),
    true
  )
  // 기관 파일이 삭제됨 → false
  assert.equal(
    hasAgencyCertificate([{ deleted_at: '2025-01-01', uploaded_by_agency: true }]),
    false
  )
})
