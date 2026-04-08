import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { sendNotification } from '@/lib/resend/send'

// ─── 입력 스키마 ──────────────────────────────────────────────────────────

const InvitationSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  role: z.string().min(1, '역할을 지정해주세요.'),
  agency_id: z.string().uuid().optional(),
})

// ─── POST /api/invitations ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 관리자 권한 확인
    const { data: member, error: memberError } = await supabase
      .from('ippp_internal_members')
      .select('internal_role, is_active, name')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member || !member.is_active) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    // Zod 검증
    const body: unknown = await request.json()
    const parseResult = InvitationSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const { email, role, agency_id } = parseResult.data

    // super_admin 초대는 super_admin만 가능
    if (role === 'admin' || role === 'super_admin') {
      if (member.internal_role !== 'super_admin') {
        return NextResponse.json(
          { error: '내부 관리자 초대는 super_admin만 가능합니다.' },
          { status: 403 }
        )
      }
    }

    // 이미 사용 중인 초대 확인 (미만료 + 미수락)
    const { data: existingInvitation } = await supabaseAdmin
      .from('ippp_invitations')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: '해당 이메일로 이미 유효한 초대가 존재합니다.' },
        { status: 409 }
      )
    }

    // 토큰 생성 (72시간 만료)
    const token = crypto.randomUUID()
    const expireHours = Number(process.env.INVITATION_EXPIRE_HOURS ?? 72)
    const expiresAt = new Date(Date.now() + expireHours * 60 * 60 * 1000).toISOString()

    // ippp_invitations INSERT
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('ippp_invitations')
      .insert({
        email,
        role,
        agency_id: agency_id ?? null,
        token,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (insertError) {
      console.error('초대 INSERT 오류:', insertError)
      return NextResponse.json({ error: '초대 생성에 실패했습니다.' }, { status: 500 })
    }

    // 기관명 조회 (agency_id가 있는 경우)
    let agencyName = '검증기관'
    if (agency_id) {
      const { data: agency } = await supabaseAdmin
        .from('ippp_agencies')
        .select('name')
        .eq('id', agency_id)
        .single()
      if (agency) agencyName = agency.name
    }

    // 초대 URL 생성
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const inviteUrl = `${appUrl}/auth/invite?token=${token}`

    // Resend 이메일 발송
    await sendNotification({
      type: 'invitation',
      recipientEmails: [email],
      templateData: {
        inviteUrl,
        agencyName,
        inviterName: member.name ?? '관리자',
        role,
      },
    })

    return NextResponse.json(
      {
        success: true,
        invitationId: invitation.id,
        expiresAt,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('/api/invitations 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
