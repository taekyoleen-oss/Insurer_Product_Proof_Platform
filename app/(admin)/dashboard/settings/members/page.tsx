import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InternalMembersClient } from './InternalMembersClient'
import type { InternalMember } from '@/types'

export default async function SettingsMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: self } = await supabase
    .from('ippp_internal_members')
    .select('internal_role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!self) redirect('/')

  // super_admin 전용
  if (self.internal_role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <p className="text-[#EF4444] font-medium">접근 권한이 없습니다.</p>
        <p className="text-sm text-[#6B7280]">최고 관리자(super_admin)만 접근할 수 있습니다.</p>
      </div>
    )
  }

  const { data: members } = await supabase
    .from('ippp_internal_members')
    .select('*')
    .order('created_at')

  return (
    <InternalMembersClient
      members={(members ?? []) as InternalMember[]}
      currentUserId={user.id}
    />
  )
}
