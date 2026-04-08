import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AgencyAvatar } from '@/components/shared/AgencyAvatar'
import { DeadlineCountdown } from '@/components/shared/DeadlineCountdown'
import { cn } from '@/lib/utils'
import type { RequestWithAgency, RequestStatus } from '@/types'
import { Calendar } from 'lucide-react'

interface RequestCardProps {
  request: RequestWithAgency
  href: string
}

const STATUS_BORDER: Record<RequestStatus, string> = {
  draft: 'border-l-gray-400',
  in_progress: 'border-l-blue-500',
  hold: 'border-l-amber-500',
  completed: 'border-l-emerald-500',
}

function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= 7
}

export function RequestCard({ request, href }: RequestCardProps) {
  const dueSoon = isDueSoon(request.due_date)

  return (
    <Link href={href} className="block group">
      <Card
        className={cn(
          'border-l-4 transition-shadow hover:shadow-md cursor-pointer',
          STATUS_BORDER[request.status],
          dueSoon && request.status !== 'completed' ? 'animate-pulse' : ''
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={request.status} />
                {request.type === 'hazard_rate' && (
                  <span className="text-xs text-[#6B7280] bg-gray-100 rounded px-1.5 py-0.5">
                    위험률
                  </span>
                )}
                {request.type === 'product' && (
                  <span className="text-xs text-[#6B7280] bg-gray-100 rounded px-1.5 py-0.5">
                    상품
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-[#1E3A5F] truncate group-hover:underline">
                {request.title}
              </h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-[#6B7280]">
                <span className="flex items-center gap-1">
                  <AgencyAvatar name={request.agency.name} size="sm" />
                  {request.agency.name}
                </span>
                {request.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(request.due_date).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <DeadlineCountdown dueDate={request.due_date} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
