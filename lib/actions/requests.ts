'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RequestStatus, RequestType } from '@/types'
import { canTransition } from '@/lib/domain/requests'
import { writeAuditLog } from '@/lib/audit/log'

// ─── 공통: 현재 사용자 내부 역할 조회 ──────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('인증이 필요합니다.')
  return { supabase, user }
}

async function requireAdmin() {
  const { supabase, user } = await getAuthUser()
  const { data: member, error } = await supabase
    .from('ippp_internal_members')
    .select('internal_role, is_active')
    .eq('user_id', user.id)
    .single()

  if (error || !member || !member.is_active) {
    throw new Error('관리자 권한이 필요합니다.')
  }

  return { supabase, user, role: member.internal_role as 'super_admin' | 'admin' }
}

// ─── 검증 건 생성 (draft) ──────────────────────────────────────────────

export interface CreateRequestData {
  type: RequestType
  title: string
  description?: string
  agency_id: string
  assigned_member_ids?: string[]
  hazard_type?: string[]
  product_type?: string
  due_date?: string
  fiscal_year?: number
  fiscal_quarter?: number
}

export async function createRequest(data: CreateRequestData) {
  const { supabase, user } = await requireAdmin()

  const { data: request, error } = await supabase
    .from('ippp_requests')
    .insert({
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      agency_id: data.agency_id,
      // 배열 컬럼은 NOT NULL — 빈 배열로 보정 (P0-2)
      assigned_member_ids: data.assigned_member_ids ?? [],
      hazard_type: data.hazard_type ?? [],
      product_type: data.product_type ?? null,
      due_date: data.due_date ?? null,
      fiscal_year: data.fiscal_year ?? null,
      fiscal_quarter: data.fiscal_quarter ?? null,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard')

  return request
}

// ─── 상태 전이 (§5.2 권한 검증) ───────────────────────────────────────
// 허용 전이 맵은 lib/domain/requests.ts(canTransition)로 추출 — 앱·하네스 공유.

export async function updateRequestStatus(id: string, newStatus: RequestStatus) {
  const { supabase, user } = await requireAdmin()

  // 현재 상태 조회
  const { data: current, error: fetchError } = await supabase
    .from('ippp_requests')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !current) throw new Error('검증 건을 찾을 수 없습니다.')

  const currentStatus = current.status as RequestStatus

  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(
      `'${currentStatus}' 상태에서 '${newStatus}'로 전환할 수 없습니다.`
    )
  }

  // in_progress 전환 시 in_progress_at 기록
  const extraFields: Record<string, unknown> = {}
  if (newStatus === 'in_progress' && currentStatus === 'draft') {
    extraFields.in_progress_at = new Date().toISOString()
  }

  const { data: updated, error } = await supabase
    .from('ippp_requests')
    .update({ status: newStatus, ...extraFields })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: 'status_change',
    entityType: 'request',
    entityId: id,
    requestId: id,
    metadata: { from: currentStatus, to: newStatus },
  })

  revalidatePath(`/dashboard/requests/${id}`)
  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard')

  return updated
}

// ─── 완료 처리 (admin만, 기관 검증확인서 확인 후 completed + archive_at) ────

export async function completeRequest(id: string) {
  const { supabase, user } = await requireAdmin()

  // 현재 상태 확인
  const { data: current, error: fetchError } = await supabase
    .from('ippp_requests')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !current) throw new Error('검증 건을 찾을 수 없습니다.')
  if (current.status !== 'in_progress') {
    throw new Error('진행 중인 건만 완료 처리할 수 있습니다.')
  }

  // P1-1: 2단계 완료 통제 — 기관(외부) 업로더의 미삭제 파일이 1개 이상이어야 완료 가능.
  //   admin 본인이 올린 파일만으로는 완료 불가(독립 검증확인서 통제).
  const { data: liveFiles, error: fileError } = await supabase
    .from('ippp_files')
    .select('uploader_id')
    .eq('request_id', id)
    .is('deleted_at', null)

  if (fileError) throw fileError
  if (!liveFiles || liveFiles.length === 0) {
    throw new Error('완료 처리 전 최소 1개의 파일이 업로드되어야 합니다.')
  }

  const uploaderIds = [
    ...new Set(liveFiles.map((f) => f.uploader_id).filter(Boolean) as string[]),
  ]
  const { data: agencyUploaders, error: auError } = await supabase
    .from('ippp_agency_members')
    .select('user_id')
    .in('user_id', uploaderIds)

  if (auError) throw auError
  if (!agencyUploaders || agencyUploaders.length === 0) {
    throw new Error(
      '완료 처리 전 검증기관이 업로드한 검증확인서가 1개 이상 필요합니다.'
    )
  }

  const { data: updated, error } = await supabase
    .from('ippp_requests')
    .update({
      status: 'completed',
      archive_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: 'request_complete',
    entityType: 'request',
    entityId: id,
    requestId: id,
  })

  revalidatePath(`/dashboard/requests/${id}`)
  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard/archive')
  revalidatePath('/dashboard')

  return updated
}

// ─── 기관 재배정 ───────────────────────────────────────────────────────

export async function assignAgency(requestId: string, agencyId: string) {
  const { supabase, user } = await requireAdmin()

  const { data: updated, error } = await supabase
    .from('ippp_requests')
    // 알림 대상 초기화는 빈 배열로 (NOT NULL 컬럼, P1-3)
    .update({ agency_id: agencyId, assigned_member_ids: [] })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: 'agency_reassign',
    entityType: 'request',
    entityId: requestId,
    requestId,
    metadata: { agency_id: agencyId },
  })

  revalidatePath(`/dashboard/requests/${requestId}`)
  revalidatePath('/dashboard/requests')

  return updated
}
