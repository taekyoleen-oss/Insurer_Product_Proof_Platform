'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileCheck,
  Archive,
  BarChart2,
  Building2,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  superAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: '대시보드', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: '검증 건', href: '/dashboard/requests', icon: <FileCheck className="h-4 w-4" /> },
  { label: '아카이브', href: '/dashboard/archive', icon: <Archive className="h-4 w-4" /> },
  { label: '실적 리포트', href: '/dashboard/report', icon: <BarChart2 className="h-4 w-4" /> },
  { label: '기관 관리', href: '/dashboard/agencies', icon: <Building2 className="h-4 w-4" /> },
  {
    label: '내부 멤버',
    href: '/dashboard/settings/members',
    icon: <Settings className="h-4 w-4" />,
    superAdminOnly: true,
  },
]

interface AdminSidebarProps {
  isSuperAdmin?: boolean
  userName?: string
}

export function AdminSidebar({ isSuperAdmin = false, userName }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin)

  return (
    <aside className="flex h-full w-60 flex-col bg-[#1E3A5F] text-white">
      {/* 로고 */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">IPPP</p>
          <p className="text-[10px] text-white/50 leading-tight">Insurer Product Proof Platform</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 하단 사용자 */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{userName ?? '관리자'}</p>
            <p className="text-xs text-white/50">
              {isSuperAdmin ? '슈퍼 관리자' : '관리자'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
