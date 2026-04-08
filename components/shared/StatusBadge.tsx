import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, PauseCircle, FileEdit } from 'lucide-react'
import type { RequestStatus } from '@/types'

interface StatusBadgeProps {
  status: RequestStatus
  className?: string
}

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  draft: {
    label: '초안',
    icon: <FileEdit className="h-3 w-3" />,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  in_progress: {
    label: '진행중',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  hold: {
    label: '보류',
    icon: <PauseCircle className="h-3 w-3" />,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  completed: {
    label: '완료',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 text-xs font-medium transition-all duration-300 ${config.className} ${className ?? ''}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  )
}
