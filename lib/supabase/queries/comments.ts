import { createClient } from '@/lib/supabase/server'
import type { CommentWithChildren } from '@/types'

// ─── 요청 건의 코멘트 목록 (트리 구조) ────────────────────────────────────

export async function getCommentsByRequest(
  requestId: string
): Promise<CommentWithChildren[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ippp_comments')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw error

  const allComments = (data ?? []) as CommentWithChildren[]

  // parent_id가 null인 루트 코멘트 추출
  const rootComments = allComments.filter((c) => c.parent_id === null)

  // 각 루트 코멘트에 자식 코멘트 추가
  const tree = rootComments.map((root) => ({
    ...root,
    children: allComments.filter((c) => c.parent_id === root.id),
  }))

  return tree
}
