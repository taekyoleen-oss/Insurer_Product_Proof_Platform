'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Download, Trash2, History, FileIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { softDeleteFileAction } from '@/lib/actions/files'
import type { IpppFile } from '@/types'

interface FileVersionHistoryProps {
  files: IpppFile[]
  requestId: string
  currentUserId: string
  isAdmin?: boolean
  onDeleted?: () => void
}

async function getSignedUrl(storagePath: string): Promise<string> {
  const res = await fetch('/api/files/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storage_path: storagePath }),
  })
  if (!res.ok) throw new Error('URL 발급 실패')
  const data = await res.json() as { url: string }
  return data.url
}

function FileRow({
  file,
  isLatest,
  currentUserId,
  isAdmin,
  onDeleted,
}: {
  file: IpppFile
  isLatest: boolean
  currentUserId: string
  isAdmin: boolean
  onDeleted?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleDownload = async () => {
    const url = await getSignedUrl(file.storage_path)
    const a = document.createElement('a')
    a.href = url
    a.download = file.filename
    a.click()
  }

  const handleDelete = () => {
    if (!confirm(`"${file.filename}" 파일을 삭제하시겠습니까?`)) return
    startTransition(async () => {
      await softDeleteFileAction(file.id)
      onDeleted?.()
    })
  }

  const canDelete = isAdmin || file.uploader_id === currentUserId

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-md group',
        file.deleted_at ? 'opacity-40' : 'hover:bg-gray-50',
        isLatest ? 'bg-white' : 'ml-4 text-sm'
      )}
    >
      <FileIcon className="h-4 w-4 shrink-0 text-[#6B7280]" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate text-sm">
            {file.filename}
          </span>
          {isLatest && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">최신</span>
          )}
          <span className="text-xs text-[#6B7280]">v{file.version}</span>
        </div>
        <p className="text-xs text-[#6B7280]">
          {new Date(file.created_at).toLocaleString('ko-KR')}
          {file.file_size && ` · ${(file.file_size / 1024 / 1024).toFixed(1)}MB`}
        </p>
      </div>
      {!file.deleted_at && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-600"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface FileGroup {
  filename: string
  versions: IpppFile[]
}

export function FileVersionHistory({
  files,
  requestId: _requestId,
  currentUserId,
  isAdmin = false,
  onDeleted,
}: FileVersionHistoryProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-[#6B7280] text-sm">
        업로드된 파일이 없습니다.
      </div>
    )
  }

  // 파일명으로 그룹핑
  const groups = Object.values(
    files.reduce<Record<string, FileGroup>>((acc, file) => {
      if (!acc[file.filename]) {
        acc[file.filename] = { filename: file.filename, versions: [] }
      }
      acc[file.filename].versions.push(file)
      return acc
    }, {})
  )

  return (
    <div className="space-y-1">
      {groups.map((group) => {
        const latest = group.versions[0]
        const hasHistory = group.versions.length > 1
        const isOpen = expanded[group.filename]

        return (
          <div key={group.filename} className="border border-[#E5E7EB] rounded-md overflow-hidden">
            <FileRow
              file={latest}
              isLatest={true}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDeleted={onDeleted}
            />
            {hasHistory && (
              <>
                <div className="border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [group.filename]: !prev[group.filename] }))}
                    className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-[#6B7280] hover:bg-gray-50 transition-colors"
                  >
                    <History className="h-3 w-3" />
                    이전 버전 보기 ({group.versions.length - 1}개)
                    {isOpen ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
                  </button>
                </div>
                {isOpen && (
                  <div className="bg-gray-50 border-t border-[#E5E7EB] py-1">
                    {group.versions.slice(1).map((f) => (
                      <FileRow
                        key={f.id}
                        file={f}
                        isLatest={false}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        onDeleted={onDeleted}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
