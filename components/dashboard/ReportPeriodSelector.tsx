'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ReportPeriod } from '@/types'

type TabValue = ReportPeriod['type']

function getPeriodDates(type: TabValue): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  switch (type) {
    case 'month':
      return {
        start: fmt(new Date(y, m, 1)),
        end: fmt(new Date(y, m + 1, 0)),
      }
    case 'quarter': {
      const q = Math.floor(m / 3)
      return {
        start: fmt(new Date(y, q * 3, 1)),
        end: fmt(new Date(y, q * 3 + 3, 0)),
      }
    }
    case 'half': {
      const firstHalf = m < 6
      return {
        start: firstHalf ? fmt(new Date(y, 0, 1)) : fmt(new Date(y, 6, 1)),
        end: firstHalf ? fmt(new Date(y, 5, 30)) : fmt(new Date(y, 11, 31)),
      }
    }
    case 'year':
      return {
        start: fmt(new Date(y, 0, 1)),
        end: fmt(new Date(y, 11, 31)),
      }
    case 'last12months': {
      const end = new Date()
      const start = new Date()
      start.setFullYear(start.getFullYear() - 1)
      return { start: fmt(start), end: fmt(end) }
    }
    default:
      return { start: '', end: '' }
  }
}

const TAB_LABELS: Record<TabValue, string> = {
  month: '이번달',
  quarter: '이번분기',
  half: '반기',
  year: '올해',
  last12months: '직전 12개월',
  custom: '직접 설정',
}

export function ReportPeriodSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentType = (searchParams.get('period') as TabValue) ?? 'month'
  const [customStart, setCustomStart] = useState(searchParams.get('start') ?? '')
  const [customEnd, setCustomEnd] = useState(searchParams.get('end') ?? '')

  const applyPeriod = (type: TabValue, start?: string, end?: string) => {
    const params = new URLSearchParams()
    params.set('period', type)
    if (type === 'custom') {
      if (start) params.set('start', start)
      if (end) params.set('end', end)
    } else {
      const dates = getPeriodDates(type)
      params.set('start', dates.start)
      params.set('end', dates.end)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      <Tabs
        value={currentType}
        onValueChange={(v) => {
          const t = v as TabValue
          if (t !== 'custom') applyPeriod(t)
          else applyPeriod('custom', customStart, customEnd)
        }}
      >
        <TabsList className="flex-wrap h-auto gap-1">
          {(Object.keys(TAB_LABELS) as TabValue[]).map((key) => (
            <TabsTrigger key={key} value={key} className="text-sm">
              {TAB_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {currentType === 'custom' && (
        <div className="flex items-end gap-2 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">시작일</Label>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">종료일</Label>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-36"
            />
          </div>
          <Button
            onClick={() => applyPeriod('custom', customStart, customEnd)}
            disabled={!customStart || !customEnd}
            className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90"
          >
            적용
          </Button>
        </div>
      )}
    </div>
  )
}
