'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { AgencyAvatar } from '@/components/shared/AgencyAvatar'
import type { AgencyReportRow } from '@/types'

interface AgencyPerformanceTableProps {
  data: AgencyReportRow[]
}

type SortKey = keyof Omit<AgencyReportRow, 'agency_id'>
type SortDir = 'asc' | 'desc'

export function AgencyPerformanceTable({ data }: AgencyPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('agency_name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey]
    const vb = b[sortKey]
    if (va === null || va === undefined) return 1
    if (vb === null || vb === undefined) return -1
    if (typeof va === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
    }
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1" />
  }

  const SortButton = ({ col, label }: { col: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
      onClick={() => handleSort(col)}
    >
      {label}
      <SortIcon col={col} />
    </Button>
  )

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-[#6B7280]">
        해당 기간에 검증 건이 없습니다.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#E5E7EB] overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead><SortButton col="agency_name" label="기관명" /></TableHead>
            <TableHead className="text-center"><SortButton col="total" label="총 건수" /></TableHead>
            <TableHead className="text-center"><SortButton col="completed" label="완료 건" /></TableHead>
            <TableHead className="text-center"><SortButton col="completionRate" label="완료율(%)" /></TableHead>
            <TableHead className="text-center"><SortButton col="avgDays" label="평균 소요일" /></TableHead>
            <TableHead className="text-center">미완료 건</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.agency_id} className="hover:bg-gray-50">
              <TableCell>
                <div className="flex items-center gap-2">
                  <AgencyAvatar name={row.agency_name} size="sm" />
                  <span className="font-medium">{row.agency_name}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">{row.total}</TableCell>
              <TableCell className="text-center text-emerald-600 font-medium">{row.completed}</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${row.completionRate}%` }}
                    />
                  </div>
                  <span className="text-sm">{row.completionRate.toFixed(0)}%</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {row.avgDays !== null ? `${row.avgDays.toFixed(1)}일` : '-'}
              </TableCell>
              <TableCell className="text-center">
                <span className={row.total - row.completed > 0 ? 'text-amber-600 font-medium' : 'text-[#6B7280]'}>
                  {row.total - row.completed}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
