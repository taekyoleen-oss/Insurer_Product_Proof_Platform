# 스킬: file-upload

## 목적
Supabase Storage 파일 업로드, Signed URL 생성, 버전 관리 패턴.

## Storage 경로 규칙
```
agencies/{agency_id}/requests/{request_id}/{filename}
```

## 파일 업로드 패턴 (Server Action)

```typescript
// lib/supabase/storage.ts
import { createClient } from '@/lib/supabase/server'

export async function uploadFile(
  requestId: string,
  agencyId: string,
  file: File
): Promise<{ storagePath: string; version: number }> {
  const supabase = await createClient()

  // 동일 파일명의 최신 버전 조회
  const { data: existing } = await supabase
    .from('ippp_files')
    .select('version')
    .eq('request_id', requestId)
    .eq('filename', file.name)
    .is('deleted_at', null)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const version = (existing?.version ?? 0) + 1
  const storagePath = `agencies/${agencyId}/requests/${requestId}/${file.name}`

  // 버전이 1보다 크면 경로에 버전 포함 (덮어쓰기 방지)
  const versionedPath = version > 1
    ? `agencies/${agencyId}/requests/${requestId}/v${version}_${file.name}`
    : storagePath

  const { error } = await supabase.storage
    .from('ippp-files')
    .upload(versionedPath, file, { upsert: false })

  if (error) throw error

  return { storagePath: versionedPath, version }
}
```

## Signed URL 발급 패턴 (Route Handler)

```typescript
// app/api/files/signed-url/route.ts
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  const { storage_path } = await request.json()

  // service_role 키 사용 (RLS 우회하여 URL 생성)
  const supabase = createServiceClient()

  const { data, error } = await supabase.storage
    .from('ippp-files')
    .createSignedUrl(storage_path, 60 * 60 * 24) // 24시간

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ url: data.signedUrl })
}
```

## 파일 메타데이터 저장 패턴

```typescript
await supabase.from('ippp_files').insert({
  request_id: requestId,
  uploader_id: userId,
  filename: file.name,
  storage_path: versionedPath,
  version,
  file_size: file.size,
  mime_type: file.type || 'application/octet-stream',
})
```

## 파일 목록 조회 (최신 버전 + 이전 버전)

```typescript
// 최신 버전만
const { data: latestFiles } = await supabase
  .from('ippp_files')
  .select('*, uploader:ippp_agency_members(name), internal_uploader:ippp_internal_members(name)')
  .eq('request_id', requestId)
  .is('deleted_at', null)
  .order('filename')
  .order('version', { ascending: false })

// 파일명별로 그룹핑하여 최신 1개만
const latestByName = Object.values(
  latestFiles?.reduce((acc, file) => {
    if (!acc[file.filename]) acc[file.filename] = file
    return acc
  }, {} as Record<string, typeof latestFiles[0]>) ?? {}
)

// 이전 버전 조회 (특정 파일명)
const { data: versions } = await supabase
  .from('ippp_files')
  .select('*')
  .eq('request_id', requestId)
  .eq('filename', filename)
  .order('version', { ascending: false })
```

## 소프트 삭제 패턴

```typescript
// Server Action
export async function softDeleteFile(fileId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ippp_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)
  // RLS가 업로더 본인 또는 admin만 허용

  if (error) throw error
}
```

## FileUploadZone 컴포넌트 핵심

```typescript
// 100MB 제한 검증
const MAX_FILE_SIZE = 100 * 1024 * 1024
if (file.size > MAX_FILE_SIZE) {
  setError(`${file.name}: 파일 크기는 100MB를 초과할 수 없습니다.`)
  return
}
// MIME 검증 없음 — 형식 무제한
```
