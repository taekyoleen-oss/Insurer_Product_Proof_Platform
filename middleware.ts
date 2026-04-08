import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── public 경로 (인증 불필요) ───────────────────────────────────────────

const PUBLIC_PATHS = ['/', '/auth/invite', '/auth/callback', '/auth/error']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith('/auth/')
  )
}

// ─── 미들웨어 ─────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // 세션 갱신 (IMPORTANT: getUser() 호출 필수)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ─ public 경로: 이미 로그인된 경우 역할별 대시보드로 리다이렉트
  if (isPublicPath(pathname)) {
    if (user && pathname === '/') {
      return await redirectByRole(supabase, user.id, request)
    }
    return supabaseResponse
  }

  // ─ 미로그인 상태에서 보호 경로 접근 → 로그인 페이지로
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/'
    return NextResponse.redirect(loginUrl)
  }

  // ─ 역할별 접근 제어
  const role = await getUserRole(supabase, user.id)

  // admin이 /portal 접근 → /dashboard
  if (
    (role === 'super_admin' || role === 'admin') &&
    pathname.startsWith('/portal')
  ) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  // agency가 /dashboard 접근 → /portal
  if (
    (role === 'agency_admin' || role === 'agency_member') &&
    pathname.startsWith('/dashboard')
  ) {
    const portalUrl = request.nextUrl.clone()
    portalUrl.pathname = '/portal'
    return NextResponse.redirect(portalUrl)
  }

  return supabaseResponse
}

// ─── 역할 조회 헬퍼 ──────────────────────────────────────────────────────

type Role = 'super_admin' | 'admin' | 'agency_admin' | 'agency_member' | null

async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<Role> {
  // 내부 관리자 확인
  const { data: internalMember } = await supabase
    .from('ippp_internal_members')
    .select('internal_role, is_active')
    .eq('user_id', userId)
    .single()

  if (internalMember?.is_active) {
    return internalMember.internal_role as 'super_admin' | 'admin'
  }

  // 기관 멤버 확인
  const { data: agencyMember } = await supabase
    .from('ippp_agency_members')
    .select('agency_role, is_active')
    .eq('user_id', userId)
    .single()

  if (agencyMember?.is_active) {
    return agencyMember.agency_role as 'agency_admin' | 'agency_member'
  }

  return null
}

// ─── 역할별 리다이렉트 ────────────────────────────────────────────────────

async function redirectByRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  request: NextRequest
): Promise<NextResponse> {
  const role = await getUserRole(supabase, userId)

  const redirectUrl = request.nextUrl.clone()

  if (role === 'super_admin' || role === 'admin') {
    redirectUrl.pathname = '/dashboard'
  } else if (role === 'agency_admin' || role === 'agency_member') {
    redirectUrl.pathname = '/portal'
  } else {
    // 역할 미지정 사용자 — 로그인 페이지 유지
    return NextResponse.next()
  }

  return NextResponse.redirect(redirectUrl)
}

// ─── matcher 설정 ─────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * 다음 경로는 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     * - 기타 정적 파일 (.png, .jpg 등)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
