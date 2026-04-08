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
import { AgencyAvatar } from '@/components/shared/AgencyAvatar'
import { toast } from 'sonner'
import { createAgencyAction, deactivateAgencyAction } from '@/lib/actions/agencies'
import { inviteAgencyAdmin } from '@/lib/actions/invitations'
import { Plus, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Agency } from '@/types'

interface Props {
  agencies: Agency[]
}

export function AgenciesClient({ agencies: initialAgencies }: Props) {
  const [agencies, setAgencies] = useState(initialAgencies)
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    contact_email: '',
    contract_date: '',
    address: '',
  })

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const agency = await createAgencyAction({
        name: form.name,
        phone: form.phone || undefined,
        contact_email: form.contact_email || undefined,
        contract_date: form.contract_date || undefined,
        address: form.address || undefined,
      })
      setAgencies((prev) => [...prev, agency as Agency].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: '', phone: '', contact_email: '', contract_date: '', address: '' })
      setCreateOpen(false)
      toast.success('기관이 생성되었습니다.')
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleInviteAdmin = async () => {
    if (!inviteEmail.trim() || !selectedAgency) return
    setInviting(true)
    try {
      await inviteAgencyAdmin(inviteEmail.trim(), selectedAgency.id)
      toast.success(`${selectedAgency.name}에 agency_admin 초대 이메일을 발송했습니다.`)
      setInviteEmail('')
      setInviteOpen(false)
      setSelectedAgency(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setInviting(false)
    }
  }

  const handleDeactivate = async (agency: Agency) => {
    if (!confirm(`${agency.name} 기관을 비활성화하시겠습니까?\n진행 중인 검증 건이 있을 경우 경고가 표시됩니다.`)) return
    try {
      const result = await deactivateAgencyAction(agency.id)
      if (result.warned) {
        toast.warning(`${agency.name}에 진행 중인 검증 건이 ${result.activeRequestCount}건 있습니다. 기관은 비활성화되었습니다.`)
      } else {
        toast.success(`${agency.name} 기관이 비활성화되었습니다.`)
      }
      setAgencies((prev) => prev.map((a) => a.id === agency.id ? { ...a, is_active: false } : a))
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E3A5F]">검증기관 관리</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">전체 {agencies.length}개 기관</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              기관 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 검증기관 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>기관명 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="기관명을 입력하세요"
                />
              </div>
              <div className="space-y-1.5">
                <Label>대표 연락처</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="02-0000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>대표 이메일</Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                  placeholder="contact@agency.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>계약 날짜</Label>
                <Input
                  type="date"
                  value={form.contract_date}
                  onChange={(e) => setForm((f) => ({ ...f, contract_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>주소</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="소재지"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
              >
                {saving ? '생성 중...' : '기관 생성'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 초대 다이얼로그 */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { setInviteOpen(v); if (!v) { setInviteEmail(''); setSelectedAgency(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>agency_admin 초대 — {selectedAgency?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>이메일</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="초대할 이메일 주소"
                onKeyDown={(e) => e.key === 'Enter' && handleInviteAdmin()}
              />
            </div>
            <Button
              onClick={handleInviteAdmin}
              disabled={inviting || !inviteEmail.trim()}
              className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
            >
              {inviting ? '초대 중...' : '초대 발송'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-[#E5E7EB] overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>기관명</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>계약일</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[#6B7280]">
                  등록된 기관이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              agencies.map((a) => (
                <TableRow key={a.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AgencyAvatar name={a.name} size="sm" />
                      <span className="font-medium">{a.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#6B7280]">{a.phone ?? '-'}</TableCell>
                  <TableCell className="text-sm text-[#6B7280]">{a.contact_email ?? '-'}</TableCell>
                  <TableCell className="text-sm text-[#6B7280]">
                    {a.contract_date ? new Date(a.contract_date).toLocaleDateString('ko-KR') : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={a.is_active ? 'default' : 'secondary'}
                      className={a.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}
                    >
                      {a.is_active ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {a.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-[#3B82F6] hover:text-[#3B82F6] hover:bg-blue-50"
                          onClick={() => {
                            setSelectedAgency(a)
                            setInviteOpen(true)
                          }}
                        >
                          <Mail className="h-3.5 w-3.5 mr-1" />
                          관리자 초대
                        </Button>
                      )}
                      {a.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-[#EF4444] hover:text-[#EF4444] hover:bg-red-50"
                          onClick={() => handleDeactivate(a)}
                        >
                          비활성화
                        </Button>
                      )}
                    </div>
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
