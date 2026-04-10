import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AgencySidebar } from '@/components/layout/AgencySidebar'
import { AgencyContentShell } from '@/components/layout/AgencyContentShell'

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: member } = await supabase
    .from('ippp_agency_members')
    .select('name, agency_role, is_active, agency_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!member) redirect('/')

  const { data: agency } = await supabase
    .from('ippp_agencies')
    .select('name')
    .eq('id', member.agency_id)
    .single()

  const isAgencyAdmin = member.agency_role === 'agency_admin'

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* 데스크톱 사이드바 */}
      <div className="hidden lg:flex lg:shrink-0">
        <AgencySidebar
          isAgencyAdmin={isAgencyAdmin}
          userName={member.name}
          agencyName={agency?.name}
        />
      </div>

      {/* 모바일 push 사이드바 + 메인 컨텐츠 */}
      <AgencyContentShell
        isAgencyAdmin={isAgencyAdmin}
        userName={member.name}
        agencyName={agency?.name}
      >
        {children}
      </AgencyContentShell>
    </div>
  )
}
