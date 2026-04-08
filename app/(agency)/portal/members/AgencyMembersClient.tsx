'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AgencyAvatar } from '@/components/shared/AgencyAvatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { inviteUserAction } from '@/lib/actions/invitations'
import { UserPlus } from 'lucide-react'
import type { AgencyMember } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  members: AgencyMember[]
  agencyId: string
  currentUserId: string
}

export function AgencyMembersClient({ members: initialMembers, agencyId, currentUserId }: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [open, setOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await inviteUserAction(inviteEmail.trim(), 'agency_member', agencyId)
      toast.success(`${inviteEmail}로 초대 이메일을 발송했습니다.`)
      setInviteEmail('')
      setOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setInviting(false)
    }
  }

  const handleDeactivate = async (memberId: string, memberName: string) => {
    if (!confirm(`${memberName} 멤버를 비활성화하시겠습니까?`)) return
    try {
      const { error } = await supabase
        .from('ippp_agency_members')
        .update({ is_active: false })
        .eq('id', memberId)

      if (error) throw error

      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, is_active: false } : m))
      toast.success(`${memberName} 멤버가 비활성화되었습니다.`)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E3A5F]">멤버 관리</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">기관 담당자를 관리합니다.</p>
        </div>

        <Button className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white" onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          멤버 초대
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>멤버 초대</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="inviteEmail">이메일</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="초대할 이메일 주소"
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                />
              </div>
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
              >
                {inviting ? '초대 중...' : '초대 발송'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden">
        {members.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B7280]">
            멤버가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <AgencyAvatar name={m.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-[#6B7280] truncate">{m.email}</p>
                  {m.phone && (
                    <p className="text-xs text-[#6B7280]">{m.phone}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.agency_role === 'agency_admin' ? 'default' : 'secondary'} className="text-xs">
                    {m.agency_role === 'agency_admin' ? '관리자' : '멤버'}
                  </Badge>
                  {!m.is_active && (
                    <Badge variant="outline" className="text-xs text-[#EF4444] border-[#EF4444]">
                      비활성
                    </Badge>
                  )}
                  {m.is_active && m.user_id !== currentUserId && m.agency_role !== 'agency_admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#EF4444] hover:text-[#EF4444] hover:bg-red-50 h-7"
                      onClick={() => handleDeactivate(m.id, m.name)}
                    >
                      비활성화
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
