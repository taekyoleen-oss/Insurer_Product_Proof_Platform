'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── 공통: 인증된 사용자 ─────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('인증이 필요합니다.')
  return { supabase, user }
}

// ─── 파일 업로드 (Storage 업로드 + ippp_files INSERT) ─────────────────────

export async function uploadFileAction(formData: FormData) {
  const { supabase, user } = await getAuthUser()

  const file = formData.get('file') as File | null
  const requestId = formData.get('request_id') as string | null
  const agencyId = formData.get('agency_id') as string | null

  if (!file) throw new Error('파일이 없습니다.')
  if (!requestId) throw new Error('request_id가 없습니다.')
  if (!agencyId) throw new Error('agency_id가 없습니다.')

  // 파일 크기 제한 (100MB)
  const MAX_FILE_SIZE = 100 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name}: 파일 크기는 100MB를 초과할 수 없습니다.`)
  }

  // 동일 파일명의 최신 버전 조회 (소프트 삭제 포함 전체)
  const { data: existing, error: versionError } = await supabase
    .from('ippp_files')
    .select('version')
    .eq('request_id', requestId)
    .eq('filename', file.name)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (versionError && versionError.code !== 'PGRST116') throw versionError

  const version = (existing?.version ?? 0) + 1
  const basePath = `agencies/${agencyId}/requests/${requestId}`
  const storagePath =
    version > 1
      ? `${basePath}/v${version}_${file.name}`
      : `${basePath}/${file.name}`

  // Supabase Storage 업로드
  const { error: uploadError } = await supabase.storage
    .from('ippp-files')
    .upload(storagePath, file, { upsert: false })

  if (uploadError) throw uploadError

  // ippp_files 메타데이터 INSERT
  const { data: fileRecord, error: insertError } = await supabase
    .from('ippp_files')
    .insert({
      request_id: requestId,
      uploader_id: user.id,
      filename: file.name,
      storage_path: storagePath,
      version,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
    })
    .select()
    .single()

  if (insertError) throw insertError

  revalidatePath(`/dashboard/requests/${requestId}`)
  revalidatePath(`/portal/requests/${requestId}`)

  return fileRecord
}

// ─── 파일 소프트 삭제 (deleted_at 기록) ───────────────────────────────────

export async function softDeleteFileAction(fileId: string) {
  const { supabase } = await getAuthUser()

  const { error } = await supabase
    .from('ippp_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)
  // RLS가 업로더 본인 또는 admin만 허용

  if (error) throw error

  // request_id를 반환받아 revalidate
  const { data: file, error: fetchError } = await supabase
    .from('ippp_files')
    .select('request_id')
    .eq('id', fileId)
    .single()

  if (!fetchError && file) {
    revalidatePath(`/dashboard/requests/${file.request_id}`)
    revalidatePath(`/portal/requests/${file.request_id}`)
  }
}
