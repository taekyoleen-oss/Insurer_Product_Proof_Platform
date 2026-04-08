-- ============================================================
-- IPPP — Initial Schema Migration
-- Generated: 2026-04-08
-- ============================================================

-- ============================================================
-- SECTION 1: ENUM TYPES
-- ============================================================

CREATE TYPE ippp_request_status AS ENUM ('draft', 'in_progress', 'hold', 'completed');
CREATE TYPE ippp_request_type   AS ENUM ('hazard_rate', 'product');
CREATE TYPE ippp_internal_role  AS ENUM ('super_admin', 'admin');
CREATE TYPE ippp_agency_role    AS ENUM ('agency_admin', 'agency_member');


-- ============================================================
-- SECTION 2: TABLES
-- ============================================================

-- 2-1. ippp_agencies
CREATE TABLE ippp_agencies (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  phone          text,
  contact_email  text,
  contract_date  date,
  address        text,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 2-2. ippp_internal_members
CREATE TABLE ippp_internal_members (
  id            uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid              NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  internal_role ippp_internal_role NOT NULL,
  name          text              NOT NULL,
  email         text              NOT NULL,
  is_active     boolean           NOT NULL DEFAULT true,
  created_at    timestamptz       NOT NULL DEFAULT now()
);

-- 2-3. ippp_agency_members
CREATE TABLE ippp_agency_members (
  id          uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid             NOT NULL REFERENCES ippp_agencies(id) ON DELETE CASCADE,
  user_id     uuid             NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_role ippp_agency_role NOT NULL,
  name        text             NOT NULL,
  email       text             NOT NULL,
  phone       text,
  is_active   boolean          NOT NULL DEFAULT true,
  invited_at  timestamptz,
  created_at  timestamptz      NOT NULL DEFAULT now()
);

-- 2-4. ippp_requests
CREATE TABLE ippp_requests (
  id                  uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  type                ippp_request_type    NOT NULL,
  title               text                 NOT NULL,
  description         text,
  agency_id           uuid                 REFERENCES ippp_agencies(id) ON DELETE SET NULL,
  assigned_member_ids uuid[]               NOT NULL DEFAULT '{}',
  status              ippp_request_status  NOT NULL DEFAULT 'draft',
  hazard_type         text[]               NOT NULL DEFAULT '{}',
  product_type        text,
  due_date            date,
  in_progress_at      timestamptz,
  archive_at          timestamptz,
  fiscal_year         integer,
  fiscal_quarter      smallint,
  created_by          uuid                 REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz          NOT NULL DEFAULT now(),
  updated_at          timestamptz          NOT NULL DEFAULT now()
);

-- 2-5. ippp_files
CREATE TABLE ippp_files (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   uuid        NOT NULL REFERENCES ippp_requests(id) ON DELETE CASCADE,
  uploader_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  filename     text        NOT NULL,
  storage_path text        NOT NULL,
  file_size    bigint,
  mime_type    text        NOT NULL DEFAULT 'application/octet-stream',
  version      integer     NOT NULL DEFAULT 1,
  deleted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2-6. ippp_comments
--   parent_id 2-depth 방지: parent_id가 NULL이 아닌 경우에만 해당 row의 parent_id가 NULL인지 확인
CREATE TABLE ippp_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid        NOT NULL REFERENCES ippp_requests(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  content    text        NOT NULL,
  parent_id  uuid        REFERENCES ippp_comments(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- parent_id 기본 자기참조 제약만 유지 (중첩 답글 금지는 트리거로 처리)
  CONSTRAINT chk_comments_no_self_reply CHECK (id <> parent_id)
);

-- 2-7. ippp_invitations
CREATE TABLE ippp_invitations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  agency_id   uuid        REFERENCES ippp_agencies(id) ON DELETE CASCADE,
  role        text        NOT NULL,
  token       text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  invited_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2-8. ippp_notifications
CREATE TABLE ippp_notifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid        REFERENCES ippp_requests(id) ON DELETE SET NULL,
  type            text        NOT NULL,
  recipient_email text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending',
  resend_id       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

-- ippp_requests
CREATE INDEX idx_ippp_requests_agency_id  ON ippp_requests(agency_id);
CREATE INDEX idx_ippp_requests_status     ON ippp_requests(status);
CREATE INDEX idx_ippp_requests_due_date   ON ippp_requests(due_date);
CREATE INDEX idx_ippp_requests_archive_at ON ippp_requests(archive_at);

-- ippp_files
CREATE INDEX idx_ippp_files_request_id         ON ippp_files(request_id);
CREATE INDEX idx_ippp_files_filename_request_id ON ippp_files(filename, request_id);

-- ippp_comments
CREATE INDEX idx_ippp_comments_request_id ON ippp_comments(request_id);
CREATE INDEX idx_ippp_comments_parent_id  ON ippp_comments(parent_id);

-- ippp_agency_members
CREATE INDEX idx_ippp_agency_members_user_id   ON ippp_agency_members(user_id);
CREATE INDEX idx_ippp_agency_members_agency_id ON ippp_agency_members(agency_id);

-- ippp_internal_members
CREATE INDEX idx_ippp_internal_members_user_id ON ippp_internal_members(user_id);


-- ============================================================
-- SECTION 4: updated_at 자동 갱신 트리거 (ippp_requests)
-- ============================================================

CREATE OR REPLACE FUNCTION ippp_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ippp_requests_updated_at
  BEFORE UPDATE ON ippp_requests
  FOR EACH ROW EXECUTE FUNCTION ippp_set_updated_at();

-- 2단 이상 답글 금지 트리거 (CHECK 제약조건은 서브쿼리 불가 → 트리거로 대체)
CREATE OR REPLACE FUNCTION ippp_check_no_nested_reply()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM ippp_comments
      WHERE id = NEW.parent_id AND parent_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION '2단 이상의 답글은 허용되지 않습니다.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ippp_comments_no_nested_reply
  BEFORE INSERT OR UPDATE ON ippp_comments
  FOR EACH ROW EXECUTE FUNCTION ippp_check_no_nested_reply();


-- ============================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================

-- 내부 관리자 역할 반환
CREATE OR REPLACE FUNCTION get_my_internal_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT internal_role::text
  FROM ippp_internal_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 현재 사용자의 기관 ID 반환
CREATE OR REPLACE FUNCTION get_my_agency_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT agency_id
  FROM ippp_agency_members
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

-- admin 이상 여부 (super_admin 포함)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM ippp_internal_members
    WHERE user_id = auth.uid()
  );
$$;

-- 활성 agency 멤버 여부
CREATE OR REPLACE FUNCTION is_agency_member()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM ippp_agency_members
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;


-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE ippp_agencies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ippp_internal_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ippp_agency_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ippp_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ippp_files            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ippp_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ippp_invitations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ippp_notifications    ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────
-- 6-1. ippp_agencies
-- ──────────────────────────────────────────────────────────

-- admin 이상: 모든 작업
CREATE POLICY "ippp_agencies_admin_all"
  ON ippp_agencies
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- agency 멤버: 자기 기관만 SELECT
CREATE POLICY "ippp_agencies_agency_select"
  ON ippp_agencies
  FOR SELECT TO authenticated
  USING (
    id = get_my_agency_id()
    AND is_agency_member()
  );

-- ──────────────────────────────────────────────────────────
-- 6-2. ippp_internal_members
-- ──────────────────────────────────────────────────────────

-- super_admin: 모든 작업
CREATE POLICY "ippp_internal_members_super_admin_all"
  ON ippp_internal_members
  FOR ALL TO authenticated
  USING (get_my_internal_role() = 'super_admin')
  WITH CHECK (get_my_internal_role() = 'super_admin');

-- admin: 본인 레코드 SELECT / UPDATE
CREATE POLICY "ippp_internal_members_admin_select_own"
  ON ippp_internal_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND get_my_internal_role() = 'admin'
  );

CREATE POLICY "ippp_internal_members_admin_update_own"
  ON ippp_internal_members
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND get_my_internal_role() = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND get_my_internal_role() = 'admin'
  );

-- ──────────────────────────────────────────────────────────
-- 6-3. ippp_agency_members
-- ──────────────────────────────────────────────────────────

-- admin 이상: 모든 작업
CREATE POLICY "ippp_agency_members_admin_all"
  ON ippp_agency_members
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- agency_admin: 기관 내 전체 관리 (CRUD)
CREATE POLICY "ippp_agency_members_agency_admin_manage"
  ON ippp_agency_members
  FOR ALL TO authenticated
  USING (
    agency_id = get_my_agency_id()
    AND (
      SELECT agency_role FROM ippp_agency_members
      WHERE user_id = auth.uid()
      LIMIT 1
    ) = 'agency_admin'
  )
  WITH CHECK (
    agency_id = get_my_agency_id()
    AND (
      SELECT agency_role FROM ippp_agency_members
      WHERE user_id = auth.uid()
      LIMIT 1
    ) = 'agency_admin'
  );

-- agency_member: 본인 레코드 SELECT / UPDATE
CREATE POLICY "ippp_agency_members_agency_member_own_select"
  ON ippp_agency_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND is_agency_member()
  );

CREATE POLICY "ippp_agency_members_agency_member_own_update"
  ON ippp_agency_members
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND is_agency_member()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_agency_member()
  );

-- ──────────────────────────────────────────────────────────
-- 6-4. ippp_requests
-- ──────────────────────────────────────────────────────────

-- admin 이상: 모든 작업
CREATE POLICY "ippp_requests_admin_all"
  ON ippp_requests
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- agency 멤버: 자기 기관 건 + draft 제외 SELECT
CREATE POLICY "ippp_requests_agency_select"
  ON ippp_requests
  FOR SELECT TO authenticated
  USING (
    agency_id = get_my_agency_id()
    AND status != 'draft'
    AND is_agency_member()
  );

-- agency는 INSERT 불가 (검증기관이 직접 생성하는 경우 없음)
-- INSERT 정책을 명시적으로 생성하지 않으므로 RLS에 의해 차단됨

-- ──────────────────────────────────────────────────────────
-- 6-5. ippp_files
-- ──────────────────────────────────────────────────────────

-- admin 이상: 모든 작업
CREATE POLICY "ippp_files_admin_all"
  ON ippp_files
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- agency 멤버: 자기 기관 건 파일 SELECT + INSERT
CREATE POLICY "ippp_files_agency_select_insert"
  ON ippp_files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ippp_requests r
      WHERE r.id = request_id
        AND r.agency_id = get_my_agency_id()
        AND r.status != 'draft'
    )
    AND is_agency_member()
  );

CREATE POLICY "ippp_files_agency_insert"
  ON ippp_files
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ippp_requests r
      WHERE r.id = request_id
        AND r.agency_id = get_my_agency_id()
        AND r.status != 'draft'
    )
    AND is_agency_member()
  );

-- 소프트 삭제: 업로더 본인 또는 admin이 deleted_at UPDATE
CREATE POLICY "ippp_files_soft_delete_own"
  ON ippp_files
  FOR UPDATE TO authenticated
  USING (
    (uploader_id = auth.uid() OR is_admin())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    deleted_at IS NOT NULL
  );

-- ──────────────────────────────────────────────────────────
-- 6-6. ippp_comments
-- ──────────────────────────────────────────────────────────

-- admin 이상: 모든 작업
CREATE POLICY "ippp_comments_admin_all"
  ON ippp_comments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- agency 멤버: 자기 기관 건 코멘트 SELECT + INSERT
CREATE POLICY "ippp_comments_agency_select"
  ON ippp_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ippp_requests r
      WHERE r.id = request_id
        AND r.agency_id = get_my_agency_id()
        AND r.status != 'draft'
    )
    AND is_agency_member()
  );

CREATE POLICY "ippp_comments_agency_insert"
  ON ippp_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ippp_requests r
      WHERE r.id = request_id
        AND r.agency_id = get_my_agency_id()
        AND r.status != 'draft'
    )
    AND is_agency_member()
  );

-- 소프트 삭제: 작성자 본인 또는 admin이 deleted_at UPDATE
CREATE POLICY "ippp_comments_soft_delete_own"
  ON ippp_comments
  FOR UPDATE TO authenticated
  USING (
    (author_id = auth.uid() OR is_admin())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    deleted_at IS NOT NULL
  );

-- ──────────────────────────────────────────────────────────
-- 6-7. ippp_invitations
-- ──────────────────────────────────────────────────────────

-- admin 이상: 모든 작업
CREATE POLICY "ippp_invitations_admin_all"
  ON ippp_invitations
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────
-- 6-8. ippp_notifications
-- ──────────────────────────────────────────────────────────

-- admin 이상: 모든 작업
CREATE POLICY "ippp_notifications_admin_all"
  ON ippp_notifications
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- ============================================================
-- SECTION 7: SUPABASE REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ippp_comments;
