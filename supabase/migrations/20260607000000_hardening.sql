-- ============================================================
-- IPPP — Hardening Migration (적정성 진단 P0/P1 반영)
-- Generated: 2026-06-07
-- 멱등(idempotent) 설계 — 클린 DB(init 직후) / 드리프트된 운영 DB 모두에 안전하게 적용.
-- 참조: docs/IPPP_appropriateness_assessment_v1.md
-- ============================================================

-- ------------------------------------------------------------
-- P0-1 / P1-4: ippp_invitations.used_at → accepted_at 정규화
--   코드 전반이 accepted_at 을 사용하므로 스키마를 코드에 맞춘다.
-- ------------------------------------------------------------
DO $$
BEGIN
  -- used_at 만 있는 경우: 단순 rename
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'ippp_invitations' AND column_name = 'used_at')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'ippp_invitations' AND column_name = 'accepted_at') THEN
    ALTER TABLE ippp_invitations RENAME COLUMN used_at TO accepted_at;

  -- 둘 다 있는 경우: 데이터 병합 후 used_at 제거
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'ippp_invitations' AND column_name = 'used_at')
     AND EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'ippp_invitations' AND column_name = 'accepted_at') THEN
    UPDATE ippp_invitations SET accepted_at = COALESCE(accepted_at, used_at);
    ALTER TABLE ippp_invitations DROP COLUMN used_at;

  -- 둘 다 없는 경우: accepted_at 신설
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'ippp_invitations' AND column_name = 'accepted_at') THEN
    ALTER TABLE ippp_invitations ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;


-- ------------------------------------------------------------
-- P0-2 / P1-3: 배열 컬럼 NOT NULL 정합성 보강 + NULL 백필
--   코드가 빈 배열('{}')을 보내도록 함께 수정되며, 스키마도 보장한다.
-- ------------------------------------------------------------
UPDATE ippp_requests SET assigned_member_ids = '{}' WHERE assigned_member_ids IS NULL;
UPDATE ippp_requests SET hazard_type         = '{}' WHERE hazard_type IS NULL;

ALTER TABLE ippp_requests ALTER COLUMN assigned_member_ids SET DEFAULT '{}';
ALTER TABLE ippp_requests ALTER COLUMN assigned_member_ids SET NOT NULL;
ALTER TABLE ippp_requests ALTER COLUMN hazard_type SET DEFAULT '{}';
ALTER TABLE ippp_requests ALTER COLUMN hazard_type SET NOT NULL;


-- ------------------------------------------------------------
-- P0-3: 권한 회수(is_active=false) 시 RLS 접근 차단
--   is_admin() / get_my_internal_role() 가 is_active 를 확인하도록 강화.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM ippp_internal_members
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION get_my_internal_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT internal_role::text
  FROM ippp_internal_members
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;


-- ------------------------------------------------------------
-- P1-2: 감사 추적(audit trail) — ippp_audit_logs
--   상태변경·파일 업로드/다운로드·완료·초대 수락 등 핵심 행위 기록.
--   기록(INSERT)은 서버(service_role)에서 수행 → authenticated INSERT 정책 불필요.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ippp_audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action      text        NOT NULL,   -- 'status_change' | 'file_upload' | 'file_download' | 'request_complete' | 'invite_accept' | ...
  entity_type text        NOT NULL,   -- 'request' | 'file' | 'comment' | 'invitation'
  entity_id   uuid,
  request_id  uuid        REFERENCES ippp_requests(id) ON DELETE SET NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ippp_audit_logs_request_id ON ippp_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_ippp_audit_logs_created_at ON ippp_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ippp_audit_logs_entity     ON ippp_audit_logs(entity_type, entity_id);

ALTER TABLE ippp_audit_logs ENABLE ROW LEVEL SECURITY;

-- admin 이상: 전체 열람
DROP POLICY IF EXISTS "ippp_audit_logs_admin_select" ON ippp_audit_logs;
CREATE POLICY "ippp_audit_logs_admin_select"
  ON ippp_audit_logs
  FOR SELECT TO authenticated
  USING (is_admin());

-- agency 멤버: 자기 기관 건의 로그만 열람
DROP POLICY IF EXISTS "ippp_audit_logs_agency_select" ON ippp_audit_logs;
CREATE POLICY "ippp_audit_logs_agency_select"
  ON ippp_audit_logs
  FOR SELECT TO authenticated
  USING (
    is_agency_member()
    AND EXISTS (
      SELECT 1 FROM ippp_requests r
      WHERE r.id = ippp_audit_logs.request_id
        AND r.agency_id = get_my_agency_id()
        AND r.status != 'draft'
    )
  );


-- ------------------------------------------------------------
-- P0-5: Supabase Storage 버킷·정책 코드화
--   경로 패턴: agencies/{agency_id}/requests/{request_id}/{filename}
--   다운로드는 서버 Signed URL(service_role)이 담당하므로,
--   여기서는 기관 사용자의 직접 업로드/조회 권한만 RLS로 명시한다.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('ippp-files', 'ippp-files', false)
ON CONFLICT (id) DO NOTHING;

-- admin 이상: 버킷 전체
DROP POLICY IF EXISTS "ippp_storage_admin_all" ON storage.objects;
CREATE POLICY "ippp_storage_admin_all"
  ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ippp-files' AND is_admin())
  WITH CHECK (bucket_id = 'ippp-files' AND is_admin());

-- agency 멤버: 자기 기관 경로만 조회
DROP POLICY IF EXISTS "ippp_storage_agency_select" ON storage.objects;
CREATE POLICY "ippp_storage_agency_select"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ippp-files'
    AND is_agency_member()
    AND (storage.foldername(name))[2] = get_my_agency_id()::text
  );

-- agency 멤버: 자기 기관 경로로만 업로드
DROP POLICY IF EXISTS "ippp_storage_agency_insert" ON storage.objects;
CREATE POLICY "ippp_storage_agency_insert"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ippp-files'
    AND is_agency_member()
    AND (storage.foldername(name))[2] = get_my_agency_id()::text
  );
