import { createClient } from '@/lib/supabase/server'
import type { IpppFile } from '@/types'

// ─── 요청 건의 파일 목록 (소프트 삭제 제외, 파일명별 최신 버전) ───────────

export async function getFilesByRequest(requestId: string): Promise<IpppFile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ippp_files')
    .select('*')
    .eq('request_id', requestId)
    .is('deleted_at', null)
    .order('filename')
    .order('version', { ascending: false })

  if (error) throw error

  const files = (data ?? []) as IpppFile[]

  // 파일명별 최신 버전만 추출
  const latestByName = Object.values(
    files.reduce<Record<string, IpppFile>>((acc, file) => {
      if (!acc[file.filename]) {
        acc[file.filename] = file
      }
      return acc
    }, {})
  )

  return latestByName
}

// ─── 특정 파일명의 전체 버전 이력 ─────────────────────────────────────────

export async function getFileVersionHistory(
  filename: string,
  requestId: string
): Promise<IpppFile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ippp_files')
    .select('*')
    .eq('request_id', requestId)
    .eq('filename', filename)
    .order('version', { ascending: false })

  if (error) throw error
  return (data ?? []) as IpppFile[]
}
