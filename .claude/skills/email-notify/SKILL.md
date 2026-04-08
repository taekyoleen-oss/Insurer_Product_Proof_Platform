# 스킬: email-notify

## 목적
Resend API를 이용한 한국어 이메일 알림 발송 패턴.
이벤트 발생 시마다 즉시 발송 (배치 없음).

## 환경변수
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@company.com
```

## Resend 클라이언트 초기화

```typescript
// lib/resend/client.ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
```

## 이메일 발송 유틸

```typescript
// lib/resend/send.ts
import { resend } from './client'
import { supabaseAdmin } from '@/lib/supabase/service'

type NotificationType = 'new_comment' | 'new_file' | 'status_changed' | 'invitation'

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
  const template = getTemplate(type, templateData)

  const results = await Promise.allSettled(
    recipientEmails.map(email =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: email,
        subject: template.subject,
        html: template.html,
      })
    )
  )

  // 알림 로그 저장
  if (requestId) {
    await supabaseAdmin.from('ippp_notifications').insert(
      recipientEmails.map((email, i) => ({
        request_id: requestId,
        type,
        recipient_email: email,
        status: results[i].status === 'fulfilled' ? 'sent' : 'failed',
        resend_id: results[i].status === 'fulfilled'
          ? (results[i] as PromiseFulfilledResult<any>).value?.data?.id
          : null,
      }))
    )
  }
}
```

## 이메일 템플릿 패턴 (한국어 HTML)

```typescript
// lib/resend/templates/index.ts

function getTemplate(type: NotificationType, data: Record<string, string>) {
  switch (type) {
    case 'invitation':
      return {
        subject: '[IPPP] 검증기관 포털 초대장',
        html: invitationTemplate(data),
      }
    case 'new_comment':
      return {
        subject: `[IPPP] ${data.title} 건에 새 코멘트가 등록되었습니다`,
        html: newCommentTemplate(data),
      }
    case 'new_file':
      return {
        subject: `[IPPP] ${data.title} 건에 새 파일이 업로드되었습니다`,
        html: newFileTemplate(data),
      }
    case 'status_changed':
      return {
        subject: `[IPPP] ${data.title} 건 상태가 변경되었습니다`,
        html: statusChangedTemplate(data),
      }
  }
}
```

## 초대 이메일 템플릿

```typescript
function invitationTemplate({ inviteUrl, agencyName, inviterName }: Record<string, string>) {
  return `
<!DOCTYPE html>
<html lang="ko">
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1E3A5F;">IPPP 검증기관 포털 초대</h2>
  <p>안녕하세요,</p>
  <p><strong>${inviterName}</strong>님이 <strong>${agencyName}</strong> 기관의 IPPP 검증기관 포털에 초대했습니다.</p>
  <p>아래 버튼을 클릭하여 72시간 이내에 가입을 완료해 주세요.</p>
  <a href="${inviteUrl}"
     style="display:inline-block; background:#3B82F6; color:#fff; padding:12px 24px;
            border-radius:6px; text-decoration:none; font-weight:bold; margin:16px 0;">
    초대 수락하기
  </a>
  <p style="color:#6B7280; font-size:14px;">링크는 72시간 후 만료됩니다.</p>
</body>
</html>
  `
}
```

## 알림 수신자 조회 패턴

```typescript
// assigned_member_ids가 있으면 해당 멤버만, 없으면 기관 전체 + 내부 관리자
export async function getNotificationRecipients(requestId: string) {
  const { data: request } = await supabaseAdmin
    .from('ippp_requests')
    .select('agency_id, assigned_member_ids, title')
    .eq('id', requestId)
    .single()

  // 기관 멤버 이메일
  let agencyQuery = supabaseAdmin
    .from('ippp_agency_members')
    .select('email')
    .eq('agency_id', request.agency_id)
    .eq('is_active', true)

  if (request.assigned_member_ids?.length > 0) {
    agencyQuery = agencyQuery.in('user_id', request.assigned_member_ids)
  }

  const { data: agencyMembers } = await agencyQuery

  // 내부 관리자 이메일
  const { data: adminMembers } = await supabaseAdmin
    .from('ippp_internal_members')
    .select('email')
    .eq('is_active', true)

  return {
    agencyEmails: agencyMembers?.map(m => m.email) ?? [],
    adminEmails: adminMembers?.map(m => m.email) ?? [],
    title: request.title,
  }
}
```
