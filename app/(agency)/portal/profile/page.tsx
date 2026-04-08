'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface ProfileData {
  name: string
  email: string
  phone: string
  agency_id: string
  agency_name: string
}

export default function AgencyProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('ippp_agency_members')
        .select('name, email, phone, agency_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (!member) return

      const { data: agency } = await supabase
        .from('ippp_agencies')
        .select('name')
        .eq('id', member.agency_id)
        .single()

      setProfile({
        name: member.name,
        email: member.email,
        phone: member.phone ?? '',
        agency_id: member.agency_id,
        agency_name: agency?.name ?? '',
      })
      setName(member.name)
      setPhone(member.phone ?? '')
    }
    load()
  }, [supabase])

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증이 필요합니다.')

      const { error } = await supabase
        .from('ippp_agency_members')
        .update({ name, phone: phone || null })
        .eq('user_id', user.id)

      if (error) throw error

      setProfile((prev) => prev ? { ...prev, name, phone } : prev)
      toast.success('프로필이 저장되었습니다.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    setChangingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('비밀번호가 변경되었습니다.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setChangingPw(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-40 text-[#6B7280] text-sm">
        로딩 중...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-[#1E3A5F]">프로필</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">담당자 정보를 수정합니다.</p>
      </div>

      {/* 기관 정보 */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-2">
          <h2 className="font-semibold text-[#1E3A5F] text-sm">소속 기관</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{profile.agency_name}</p>
          <p className="text-xs text-[#6B7280] mt-0.5">{profile.email}</p>
        </CardContent>
      </Card>

      {/* 담당자 정보 */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-2">
          <h2 className="font-semibold text-[#1E3A5F] text-sm">담당자 정보</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="연락처를 입력하세요 (예: 010-0000-0000)"
            />
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={saving || !name.trim()}
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* 비밀번호 변경 */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="pb-2">
          <h2 className="font-semibold text-[#1E3A5F] text-sm">비밀번호 변경</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8자 이상"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호를 다시 입력하세요"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPw || !newPassword || !confirmPassword}
            variant="outline"
            className="border-[#1E3A5F] text-[#1E3A5F]"
          >
            {changingPw ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
