import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'

// ─── 입력 스키마 ──────────────────────────────────────────────────────────

const SignedUrlSchema = z.object({
  storage_path: z.string().min(1, 'storage_path가 필요합니다.'),
})

// ─── POST /api/files/signed-url ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Zod 검증
    const body: unknown = await request.json()
    const parseResult = SignedUrlSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const { storage_path } = parseResult.data

    // storage_path에서 request_id 추출하여 접근 권한 확인
    // 경로 패턴: agencies/{agency_id}/requests/{request_id}/{filename}
    const pathParts = storage_path.split('/')
    const requestsIndex = pathParts.indexOf('requests')
    const requestId = requestsIndex !== -1 ? pathParts[requestsIndex + 1] : null

    if (requestId) {
      // RLS를 통해 접근 권한 확인 (현재 사용자의 supabase 클라이언트 사용)
      const { data: reqRecord, error: reqError } = await supabase
        .from('ippp_requests')
        .select('id')
        .eq('id', requestId)
        .single()

      if (reqError || !reqRecord) {
        return NextResponse.json(
          { error: '해당 파일에 대한 접근 권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    // service_role 키로 24시간 Signed URL 생성 (RLS 우회)
    const { data, error: urlError } = await supabaseAdmin.storage
      .from('ippp-files')
      .createSignedUrl(storage_path, 60 * 60 * 24) // 24시간

    if (urlError || !data) {
      console.error('Signed URL 생성 오류:', urlError)
      return NextResponse.json(
        { error: 'Signed URL 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    console.error('/api/files/signed-url 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
