import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendNotification, getNotificationRecipients } from '@/lib/resend/send'
import type { NotificationType } from '@/types'

// ─── 입력 스키마 ──────────────────────────────────────────────────────────

const NotificationSchema = z.object({
  type: z.enum(['new_comment', 'new_file', 'status_changed', 'invitation']),
  request_id: z.string().uuid(),
  // 추가 템플릿 데이터 (선택 사항)
  template_data: z.record(z.string(), z.string()).optional(),
})

// ─── POST /api/notifications ──────────────────────────────────────────────

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

    // Zod 검증
    const body: unknown = await request.json()
    const parseResult = NotificationSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const { type, request_id, template_data } = parseResult.data

    // 수신자 조회
    const { agencyEmails, adminEmails, title } =
      await getNotificationRecipients(request_id)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // 알림 유형별 수신자 결정 및 템플릿 데이터 준비
    let recipientEmails: string[] = []
    let finalTemplateData: Record<string, string> = {
      title,
      requestUrl: `${appUrl}/dashboard/requests/${request_id}`,
      ...template_data,
    }

    if (type === 'new_comment' || type === 'new_file') {
      // 기관 → 관리자에게, 관리자 → 기관에게 (발송자 제외 로직은 서버 액션에서 처리)
      recipientEmails = [...agencyEmails, ...adminEmails]
    } else if (type === 'status_changed') {
      // 상태 변경: 기관 멤버에게만
      recipientEmails = agencyEmails
    }

    // 중복 이메일 제거, 발송자 본인 제외
    const { data: currentUserData } = await supabase.auth.getUser()
    const currentUserEmail = currentUserData.user?.email

    recipientEmails = [...new Set(recipientEmails)].filter(
      (email) => email !== currentUserEmail
    )

    if (recipientEmails.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Resend 발송 + 로그 저장
    await sendNotification({
      type: type as NotificationType,
      requestId: request_id,
      recipientEmails,
      templateData: finalTemplateData,
    })

    return NextResponse.json({ success: true, sent: recipientEmails.length })
  } catch (err) {
    console.error('/api/notifications 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
