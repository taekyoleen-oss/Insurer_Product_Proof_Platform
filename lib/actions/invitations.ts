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
    .select('internal_role, is_active, name')
    .eq('user_id', user.id)
    .single()

  if (error || !member || !member.is_active) {
    throw new Error('관리자 권한이 필요합니다.')
  }

  return {
    supabase,
    user,
    role: member.internal_role as 'super_admin' | 'admin',
    name: member.name as string,
  }
}

// ─── 사용자 초대 (초대 생성 + 이메일 발송) ────────────────────────────────

export async function inviteUserAction(
  email: string,
  role: string,
  agencyId?: string
) {
  const { supabase } = await requireAdmin()

  // Route Handler를 통해 초대 처리 (Resend 발송 포함)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const response = await fetch(`${appUrl}/api/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      role,
      agency_id: agencyId,
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? '초대 처리에 실패했습니다.')
  }

  revalidatePath('/dashboard/agencies')
  revalidatePath('/dashboard/settings/members')
  revalidatePath('/portal/members')

  return await response.json()
}

// ─── agency_admin 초대 전용 헬퍼 ──────────────────────────────────────

export async function inviteAgencyAdmin(email: string, agencyId: string) {
  return inviteUserAction(email, 'agency_admin', agencyId)
}

// ─── 재초대 (기존 토큰 만료 처리 후 신규 발급) ───────────────────────────

export async function reinviteMemberAction(invitationId: string) {
  const { supabase } = await requireAdmin()

  // 기존 초대 조회
  const { data: existing, error: fetchError } = await supabase
    .from('ippp_invitations')
    .select('*')
    .eq('id', invitationId)
    .single()

  if (fetchError || !existing) throw new Error('초대 정보를 찾을 수 없습니다.')
  if (existing.accepted_at) throw new Error('이미 수락된 초대입니다.')

  // 기존 토큰 만료 처리 (expires_at을 과거로 설정)
  const { error: expireError } = await supabase
    .from('ippp_invitations')
    .update({ expires_at: new Date(0).toISOString() })
    .eq('id', invitationId)

  if (expireError) throw expireError

  // 신규 초대 생성
  return inviteUserAction(
    existing.email,
    existing.role,
    existing.agency_id ?? undefined
  )
}
