'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    startTransition(async () => {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      // 역할 확인 후 리다이렉트
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('로그인에 실패했습니다.'); return }

      // internal_members 확인
      const { data: internal } = await supabase
        .from('ippp_internal_members')
        .select('internal_role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (internal) {
        router.push('/dashboard')
        return
      }

      // agency_members 확인
      const { data: agency } = await supabase
        .from('ippp_agency_members')
        .select('agency_role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (agency) {
        router.push('/portal')
        return
      }

      setError('접근 권한이 없는 계정입니다.')
      await supabase.auth.signOut()
    })
  }

  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value

    startTransition(async () => {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      if (resetError) {
        setError('비밀번호 재설정 이메일 발송에 실패했습니다.')
      } else {
        setResetSent(true)
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 로고 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1E3A5F] text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-[#1E3A5F] leading-tight">Insurer Product Proof Platform</h1>
          <p className="text-sm text-[#3B82F6] font-medium">(IPPP)</p>
        </div>

        <Card className="shadow-sm border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-[#1E3A5F] text-center">
              {resetMode ? '비밀번호 재설정' : '로그인'}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {resetMode ? (
              resetSent ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-[#1E3A5F]">
                    비밀번호 재설정 이메일을 발송했습니다.
                    <br />받은 편지함을 확인해 주세요.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setResetMode(false); setResetSent(false) }}
                  >
                    로그인으로 돌아가기
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="등록된 이메일을 입력하세요"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
                  >
                    {isPending ? '발송 중...' : '재설정 이메일 발송'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setResetMode(false)}
                  >
                    로그인으로 돌아가기
                  </Button>
                </form>
              )
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
                >
                  {isPending ? '로그인 중...' : '로그인'}
                </Button>
                <Separator />
                <button
                  type="button"
                  onClick={() => { setResetMode(true); setError(null) }}
                  className="w-full text-sm text-[#3B82F6] hover:underline text-center"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#6B7280]">
          Insurer Product Proof Platform (IPPP) v1.3
        </p>
      </div>
    </div>
  )
}
