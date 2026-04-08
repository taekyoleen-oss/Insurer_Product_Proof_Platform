'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import type { Agency } from '@/types'

interface FilterBarProps {
  agencies?: Pick<Agency, 'id' | 'name'>[]
  showFiscalYear?: boolean
  showStatus?: boolean
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

export function FilterBar({ agencies = [], showFiscalYear = true, showStatus = true }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === 'all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      return params.toString()
    },
    [searchParams]
  )

  const handleChange = (key: string, value: string | null) => {
    const qs = createQueryString({ [key]: value })
    router.push(`${pathname}?${qs}`)
  }

  const hasFilters =
    searchParams.has('status') ||
    searchParams.has('agency_id') ||
    searchParams.has('fiscal_year') ||
    searchParams.has('keyword')

  const clearFilters = () => {
    router.push(pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
        <Input
          placeholder="제목 키워드 검색..."
          defaultValue={searchParams.get('keyword') ?? ''}
          className="pl-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleChange('keyword', (e.target as HTMLInputElement).value || null)
            }
          }}
          onBlur={(e) => {
            const current = searchParams.get('keyword') ?? ''
            if (e.target.value !== current) {
              handleChange('keyword', e.target.value || null)
            }
          }}
        />
      </div>

      {showStatus && (
        <Select
          value={searchParams.get('status') ?? 'all'}
          onValueChange={(v) => handleChange('status', v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="draft">초안</SelectItem>
            <SelectItem value="in_progress">진행중</SelectItem>
            <SelectItem value="hold">보류</SelectItem>
            <SelectItem value="completed">완료</SelectItem>
          </SelectContent>
        </Select>
      )}

      {agencies.length > 0 && (
        <Select
          value={searchParams.get('agency_id') ?? 'all'}
          onValueChange={(v) => handleChange('agency_id', v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="기관 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 기관</SelectItem>
            {agencies.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showFiscalYear && (
        <Select
          value={searchParams.get('fiscal_year') ?? 'all'}
          onValueChange={(v) => handleChange('fiscal_year', v)}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue placeholder="연도" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 연도</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[#6B7280]">
          <X className="h-4 w-4 mr-1" />
          필터 초기화
        </Button>
      )}
    </div>
  )
}
