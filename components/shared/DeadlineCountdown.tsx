import { cn } from '@/lib/utils'

interface DeadlineCountdownProps {
  dueDate: string | null
  className?: string
}

export function DeadlineCountdown({ dueDate, className }: DeadlineCountdownProps) {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffMs = due.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-red-50 text-red-600',
          className
        )}
      >
        기한초과 ({Math.abs(diffDays)}일)
      </span>
    )
  }

  if (diffDays === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 animate-pulse',
          className
        )}
      >
        D-Day
      </span>
    )
  }

  if (diffDays <= 7) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 animate-pulse',
          className
        )}
      >
        D-{diffDays}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500',
        className
      )}
    >
      D-{diffDays}
    </span>
  )
}
