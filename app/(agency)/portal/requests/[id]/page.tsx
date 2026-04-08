import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRequestById } from '@/lib/supabase/queries/requests'
import { getFilesByRequest } from '@/lib/supabase/queries/files'
import { getCommentsByRequest } from '@/lib/supabase/queries/comments'
import { FileVersionHistory } from '@/components/files/FileVersionHistory'
import { FileUploadZone } from '@/components/files/FileUploadZone'
import { CommentThread } from '@/components/comments/CommentThread'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DeadlineCountdown } from '@/components/shared/DeadlineCountdown'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Calendar, Tag } from 'lucide-react'

export default async function AgencyRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: member } = await supabase
    .from('ippp_agency_members')
    .select('agency_id, name, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!member) redirect('/')

  const [request, files, comments] = await Promise.all([
    getRequestById(id),
    getFilesByRequest(id),
    getCommentsByRequest(id),
  ])

  // RLS에서 차단되면 null 반환
  if (!request) notFound()

  // 기관 일치 검증
  if (request.agency_id !== member.agency_id) notFound()

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={request.status} />
          <span className="text-xs text-[#6B7280] bg-gray-100 px-1.5 py-0.5 rounded">
            {request.type === 'hazard_rate' ? '위험률 검증' : '상품 검증'}
          </span>
        </div>
        <h1 className="text-xl font-bold text-[#1E3A5F]">{request.title}</h1>
        <div className="flex items-center gap-4 text-sm text-[#6B7280] flex-wrap">
          {request.due_date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              마감: {new Date(request.due_date).toLocaleDateString('ko-KR')}
            </span>
          )}
          <DeadlineCountdown dueDate={request.due_date} />
        </div>
      </div>

      {request.description && (
        <Card className="border-[#E5E7EB]">
          <CardContent className="p-4">
            <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{request.description}</p>
          </CardContent>
        </Card>
      )}

      {/* 위험률 / 상품 타입 태그 */}
      {(request.hazard_type?.length || request.product_type) && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-3.5 w-3.5 text-[#6B7280]" />
          {request.type === 'hazard_rate' &&
            request.hazard_type?.map((h) => (
              <span key={h} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                {h}
              </span>
            ))}
          {request.type === 'product' && request.product_type && (
            <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full border border-violet-100">
              {request.product_type}
            </span>
          )}
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 파일 섹션 */}
        <div className="space-y-4">
          <h2 className="font-semibold text-[#1E3A5F]">첨부 파일</h2>
          <FileVersionHistory
            files={files}
            requestId={request.id}
            currentUserId={user.id}
            isAdmin={false}
          />
          {request.status !== 'completed' && (
            <>
              <Separator />
              <h3 className="text-sm font-medium text-[#6B7280]">파일 업로드</h3>
              <FileUploadZone
                requestId={request.id}
                agencyId={request.agency_id}
                disabled={false}
              />
            </>
          )}
        </div>

        {/* 코멘트 섹션 */}
        <div className="space-y-3">
          <h2 className="font-semibold text-[#1E3A5F]">코멘트</h2>
          <Card className="border-[#E5E7EB] h-[500px] flex flex-col overflow-hidden">
            <CommentThread
              requestId={request.id}
              initialComments={comments}
              currentUserId={user.id}
              isAdmin={false}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
