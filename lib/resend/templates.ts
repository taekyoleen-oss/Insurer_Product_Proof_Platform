import type { NotificationType } from '@/types'

// ─── 공통 HTML 래퍼 ───────────────────────────────────────────────────────

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
             background-color: #F8FAFC; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color: #FFFFFF; border-radius: 8px;
                      border: 1px solid #E5E7EB; overflow: hidden; max-width: 600px; width: 100%;">
          <!-- 헤더 -->
          <tr>
            <td style="background-color: #1E3A5F; padding: 24px 32px;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 18px; font-weight: 700;">
                IPPP 검증기관 포털
              </h1>
            </td>
          </tr>
          <!-- 본문 -->
          <tr>
            <td style="padding: 32px;">
              ${body}
            </td>
          </tr>
          <!-- 푸터 -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px 32px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; color: #6B7280; font-size: 12px;">
                이 이메일은 IPPP 시스템에서 자동으로 발송되었습니다.<br />
                문의사항은 시스템 관리자에게 연락해 주세요.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── 초대 이메일 ──────────────────────────────────────────────────────────

export interface InvitationTemplateData {
  inviteUrl: string
  agencyName: string
  inviterName: string
  role?: string
}

export function invitationTemplate(data: InvitationTemplateData): string {
  const roleLabel = data.role === 'agency_admin' ? '기관 관리자' : '기관 담당자'
  const body = `
    <h2 style="color: #1E3A5F; font-size: 20px; margin: 0 0 16px;">
      IPPP 검증기관 포털 초대장
    </h2>
    <p style="color: #374151; line-height: 1.6; margin: 0 0 12px;">안녕하세요,</p>
    <p style="color: #374151; line-height: 1.6; margin: 0 0 12px;">
      <strong>${data.inviterName}</strong>님이 <strong>${data.agencyName}</strong> 기관의
      IPPP 검증기관 포털에 <strong>${roleLabel}</strong> 역할로 초대했습니다.
    </p>
    <p style="color: #374151; line-height: 1.6; margin: 0 0 24px;">
      아래 버튼을 클릭하여 <strong>72시간 이내</strong>에 가입을 완료해 주세요.
    </p>
    <div style="text-align: center; margin: 0 0 24px;">
      <a href="${data.inviteUrl}"
         style="display: inline-block; background-color: #3B82F6; color: #FFFFFF;
                padding: 12px 32px; border-radius: 6px; text-decoration: none;
                font-weight: 700; font-size: 15px;">
        초대 수락하기
      </a>
    </div>
    <p style="color: #6B7280; font-size: 13px; margin: 0;">
      ※ 이 링크는 발송 후 72시간이 지나면 만료됩니다.<br />
      링크가 만료되었다면 관리자에게 재초대를 요청해 주세요.
    </p>
  `
  return wrapHtml('IPPP 검증기관 포털 초대장', body)
}

// ─── 새 코멘트 알림 ───────────────────────────────────────────────────────

export interface NewCommentTemplateData {
  title: string
  requestUrl: string
  authorName: string
  commentPreview: string
}

export function newCommentTemplate(data: NewCommentTemplateData): string {
  const body = `
    <h2 style="color: #1E3A5F; font-size: 20px; margin: 0 0 16px;">
      새 코멘트가 등록되었습니다
    </h2>
    <p style="color: #374151; line-height: 1.6; margin: 0 0 12px;">
      검증 건 <strong>「${data.title}」</strong>에 새로운 코멘트가 작성되었습니다.
    </p>
    <div style="background-color: #F8FAFC; border-left: 4px solid #3B82F6;
                padding: 16px; border-radius: 4px; margin: 0 0 24px;">
      <p style="color: #6B7280; font-size: 12px; margin: 0 0 8px;">
        작성자: <strong>${data.authorName}</strong>
      </p>
      <p style="color: #374151; margin: 0; line-height: 1.6; word-break: break-word;">
        ${data.commentPreview}
      </p>
    </div>
    <div style="text-align: center;">
      <a href="${data.requestUrl}"
         style="display: inline-block; background-color: #1E3A5F; color: #FFFFFF;
                padding: 12px 32px; border-radius: 6px; text-decoration: none;
                font-weight: 700; font-size: 15px;">
        검증 건 확인하기
      </a>
    </div>
  `
  return wrapHtml(`[IPPP] ${data.title} 건에 새 코멘트가 등록되었습니다`, body)
}

// ─── 새 파일 알림 ─────────────────────────────────────────────────────────

export interface NewFileTemplateData {
  title: string
  requestUrl: string
  uploaderName: string
  filename: string
}

export function newFileTemplate(data: NewFileTemplateData): string {
  const body = `
    <h2 style="color: #1E3A5F; font-size: 20px; margin: 0 0 16px;">
      새 파일이 업로드되었습니다
    </h2>
    <p style="color: #374151; line-height: 1.6; margin: 0 0 12px;">
      검증 건 <strong>「${data.title}」</strong>에 새로운 파일이 업로드되었습니다.
    </p>
    <div style="background-color: #F8FAFC; border: 1px solid #E5E7EB;
                padding: 16px; border-radius: 6px; margin: 0 0 24px;">
      <p style="color: #6B7280; font-size: 12px; margin: 0 0 8px;">
        업로드한 사람: <strong>${data.uploaderName}</strong>
      </p>
      <p style="color: #374151; margin: 0; font-weight: 600;">
        📎 ${data.filename}
      </p>
    </div>
    <div style="text-align: center;">
      <a href="${data.requestUrl}"
         style="display: inline-block; background-color: #1E3A5F; color: #FFFFFF;
                padding: 12px 32px; border-radius: 6px; text-decoration: none;
                font-weight: 700; font-size: 15px;">
        파일 확인하기
      </a>
    </div>
  `
  return wrapHtml(`[IPPP] ${data.title} 건에 새 파일이 업로드되었습니다`, body)
}

// ─── 상태 변경 알림 ───────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  in_progress: '진행 중',
  hold: '보류',
  completed: '완료',
}

export interface StatusChangedTemplateData {
  title: string
  requestUrl: string
  previousStatus: string
  newStatus: string
}

export function statusChangedTemplate(data: StatusChangedTemplateData): string {
  const prevLabel = STATUS_LABELS[data.previousStatus] ?? data.previousStatus
  const newLabel = STATUS_LABELS[data.newStatus] ?? data.newStatus

  const statusColor =
    data.newStatus === 'completed'
      ? '#10B981'
      : data.newStatus === 'hold'
      ? '#F59E0B'
      : data.newStatus === 'in_progress'
      ? '#3B82F6'
      : '#6B7280'

  const body = `
    <h2 style="color: #1E3A5F; font-size: 20px; margin: 0 0 16px;">
      검증 건 상태가 변경되었습니다
    </h2>
    <p style="color: #374151; line-height: 1.6; margin: 0 0 20px;">
      검증 건 <strong>「${data.title}」</strong>의 상태가 변경되었습니다.
    </p>
    <div style="background-color: #F8FAFC; border: 1px solid #E5E7EB;
                padding: 20px; border-radius: 6px; margin: 0 0 24px;
                text-align: center;">
      <span style="color: #6B7280; font-size: 15px;">${prevLabel}</span>
      <span style="color: #9CA3AF; margin: 0 12px; font-size: 18px;">→</span>
      <span style="color: ${statusColor}; font-size: 16px; font-weight: 700;
                   background-color: ${statusColor}1A; padding: 4px 12px;
                   border-radius: 20px;">
        ${newLabel}
      </span>
    </div>
    <div style="text-align: center;">
      <a href="${data.requestUrl}"
         style="display: inline-block; background-color: #1E3A5F; color: #FFFFFF;
                padding: 12px 32px; border-radius: 6px; text-decoration: none;
                font-weight: 700; font-size: 15px;">
        검증 건 확인하기
      </a>
    </div>
  `
  return wrapHtml(`[IPPP] ${data.title} 건 상태가 변경되었습니다`, body)
}

// ─── 템플릿 디스패처 ──────────────────────────────────────────────────────

export function getEmailTemplate(
  type: NotificationType,
  data: Record<string, string>
): { subject: string; html: string } {
  switch (type) {
    case 'invitation':
      return {
        subject: '[IPPP] 검증기관 포털 초대장',
        html: invitationTemplate(data as unknown as InvitationTemplateData),
      }
    case 'new_comment':
      return {
        subject: `[IPPP] ${data.title} 건에 새 코멘트가 등록되었습니다`,
        html: newCommentTemplate(data as unknown as NewCommentTemplateData),
      }
    case 'new_file':
      return {
        subject: `[IPPP] ${data.title} 건에 새 파일이 업로드되었습니다`,
        html: newFileTemplate(data as unknown as NewFileTemplateData),
      }
    case 'status_changed':
      return {
        subject: `[IPPP] ${data.title} 건 상태가 변경되었습니다`,
        html: statusChangedTemplate(data as unknown as StatusChangedTemplateData),
      }
  }
}
