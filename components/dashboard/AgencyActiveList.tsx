'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AgencyAvatar } from '@/components/shared/AgencyAvatar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar, ChevronRight } from 'lucide-react'
import type { RequestWithAgency } from '@/types'

interface AgencyActiveListProps {
  agencyActiveCounts: { agency_id: string; agency_name: string; count: number }[]
  activeRequests: RequestWithAgency[]
}

export function AgencyActiveList({ agencyActiveCounts, activeRequests }: AgencyActiveListProps) {
  const [selectedAgency, setSelectedAgency] = useState<{
    id: string
    name: string
  } | null>(null)
  const router = useRouter()

  const agencyRequests = selectedAgency
    ? activeRequests.filter((r) => r.agency_id === selectedAgency.id)
    : []

  return (
    <>
      <Card className="border-[#E5E7EB]">
        <CardContent className="p-0">
          {agencyActiveCounts.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              활성 건을 보유한 기관이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-[#E5E7EB]">
              {agencyActiveCounts.map((a) => (
                <li
                  key={a.agency_id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                  onClick={() => setSelectedAgency({ id: a.agency_id, name: a.agency_name })}
                >
                  <AgencyAvatar name={a.agency_name} size="sm" />
                  <span className="flex-1 text-sm font-medium truncate">{a.agency_name}</span>
                  <span className="text-sm font-bold text-[#1E3A5F]">{a.count}건</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedAgency}
        onOpenChange={(open: boolean) => !open && setSelectedAgency(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">{selectedAgency?.name}</DialogTitle>
            <p className="text-xs text-[#6B7280]">활성 검증 건 목록 (진행중 + 보류)</p>
          </DialogHeader>

          <div className="min-h-0">
            {agencyRequests.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#6B7280]">
                해당 기관의 활성 건이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-[#E5E7EB]">
                {agencyRequests.map((req) => (
                  <li
                    key={req.id}
                    className="flex items-center gap-3 py-2.5 px-1 rounded-lg cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                    onClick={() => {
                      setSelectedAgency(null)
                      router.push(`/dashboard/requests/${req.id}`)
                    }}
                  >
                    <StatusBadge status={req.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1E3A5F] truncate">{req.title}</p>
                      {req.due_date && (
                        <p className="flex items-center gap-1 text-xs text-[#6B7280] mt-0.5">
                          <Calendar className="h-3 w-3" />
                          마감: {new Date(req.due_date).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedAgency(null)}>
              닫기
            </Button>
            <Button
              size="sm"
              className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
              onClick={() => {
                setSelectedAgency(null)
                router.push('/dashboard/requests')
              }}
            >
              자세히 보기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
