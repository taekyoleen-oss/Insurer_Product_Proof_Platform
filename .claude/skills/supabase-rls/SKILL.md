# 스킬: supabase-rls

## 목적
Supabase PostgreSQL RLS(Row Level Security) 정책 패턴 레퍼런스.
IPPP 프로젝트의 역할 기반 접근 제어 구현에 사용.

## IPPP 역할 체계
```
super_admin > admin > agency_admin > agency_member
```

사용자 역할 판별:
- `ippp_internal_members.internal_role` → 'super_admin' | 'admin'
- `ippp_agency_members.agency_role` → 'agency_admin' | 'agency_member'

## 헬퍼 함수 패턴

```sql
-- 내부 관리자 역할 확인
CREATE OR REPLACE FUNCTION get_my_internal_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT internal_role FROM ippp_internal_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 기관 ID 반환
CREATE OR REPLACE FUNCTION get_my_agency_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT agency_id FROM ippp_agency_members
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- admin 이상 여부
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM ippp_internal_members
    WHERE user_id = auth.uid()
  );
$$;

-- agency 멤버 여부
CREATE OR REPLACE FUNCTION is_agency_member()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM ippp_agency_members
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;
```

## RLS 정책 패턴

### 관리자 전체 접근 패턴
```sql
CREATE POLICY "admin_all" ON {table}
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```

### 기관 자기 건만 접근 (draft 제외)
```sql
CREATE POLICY "agency_select_own_requests" ON ippp_requests
  FOR SELECT TO authenticated
  USING (
    agency_id = get_my_agency_id()
    AND status != 'draft'
    AND is_agency_member()
  );
```

### 파일/코멘트 소프트 삭제 (본인 + admin)
```sql
-- 파일 소프트 삭제 정책
CREATE POLICY "file_soft_delete" ON ippp_files
  FOR UPDATE TO authenticated
  USING (
    (uploader_id = auth.uid() OR is_admin())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    deleted_at IS NOT NULL  -- deleted_at 세팅만 허용
  );
```

### 코멘트 소프트 삭제 (본인 + admin)
```sql
CREATE POLICY "comment_soft_delete" ON ippp_comments
  FOR UPDATE TO authenticated
  USING (
    (author_id = auth.uid() OR is_admin())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    deleted_at IS NOT NULL
  );
```

### 기관 멤버 관리 (agency_admin만 INSERT)
```sql
CREATE POLICY "agency_admin_manage_members" ON ippp_agency_members
  FOR ALL TO authenticated
  USING (
    agency_id = get_my_agency_id()
    AND (
      SELECT agency_role FROM ippp_agency_members
      WHERE user_id = auth.uid()
    ) = 'agency_admin'
  );
```

## 주의사항
- RLS 활성화 후 반드시 SELECT 정책도 설정할 것 (기본 차단)
- SECURITY DEFINER 함수는 auth.users 직접 참조 가능
- `service_role` 키는 RLS 우회하므로 서버 전용으로만 사용
- Supabase Storage도 별도 정책 설정 필요 (버킷 정책)

## Storage 버킷 정책 패턴
```sql
-- 버킷: ippp-files
-- 경로: agencies/{agency_id}/requests/{request_id}/{filename}

-- 관리자 전체 접근
CREATE POLICY "admin_storage_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'ippp-files'
    AND is_admin()
  );

-- 기관 자기 경로만
CREATE POLICY "agency_storage_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ippp-files'
    AND (storage.foldername(name))[1] = 'agencies'
    AND (storage.foldername(name))[2] = get_my_agency_id()::text
    AND is_agency_member()
  );
```
