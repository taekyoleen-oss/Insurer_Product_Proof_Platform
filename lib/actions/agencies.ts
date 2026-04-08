'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── 공통: 관리자 권한 확인 ───────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('인증이 필요합니다.')

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

// ─── 기관 생성 ──────────────────────────────────────────────────────────

export interface CreateAgencyData {
  name: string
  phone?: string
  contact_email?: string
  contract_date?: string
  address?: string
}

export async function createAgencyAction(data: CreateAgencyData) {
  const { supabase } = await requireAdmin()

  const { data: agency, error } = await supabase
    .from('ippp_agencies')
    .insert({
      name: data.name,
      phone: data.phone ?? null,
      contact_email: data.contact_email ?? null,
      contract_date: data.contract_date ?? null,
      address: data.address ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/dashboard/agencies')

  return agency
}

// ─── 기관 정보 수정 ────────────────────────────────────────────────────

export interface UpdateAgencyData {
  name?: string
  phone?: string
  contact_email?: string
  contract_date?: string
  address?: string
}

export async function updateAgencyAction(id: string, data: UpdateAgencyData) {
  const { supabase } = await requireAdmin()

  const { data: agency, error } = await supabase
    .from('ippp_agencies')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/dashboard/agencies')
  revalidatePath(`/dashboard/agencies/${id}`)

  return agency
}

// ─── 기관 비활성화 ─────────────────────────────────────────────────────

export async function deactivateAgencyAction(id: string) {
  const { supabase } = await requireAdmin()

  // 진행 중인 건 확인 (경고용)
  const { count: activeCount } = await supabase
    .from('ippp_requests')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', id)
    .in('status', ['in_progress', 'hold'])

  const { data: agency, error } = await supabase
    .from('ippp_agencies')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/dashboard/agencies')

  return {
    agency,
    activeRequestCount: activeCount ?? 0,
    warned: (activeCount ?? 0) > 0,
  }
}
