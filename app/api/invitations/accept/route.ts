import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/service'
import { writeAuditLog } from '@/lib/audit/log'

// ============================================================
// POST /api/invitations/accept  (P0-4)
//   초대 수락을 서버(service_role)에서 처리한다.
//   - 토큰 검증(미만료·미수락)
//   - auth 사용자 생성
//   - 권한 테이블(ippp_agency_members / ippp_internal_members) INSERT (RLS 우회)
//   - 초대 accepted_at 기록
//   브라우저 anon 클라이언트가 권한 테이블에 직접 INSERT 하던 구조를 대체.
// ============================================================

const AcceptSchema = z.object({
  token: z.string().min(1, '토큰이 필요합니다.'),
  name: z.string().min(1, '이름을 입력해주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

const INTERNAL_ROLES = ['super_admin', 'admin']
const AGENCY_ROLES = ['agency_admin', 'agency_member']

// ─── GET: 토큰 검증 (anon 은 RLS로 ippp_invitations 조회 불가하므로 서버가 대행) ──
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
  }

  const { data: invitation, error } = await supabaseAdmin
    .from('ippp_invitations')
    .select('email, role, agency_id, expires_at, accepted_at')
    .eq('token', token)
    .is('accepted_at', null)
    .single()

  if (error || !invitation) {
    return NextResponse.json(
      { error: '유효하지 않은 초대 링크입니다.' },
      { status: 404 }
    )
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json(
      { error: '초대 링크가 만료되었습니다. 관리자에게 재초대를 요청하세요.' },
      { status: 410 }
    )
  }

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    agency_id: invitation.agency_id,
    expires_at: invitation.expires_at,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const parsed = AcceptSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }
    const { token, name, password } = parsed.data

    // 1. 초대 조회 (미수락)
    const { data: invitation, error: invError } = await supabaseAdmin
      .from('ippp_invitations')
      .select('id, email, role, agency_id, expires_at, accepted_at')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (invError || !invitation) {
      return NextResponse.json(
        { error: '유효하지 않거나 이미 사용된 초대입니다.' },
        { status: 400 }
      )
    }

    // 2. 만료 확인
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '초대 링크가 만료되었습니다. 관리자에게 재초대를 요청하세요.' },
        { status: 410 }
      )
    }

    // 3. 역할 유효성
    const role = invitation.role as string
    const isAgency = AGENCY_ROLES.includes(role)
    const isInternal = INTERNAL_ROLES.includes(role)
    if (!isAgency && !isInternal) {
      return NextResponse.json({ error: '알 수 없는 초대 역할입니다.' }, { status: 400 })
    }
    if (isAgency && !invitation.agency_id) {
      return NextResponse.json(
        { error: '기관 정보가 없는 초대입니다.' },
        { status: 400 }
      )
    }

    // 4. auth 사용자 생성
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { name },
      })

    if (createError || !created.user) {
      const msg = createError?.message ?? ''
      if (/already|exist|registered/i.test(msg)) {
        return NextResponse.json(
          { error: '이미 가입된 이메일입니다. 로그인해주세요.' },
          { status: 409 }
        )
      }
      console.error('초대 수락 - 사용자 생성 오류:', createError)
      return NextResponse.json({ error: '가입 처리에 실패했습니다.' }, { status: 500 })
    }

    const userId = created.user.id

    // 5. 권한 테이블 INSERT (service_role → RLS 우회)
    let memberError = null
    if (isAgency) {
      const { error } = await supabaseAdmin.from('ippp_agency_members').insert({
        user_id: userId,
        agency_id: invitation.agency_id,
        name,
        email: invitation.email,
        agency_role: role,
        invited_at: new Date().toISOString(),
      })
      memberError = error
    } else {
      const { error } = await supabaseAdmin.from('ippp_internal_members').insert({
        user_id: userId,
        name,
        email: invitation.email,
        internal_role: role,
      })
      memberError = error
    }

    if (memberError) {
      // 멤버 생성 실패 시 생성한 auth 사용자 롤백
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})
      console.error('초대 수락 - 멤버 INSERT 오류:', memberError)
      return NextResponse.json({ error: '계정 등록에 실패했습니다.' }, { status: 500 })
    }

    // 6. 초대 수락 처리
    await supabaseAdmin
      .from('ippp_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // 7. 감사 로그
    await writeAuditLog({
      actorId: userId,
      actorEmail: invitation.email,
      action: 'invite_accept',
      entityType: 'invitation',
      entityId: invitation.id,
      metadata: { role, agency_id: invitation.agency_id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('/api/invitations/accept 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
