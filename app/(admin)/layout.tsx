import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: member } = await supabase
    .from('ippp_internal_members')
    .select('name, internal_role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!member) redirect('/')

  const isSuperAdmin = member.internal_role === 'super_admin'

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* 데스크톱 사이드바 */}
      <div className="hidden lg:flex lg:shrink-0">
        <AdminSidebar isSuperAdmin={isSuperAdmin} userName={member.name} />
      </div>

      {/* 모바일 햄버거 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-[#1E3A5F] px-4 py-3">
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="text-white hover:bg-white/10" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-60 border-0">
            <AdminSidebar isSuperAdmin={isSuperAdmin} userName={member.name} />
          </SheetContent>
        </Sheet>
        <span className="font-bold text-white text-sm">IPPP — Insurer Product Proof Platform</span>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-6 py-6 pt-16 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  )
}
