'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KPICard } from '@/components/shared/KPICard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AgencyAvatar } from '@/components/shared/AgencyAvatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'
import type { RequestWithAgency, AdminKpi } from '@/types'

type PopupType = 'totalActive' | 'completedThisMonth' | 'dueSoon' | 'agencies' | null

interface DashboardKPICardsProps {
  kpi: AdminKpi
  activeRequests: RequestWithAgency[]
  dueSoonRequests: RequestWithAgency[]
  completedThisMonth: RequestWithAgency[]
}

const MAX_LIST_ITEMS = 10

export function DashboardKPICards({
  kpi,
  activeRequests,
  dueSoonRequests,
  completedThisMonth,
}: DashboardKPICardsProps) {
  const [openPopup, setOpenPopup] = useState<PopupType>(null)
  const router = useRouter()

  const closePopup = () => setOpenPopup(null)

  const navigateTo = (href: string) => {
    closePopup()
    router.push(href)
  }

  const popupData: Record<
    Exclude<PopupType, 'agencies' | null>,
    { title: string; description: string; href: string; requests: RequestWithAgency[] }
  > = {
    totalActive: {
      title: '전체 활성 건수',
      description: '진행중 및 보류 상태의 검증 건 목록입니다.',
      href: '/dashboard/requests',
      requests: activeRequests,
    },
    completedThisMonth: {
      title: '이번 달 완료',
      description: '이번 달 완료된 검증 건 목록입니다.',
      href: '/dashboard/archive',
      requests: completedThisMonth,
    },
    dueSoon: {
      title: 'D-7 마감 임박',
      description: '7일 이내 마감 예정인 검증 건 목록입니다.',
      href: '/dashboard/requests',
      requests: dueSoonRequests,
    },
  }

  const cardButtonClass =
    'text-left w-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F]/30 cursor-pointer'

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button onClick={() => setOpenPopup('totalActive')} className={cardButtonClass}>
          <KPICard
            title="전체 활성 건수"
            value={kpi.totalActive}
            icon={<FileCheck className="h-5 w-5" />}
            description="진행중 + 보류"
          />
        </button>
        <button onClick={() => setOpenPopup('completedThisMonth')} className={cardButtonClass}>
          <KPICard
            title="이번 달 완료"
            value={kpi.completedThisMonth}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </button>
        <button onClick={() => setOpenPopup('dueSoon')} className={cardButtonClass}>
          <KPICard
            title="D-7 마감 임박"
            value={kpi.dueSoonCount}
            icon={<AlertTriangle className="h-5 w-5" />}
            description="7일 이내 마감"
          />
        </button>
        <button onClick={() => setOpenPopup('agencies')} className={cardButtonClass}>
          <KPICard
            title="참여 기관 수"
            value={kpi.agencyActiveCounts.length}
            icon={<Building2 className="h-5 w-5" />}
            description="활성 건 보유 기관"
          />
        </button>
      </div>

      {/* 검증 건 팝업 (전체 활성 / 이번 달 완료 / D-7) */}
      {(['totalActive', 'completedThisMonth', 'dueSoon'] as const).map((type) => {
        const data = popupData[type]
        const visible = data.requests.slice(0, MAX_LIST_ITEMS)
        const remaining = data.requests.length - MAX_LIST_ITEMS

        return (
          <Dialog
            key={type}
            open={openPopup === type}
            onOpenChange={(open: boolean) => !open && closePopup()}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-[#1E3A5F]">{data.title}</DialogTitle>
                <p className="text-xs text-[#6B7280]">{data.description}</p>
              </DialogHeader>

              <div className="min-h-0">
                {visible.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[#6B7280]">
                    해당하는 건이 없습니다.
                  </div>
                ) : (
                  <ul className="divide-y divide-[#E5E7EB]">
                    {visible.map((req) => (
                      <li
                        key={req.id}
                        className="flex items-center gap-3 py-2.5 px-1 rounded-lg cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                        onClick={() => {
                          closePopup()
                          router.push(`/dashboard/requests/${req.id}`)
                        }}
                      >
                        <StatusBadge status={req.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1E3A5F] truncate">
                            {req.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-0.5">
                            <span className="flex items-center gap-1">
                              <AgencyAvatar name={req.agency.name} size="sm" />
                              {req.agency.name}
                            </span>
                            {req.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(req.due_date).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0" />
                      </li>
                    ))}
                  </ul>
                )}
                {remaining > 0 && (
                  <p className="mt-2 text-center text-xs text-[#6B7280]">
                    외 {remaining}건 더 있습니다
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={closePopup}>
                  닫기
                </Button>
                <Button
                  size="sm"
                  className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
                  onClick={() => navigateTo(data.href)}
                >
                  자세히 보기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })}

      {/* 참여 기관 수 팝업 */}
      <Dialog
        open={openPopup === 'agencies'}
        onOpenChange={(open: boolean) => !open && closePopup()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">참여 기관 수</DialogTitle>
            <p className="text-xs text-[#6B7280]">활성 건을 보유한 기관 목록입니다.</p>
          </DialogHeader>

          <div className="min-h-0">
            {kpi.agencyActiveCounts.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#6B7280]">
                활성 건을 보유한 기관이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-[#E5E7EB]">
                {kpi.agencyActiveCounts.map((a) => (
                  <li
                    key={a.agency_id}
                    className="flex items-center gap-3 py-2.5 px-1 rounded-lg cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                    onClick={() => navigateTo(`/dashboard/agencies`)}
                  >
                    <AgencyAvatar name={a.agency_name} size="sm" />
                    <span className="flex-1 text-sm font-medium truncate">{a.agency_name}</span>
                    <span className="text-sm font-bold text-[#1E3A5F]">{a.count}건</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closePopup}>
              닫기
            </Button>
            <Button
              size="sm"
              className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
              onClick={() => navigateTo('/dashboard/agencies')}
            >
              자세히 보기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
