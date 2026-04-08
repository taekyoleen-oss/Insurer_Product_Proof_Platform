'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RequestStatus, RequestType } from '@/types'

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
      assigned_member_ids: data.assigned_member_ids ?? null,
      hazard_type: data.hazard_type ?? null,
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

// 허용된 상태 전이 맵 (admin 이상만 가능)
const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  draft: ['in_progress'],
  in_progress: ['hold', 'completed'],
  hold: ['in_progress'],
  completed: [],
}

export async function updateRequestStatus(id: string, newStatus: RequestStatus) {
  const { supabase } = await requireAdmin()

  // 현재 상태 조회
  const { data: current, error: fetchError } = await supabase
    .from('ippp_requests')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !current) throw new Error('검증 건을 찾을 수 없습니다.')

  const currentStatus = current.status as RequestStatus
  const allowed = ALLOWED_TRANSITIONS[currentStatus]

  if (!allowed.includes(newStatus)) {
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

  revalidatePath(`/dashboard/requests/${id}`)
  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard')

  return updated
}

// ─── 완료 처리 (admin만, 확인서 업로드 확인 후 completed + archive_at) ────

export async function completeRequest(id: string) {
  const { supabase } = await requireAdmin()

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

  // 검증확인서 파일 업로드 여부 확인 (파일이 하나 이상 있어야 완료 가능)
  const { count: fileCount, error: fileError } = await supabase
    .from('ippp_files')
    .select('*', { count: 'exact', head: true })
    .eq('request_id', id)
    .is('deleted_at', null)

  if (fileError) throw fileError
  if (!fileCount || fileCount === 0) {
    throw new Error('완료 처리 전 최소 1개의 파일이 업로드되어야 합니다.')
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

  revalidatePath(`/dashboard/requests/${id}`)
  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard/archive')
  revalidatePath('/dashboard')

  return updated
}

// ─── 기관 재배정 ───────────────────────────────────────────────────────

export async function assignAgency(requestId: string, agencyId: string) {
  const { supabase } = await requireAdmin()

  const { data: updated, error } = await supabase
    .from('ippp_requests')
    .update({ agency_id: agencyId, assigned_member_ids: null })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/dashboard/requests/${requestId}`)
  revalidatePath('/dashboard/requests')

  return updated
}
