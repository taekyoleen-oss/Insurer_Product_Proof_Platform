'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { createClient as createClientBrowser } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CornerDownRight, Trash2, Send } from 'lucide-react'
import { createCommentAction, softDeleteCommentAction } from '@/lib/actions/comments'
import type { CommentWithChildren, Comment } from '@/types'

interface CommentThreadProps {
  requestId: string
  initialComments: CommentWithChildren[]
  currentUserId: string
  isAdmin: boolean
}

function CommentBubble({
  comment,
  isAdmin,
  currentUserId,
  isOwnAdmin,
  onReply,
  onDelete,
}: {
  comment: Comment
  isAdmin: boolean
  currentUserId: string
  isOwnAdmin: boolean
  onReply: (id: string) => void
  onDelete: (id: string) => void
}) {
  const isDeleted = comment.deleted_at !== null
  const isOwn = comment.author_id === currentUserId
  const showAsRight = isAdmin && isOwnAdmin ? isOwn : !isOwn && isAdmin

  return (
    <div className={cn('flex', showAsRight ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
          showAsRight
            ? 'bg-[#1E3A5F] text-white rounded-br-sm'
            : 'bg-white border border-[#E5E7EB] text-[#1E3A5F] rounded-bl-sm'
        )}
      >
        {isDeleted ? (
          <p className="text-sm italic opacity-60">[삭제된 메시지]</p>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
            <div className={cn('flex items-center gap-2 mt-1', showAsRight ? 'justify-end' : 'justify-start')}>
              <span className={cn('text-xs', showAsRight ? 'text-white/60' : 'text-[#6B7280]')}>
                {new Date(comment.created_at).toLocaleString('ko-KR', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {!isDeleted && (
                <>
                  <button
                    type="button"
                    onClick={() => onReply(comment.id)}
                    className={cn(
                      'text-xs flex items-center gap-0.5 hover:underline',
                      showAsRight ? 'text-white/70' : 'text-[#3B82F6]'
                    )}
                  >
                    <CornerDownRight className="h-3 w-3" />
                    답글
                  </button>
                  {(isOwn || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => onDelete(comment.id)}
                      className={cn(
                        'text-xs flex items-center gap-0.5 hover:underline',
                        showAsRight ? 'text-white/70' : 'text-red-400'
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                      삭제
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function CommentThread({
  requestId,
  initialComments,
  currentUserId,
  isAdmin,
}: CommentThreadProps) {
  const [comments, setComments] = useState<CommentWithChildren[]>(initialComments)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createClientBrowser()
    const channel = supabase
      .channel(`comments:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ippp_comments',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComment = payload.new as Comment
            setComments((prev) => {
              if (newComment.parent_id) {
                return prev.map((c) =>
                  c.id === newComment.parent_id
                    ? { ...c, children: [...(c.children ?? []), newComment] }
                    : c
                )
              }
              return [...prev, { ...newComment, children: [] }]
            })
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Comment
            setComments((prev) =>
              prev.map((c) => {
                if (c.id === updated.id) return { ...c, ...updated }
                return {
                  ...c,
                  children: (c.children ?? []).map((child) =>
                    child.id === updated.id ? { ...child, ...updated } : child
                  ),
                }
              })
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [requestId])

  const handleSubmit = () => {
    if (!content.trim()) return
    const text = content.trim()
    setContent('')
    const parent = replyTo
    setReplyTo(null)

    startTransition(async () => {
      await createCommentAction(requestId, text, parent ?? undefined)
    })
  }

  const handleDelete = (commentId: string) => {
    if (!confirm('코멘트를 삭제하시겠습니까?')) return
    startTransition(async () => {
      await softDeleteCommentAction(commentId)
    })
  }

  const replyTarget = replyTo
    ? comments.find((c) => c.id === replyTo)
    : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {comments.length === 0 ? (
          <div className="text-center py-12 text-[#6B7280] text-sm">
            첫 번째 코멘트를 작성하세요.
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="space-y-2 animate-in slide-in-from-bottom-2 duration-150">
              <CommentBubble
                comment={c}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                isOwnAdmin={isAdmin}
                onReply={setReplyTo}
                onDelete={handleDelete}
              />
              {(c.children ?? []).map((child) => (
                <div key={child.id} className="ml-6">
                  <CommentBubble
                    comment={child}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    isOwnAdmin={isAdmin}
                    onReply={() => {}} // 2단 답글 비허용
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#E5E7EB] p-4 space-y-2">
        {replyTarget && (
          <div className="flex items-center gap-2 rounded-md bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs text-blue-700">
            <CornerDownRight className="h-3 w-3 shrink-0" />
            <span className="truncate flex-1">
              답글: "{replyTarget.content.slice(0, 40)}..."
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="font-bold hover:text-blue-900"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={replyTo ? '답글을 입력하세요...' : '코멘트를 입력하세요...'}
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={isPending || !content.trim()}
            size="icon"
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white h-[62px] w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-[#6B7280]">Ctrl+Enter로 빠른 전송</p>
      </div>
    </div>
  )
}
