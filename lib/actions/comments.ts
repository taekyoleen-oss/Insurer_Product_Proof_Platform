'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── 공통: 인증된 사용자 ─────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('인증이 필요합니다.')
  return { supabase, user }
}

// ─── 코멘트/답글 생성 ──────────────────────────────────────────────────

export async function createCommentAction(
  requestId: string,
  content: string,
  parentId?: string
) {
  const { supabase, user } = await getAuthUser()

  if (!content.trim()) throw new Error('코멘트 내용을 입력해주세요.')

  // 2단 이상 답글 방지: parentId가 있으면 해당 코멘트의 parent_id가 null이어야 함
  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from('ippp_comments')
      .select('parent_id')
      .eq('id', parentId)
      .single()

    if (parentError || !parent) throw new Error('부모 코멘트를 찾을 수 없습니다.')
    if (parent.parent_id !== null) {
      throw new Error('2단 이상 답글은 지원하지 않습니다.')
    }
  }

  const { data: comment, error } = await supabase
    .from('ippp_comments')
    .insert({
      request_id: requestId,
      author_id: user.id,
      content: content.trim(),
      parent_id: parentId ?? null,
    })
    .select()
    .single()

  if (error) throw error

  // 알림 API 호출 (비동기, 실패 시 무시)
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await fetch(`${appUrl}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'new_comment', request_id: requestId }),
    })
  } catch {
    // 알림 실패는 코멘트 생성에 영향 없음
  }

  revalidatePath(`/dashboard/requests/${requestId}`)
  revalidatePath(`/portal/requests/${requestId}`)

  return comment
}

// ─── 코멘트 소프트 삭제 ────────────────────────────────────────────────

export async function softDeleteCommentAction(commentId: string) {
  const { supabase } = await getAuthUser()

  // request_id 조회 (revalidate용)
  const { data: comment, error: fetchError } = await supabase
    .from('ippp_comments')
    .select('request_id')
    .eq('id', commentId)
    .single()

  if (fetchError || !comment) throw new Error('코멘트를 찾을 수 없습니다.')

  const { error } = await supabase
    .from('ippp_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
  // RLS가 작성자 본인 또는 admin만 허용

  if (error) throw error

  revalidatePath(`/dashboard/requests/${comment.request_id}`)
  revalidatePath(`/portal/requests/${comment.request_id}`)
}
