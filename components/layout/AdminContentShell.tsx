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

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* 모바일 사이드바 — Fragment로 transform 컨테이너 밖에 배치하여 fixed가 뷰포트 기준으로 동작 */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 w-60 z-40 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <AdminSidebar isSuperAdmin={isSuperAdmin} userName={userName} />
      </div>

      {/* 컨텐츠 영역 — translate 대신 margin으로 push (transform은 fixed 자식의 기준점을 바꾸는 CSS 버그 유발) */}
      <div
        className={cn(
          'flex-1 min-w-0 flex flex-col',
          open ? 'max-lg:ml-60' : 'max-lg:ml-0'
        )}
        style={{ transition: 'margin-left 300ms ease-in-out' }}
      >
        {/* 모바일 헤더 */}
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
      </div>

      {/* 백드롭 — 사이드바 외부 클릭 시 닫기 */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
