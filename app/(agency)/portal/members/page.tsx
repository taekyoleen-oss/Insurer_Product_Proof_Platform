import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AgencyMembersClient } from './AgencyMembersClient'
import type { AgencyMember } from '@/types'

export default async function AgencyMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: self } = await supabase
    .from('ippp_agency_members')
    .select('agency_id, agency_role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!self) redirect('/')

  // agency_admin 전용
  if (self.agency_role !== 'agency_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <p className="text-[#EF4444] font-medium">접근 권한이 없습니다.</p>
        <p className="text-sm text-[#6B7280]">기관 담당자(agency_admin)만 접근할 수 있습니다.</p>
      </div>
    )
  }

  const { data: members } = await supabase
    .from('ippp_agency_members')
    .select('*')
    .eq('agency_id', self.agency_id)
    .order('created_at')

  return (
    <AgencyMembersClient
      members={(members ?? []) as AgencyMember[]}
      agencyId={self.agency_id}
      currentUserId={user.id}
    />
  )
}
