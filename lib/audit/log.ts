import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/service'

// ============================================================
// IPPP — 감사 추적 기록 유틸 (P1-2)
//   ippp_audit_logs 에 핵심 행위를 기록한다. service_role 사용(RLS 우회 INSERT).
//   기록 실패가 본 동작을 막지 않도록 항상 비치명적으로 처리.
// ============================================================

export type AuditAction =
  | 'status_change'
  | 'request_complete'
  | 'file_upload'
  | 'file_download'
  | 'file_delete'
  | 'invite_accept'
  | 'agency_reassign'

export interface AuditEntry {
  actorId?: string | null
  actorEmail?: string | null
  action: AuditAction
  entityType: 'request' | 'file' | 'comment' | 'invitation'
  entityId?: string | null
  requestId?: string | null
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await supabaseAdmin.from('ippp_audit_logs').insert({
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      request_id: entry.requestId ?? null,
      metadata: entry.metadata ?? {},
    })
  } catch (err) {
    // 감사 기록 실패는 본 동작을 차단하지 않는다.
    console.error('[audit] 기록 실패:', err)
  }
}
