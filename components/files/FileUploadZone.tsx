'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, CheckCircle2, X, FileIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadFileAction } from '@/lib/actions/files'

const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100MB

interface UploadItem {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

interface FileUploadZoneProps {
  requestId: string
  agencyId: string
  onUploaded?: () => void
  disabled?: boolean
}

export function FileUploadZone({ requestId, agencyId, onUploaded, disabled }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadItem[] = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE_BYTES) {
        newItems.push({ file, status: 'error', progress: 0, error: '100MB 초과 파일' })
      } else {
        newItems.push({ file, status: 'pending', progress: 0 })
      }
    }
    setItems((prev) => [...prev, ...newItems])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const uploadAll = () => {
    const pendingItems = items.filter((i) => i.status === 'pending')
    if (pendingItems.length === 0) return

    startTransition(async () => {
      for (const item of pendingItems) {
        setItems((prev) =>
          prev.map((i) => (i.file === item.file ? { ...i, status: 'uploading', progress: 30 } : i))
        )

        const formData = new FormData()
        formData.set('file', item.file)
        formData.set('request_id', requestId)
        formData.set('agency_id', agencyId)

        try {
          const result = await uploadFileAction(formData)
          if (result?.error) {
            setItems((prev) =>
              prev.map((i) =>
                i.file === item.file
                  ? { ...i, status: 'error', progress: 0, error: result.error }
                  : i
              )
            )
          } else {
            setItems((prev) =>
              prev.map((i) =>
                i.file === item.file ? { ...i, status: 'done', progress: 100 } : i
              )
            )
          }
        } catch {
          setItems((prev) =>
            prev.map((i) =>
              i.file === item.file ? { ...i, status: 'error', progress: 0, error: '업로드 실패' } : i
            )
          )
        }
      }
      onUploaded?.()
    })
  }

  const removeItem = (file: File) => {
    setItems((prev) => prev.filter((i) => i.file !== file))
  }

  const hasPending = items.some((i) => i.status === 'pending')

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          isDragOver ? 'border-[#3B82F6] bg-blue-50' : 'border-[#E5E7EB] hover:border-[#3B82F6]',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          disabled={disabled}
        />
        <Upload className="mx-auto h-8 w-8 text-[#6B7280] mb-2" />
        <p className="text-sm font-medium text-[#1E3A5F]">
          파일을 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-xs text-[#6B7280] mt-1">파일 형식 무제한 · 최대 100MB</p>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-md border border-[#E5E7EB] bg-white p-3"
            >
              <FileIcon className="h-4 w-4 shrink-0 text-[#6B7280]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-[#6B7280]">
                  {(item.file.size / 1024 / 1024).toFixed(1)}MB
                </p>
                {item.status === 'uploading' && (
                  <Progress value={item.progress} className="h-1 mt-1" />
                )}
                {item.status === 'error' && (
                  <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
                )}
              </div>
              <div className="shrink-0">
                {item.status === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 animate-in zoom-in" />
                ) : item.status !== 'uploading' ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeItem(item.file) }}
                    className="text-[#6B7280] hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          {hasPending && (
            <Button
              onClick={uploadAll}
              disabled={isPending}
              className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
            >
              {isPending ? '업로드 중...' : `${items.filter((i) => i.status === 'pending').length}개 파일 업로드`}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
