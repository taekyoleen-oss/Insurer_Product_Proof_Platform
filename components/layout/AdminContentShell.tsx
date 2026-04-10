'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { cn } from '@/lib/utils'

interface AdminContentShellProps {
  isSuperAdmin: boolean
  userName: string
  children: React.ReactNode
}

export function AdminContentShell({ isSuperAdmin, userName, children }: AdminContentShellProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // 페이지 이동 시 사이드바 자동 닫기
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div
      className={cn(
        'flex-1 min-w-0 flex flex-col transition-transform duration-300 ease-in-out',
        open ? 'max-lg:translate-x-60' : 'max-lg:translate-x-0'
      )}
    >
      {/* 모바일 사이드바 (fixed, 왼쪽에서 슬라이드) */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 w-60 z-40 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <AdminSidebar isSuperAdmin={isSuperAdmin} userName={userName} />
      </div>

      {/* 모바일 헤더 (flow — fixed 아님) */}
      <div className="lg:hidden shrink-0 flex items-center gap-3 bg-[#1E3A5F] px-4 h-12">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="font-bold text-white text-sm">보험상품 검증 플랫폼</span>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 py-4 sm:py-6 lg:pt-6">
          {children}
        </div>
      </main>

      {/* 백드롭 — 사이드바 외부 클릭 시 닫기 */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
