import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminContentShell } from '@/components/layout/AdminContentShell'

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

      {/* 모바일 사이드바 + 메인 컨텐츠 */}
      <AdminContentShell isSuperAdmin={isSuperAdmin} userName={member.name}>
        {children}
      </AdminContentShell>
    </div>
  )
}
