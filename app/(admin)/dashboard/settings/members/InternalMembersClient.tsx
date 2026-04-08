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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { inviteUserAction } from '@/lib/actions/invitations'
import { UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { InternalMember } from '@/types'

interface Props {
  members: InternalMember[]
  currentUserId: string
}

export function InternalMembersClient({ members: initialMembers, currentUserId }: Props) {
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
      await inviteUserAction(inviteEmail.trim(), 'admin')
      toast.success(`${inviteEmail}로 관리자 초대 이메일을 발송했습니다.`)
      setInviteEmail('')
      setOpen(false)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setInviting(false)
    }
  }

  const handleDeactivate = async (member: InternalMember) => {
    if (!confirm(`${member.name} 관리자의 권한을 회수하시겠습니까?`)) return
    try {
      const { error } = await supabase
        .from('ippp_internal_members')
        .update({ is_active: false })
        .eq('id', member.id)

      if (error) throw error

      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, is_active: false } : m))
      toast.success(`${member.name} 관리자 권한이 회수되었습니다.`)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E3A5F]">내부 관리자 관리</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">내부 관리자를 초대하고 권한을 관리합니다.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white">
              <UserPlus className="h-4 w-4 mr-1.5" />
              관리자 초대
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>내부 관리자 초대</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-[#6B7280]">
                초대된 사용자는 <strong>admin</strong> 권한으로 등록됩니다.
              </p>
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

      <div className="rounded-lg border border-[#E5E7EB] overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead className="text-center">역할</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-center">가입일</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[#6B7280]">
                  등록된 관리자가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-sm text-[#6B7280]">{m.email}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={m.internal_role === 'super_admin' ? 'default' : 'secondary'}
                      className={m.internal_role === 'super_admin' ? 'bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]' : ''}
                    >
                      {m.internal_role === 'super_admin' ? '최고 관리자' : '관리자'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={m.is_active ? 'default' : 'secondary'}
                      className={m.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}
                    >
                      {m.is_active ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-[#6B7280]">
                    {new Date(m.created_at).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {m.is_active && m.user_id !== currentUserId && m.internal_role !== 'super_admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-[#EF4444] hover:text-[#EF4444] hover:bg-red-50"
                        onClick={() => handleDeactivate(m)}
                      >
                        권한 회수
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
