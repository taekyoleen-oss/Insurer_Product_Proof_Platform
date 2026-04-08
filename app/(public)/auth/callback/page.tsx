'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        router.push('/?error=callback_failed')
        return
      }

      const type = searchParams.get('type')
      if (type === 'recovery') {
        // 비밀번호 재설정 플로우 — 프로필 페이지로
        router.push('/portal/profile?reset=true')
        return
      }

      // 역할 기반 리다이렉트
      const user = session.user
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

      router.push('/portal')
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin h-8 w-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-[#6B7280]">인증 처리 중...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full mx-auto" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
