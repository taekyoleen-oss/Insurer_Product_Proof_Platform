import { resend } from './client'
import { getEmailTemplate } from './templates'
import { supabaseAdmin } from '@/lib/supabase/service'
import type { NotificationType } from '@/types'

// ─── 수신자 조회 ──────────────────────────────────────────────────────────

export async function getNotificationRecipients(requestId: string) {
  const { data: request, error } = await supabaseAdmin
    .from('ippp_requests')
    .select('agency_id, assigned_member_ids, title')
    .eq('id', requestId)
    .single()

  if (error || !request) throw new Error('검증 건을 찾을 수 없습니다.')

  // 기관 멤버 이메일 조회
  let agencyQuery = supabaseAdmin
    .from('ippp_agency_members')
    .select('email')
    .eq('agency_id', request.agency_id)
    .eq('is_active', true)

  if (request.assigned_member_ids && request.assigned_member_ids.length > 0) {
    agencyQuery = agencyQuery.in('user_id', request.assigned_member_ids)
  }

  const { data: agencyMembers } = await agencyQuery

  // 내부 관리자 이메일 조회
  const { data: adminMembers } = await supabaseAdmin
    .from('ippp_internal_members')
    .select('email')
    .eq('is_active', true)

  return {
    agencyEmails: (agencyMembers ?? []).map((m: { email: string }) => m.email),
    adminEmails: (adminMembers ?? []).map((m: { email: string }) => m.email),
    title: request.title as string,
  }
}

// ─── 알림 발송 유틸 ───────────────────────────────────────────────────────

interface SendNotificationOptions {
  type: NotificationType
  requestId?: string
  recipientEmails: string[]
  templateData: Record<string, string>
}

export async function sendNotification({
  type,
  requestId,
  recipientEmails,
  templateData,
}: SendNotificationOptions) {
  if (recipientEmails.length === 0) return

  const template = getEmailTemplate(type, templateData)

  const results = await Promise.allSettled(
    recipientEmails.map((email) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: email,
        subject: template.subject,
        html: template.html,
      })
    )
  )

  // 알림 로그 저장 (requestId가 있을 때만)
  if (requestId) {
    const logs = recipientEmails.map((email, i) => {
      const result = results[i]
      return {
        request_id: requestId,
        type,
        recipient_email: email,
        status: result.status === 'fulfilled' ? 'sent' : 'failed',
        resend_id:
          result.status === 'fulfilled'
            ? ((result as PromiseFulfilledResult<{ data: { id: string } | null }>).value?.data?.id ?? null)
            : null,
      }
    })

    await supabaseAdmin.from('ippp_notifications').insert(logs)
  }

  return results
}
