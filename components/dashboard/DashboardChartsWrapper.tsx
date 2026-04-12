'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DashboardCharts = dynamic(
  () => import('./DashboardCharts').then((m) => m.DashboardCharts),
  { ssr: false, loading: () => <div className="h-[232px]" /> }
)

interface Props {
  statusCounts: { status: string; label: string; count: number }[]
  monthlyCompletion: { month: string; label: string; count: number }[]
  agencyActiveCounts: { agency_id: string; agency_name: string; count: number }[]
}

export function DashboardChartsWrapper(props: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      {/* 모바일 전용 토글 버튼 */}
      <div className="lg:hidden mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between border-[#E5E7EB] text-[#1E3A5F]"
        >
          <span className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            통계 차트 {open ? '닫기' : '보기'}
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* 모바일: open일 때만 표시 / PC(lg+): 항상 표시 */}
      <div className={`${open ? 'block' : 'hidden'} lg:block`}>
        <DashboardCharts {...props} />
      </div>
    </div>
  )
}
