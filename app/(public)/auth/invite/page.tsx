'use client'

import { useState, useTransition, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ShieldCheck, AlertCircle } from 'lucide-react'

interface InvitationData {
  id: string
  email: string
  role: string
  agency_id: string | null
  expires_at: string
}

function InvitePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    const supabase = createClient()
    supabase
      .from('ippp_invitations')
      .select('id, email, role, agency_id, expires_at')
      .eq('token', token)
      .is('accepted_at', null)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('유효하지 않은 초대 링크입니다.')
        } else if (new Date(data.expires_at) < new Date()) {
          setError('초대 링크가 만료되었습니다. 관리자에게 재초대를 요청하세요.')
        } else {
          setInvitation(data as InvitationData)
        }
        setLoading(false)
      })
  }, [token])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!invitation) return
    setError(null)
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: { data: { name } },
      })

      if (signUpError || !authData.user) {
        setError(signUpError?.message ?? '회원가입에 실패했습니다.')
        return
      }

      const userId = authData.user.id
      const isAgency = invitation.role === 'agency_admin' || invitation.role === 'agency_member'

      if (isAgency && invitation.agency_id) {
        await supabase.from('ippp_agency_members').insert({
          user_id: userId,
          agency_id: invitation.agency_id,
          name,
          email: invitation.email,
          agency_role: invitation.role,
        })
      } else {
        await supabase.from('ippp_internal_members').insert({
          user_id: userId,
          name,
          email: invitation.email,
          internal_role: invitation.role,
        })
      }

      // 토큰 사용 처리
      await supabase
        .from('ippp_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      setDone(true)
      setTimeout(() => router.push('/'), 2000)
    })
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
            <h2 className="text-lg font-semibold text-[#1E3A5F]">잘못된 접근</h2>
            <p className="text-sm text-[#6B7280]">초대 링크를 통해 접속해 주세요.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-[#6B7280]">초대 링크 확인 중...</div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <h2 className="text-lg font-semibold text-[#1E3A5F]">초대 링크 오류</h2>
            <p className="text-sm text-[#6B7280]">{error}</p>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              로그인 페이지로
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardContent className="p-8 text-center space-y-3">
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />
            <h2 className="text-lg font-semibold text-[#1E3A5F]">가입 완료!</h2>
            <p className="text-sm text-[#6B7280]">잠시 후 로그인 페이지로 이동합니다.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1E3A5F] text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-[#1E3A5F] leading-tight">Insurer Product Proof Platform</h1>
          <p className="text-sm text-[#3B82F6] font-medium">(IPPP) — 초대 수락</p>
          <p className="text-sm text-[#6B7280]">
            {invitation?.email} 계정으로 가입합니다
          </p>
        </div>

        <Card className="shadow-sm border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-[#1E3A5F] text-center">계정 정보 입력</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">이메일 (고정)</Label>
                <Input id="email" value={invitation?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input id="name" name="name" placeholder="이름을 입력하세요" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="8자 이상 입력하세요"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">비밀번호 확인 *</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  minLength={8}
                />
              </div>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
              >
                {isPending ? '가입 처리 중...' : '가입 완료'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-[#6B7280]">초대 링크 확인 중...</div>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  )
}
