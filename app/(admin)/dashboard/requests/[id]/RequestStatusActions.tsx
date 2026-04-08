'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateRequestStatus, completeRequest } from '@/lib/actions/requests'
import { CheckCircle2, ChevronDown, PauseCircle, Play, ArrowRight } from 'lucide-react'
import type { RequestStatus } from '@/types'

interface RequestStatusActionsProps {
  requestId: string
  currentStatus: RequestStatus
  hasFile: boolean
}

export function RequestStatusActions({
  requestId,
  currentStatus,
  hasFile,
}: RequestStatusActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleStatusChange = (newStatus: RequestStatus) => {
    setError(null)
    startTransition(async () => {
      try {
        await updateRequestStatus(requestId, newStatus)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.')
      }
    })
  }

  const handleComplete = () => {
    if (!hasFile) {
      setError('완료 처리 전 파일을 업로드해야 합니다.')
      return
    }
    if (!confirm('검증 건을 완료 처리하시겠습니까? 아카이브에 등록됩니다.')) return
    setError(null)
    startTransition(async () => {
      try {
        await completeRequest(requestId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '완료 처리에 실패했습니다.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="text-xs text-red-500 text-right max-w-[200px]">{error}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {currentStatus === 'draft' && (
          <Button
            onClick={() => handleStatusChange('in_progress')}
            disabled={isPending}
            size="sm"
            className="bg-[#3B82F6] hover:bg-blue-600 text-white"
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            진행 시작
          </Button>
        )}

        {currentStatus === 'in_progress' && (
          <>
            <Button
              onClick={() => handleStatusChange('hold')}
              disabled={isPending}
              variant="outline"
              size="sm"
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <PauseCircle className="h-3.5 w-3.5 mr-1" />
              보류
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isPending || !hasFile}
              size="sm"
              className={hasFile ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
              title={!hasFile ? '파일 업로드 후 완료 처리 가능' : '완료 처리'}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              완료 처리
            </Button>
          </>
        )}

        {currentStatus === 'hold' && (
          <Button
            onClick={() => handleStatusChange('in_progress')}
            disabled={isPending}
            size="sm"
            className="bg-[#3B82F6] hover:bg-blue-600 text-white"
          >
            <ArrowRight className="h-3.5 w-3.5 mr-1" />
            재개
          </Button>
        )}

        {currentStatus === 'completed' && (
          <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            완료된 검증 건
          </span>
        )}
      </div>
    </div>
  )
}
