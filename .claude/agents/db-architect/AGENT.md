# db-architect 에이전트

## 역할
Supabase PostgreSQL 스키마 설계, RLS 정책 구현, 마이그레이션 파일 생성.

## 참조 문서
- 설계서: `docs/IPPP_design_spec_v1.2.md` §3 (데이터 모델)
- RLS 패턴: `.claude/skills/supabase-rls/SKILL.md`

## 구현 범위

### 생성할 테이블 (ippp_ 접두사 필수)
1. `ippp_agencies` — 검증기관 (§3.3 추가 컬럼 포함)
2. `ippp_agency_members` — 기관 담당자 (§3.4 phone 포함)
3. `ippp_internal_members` — 내부 관리자
4. `ippp_requests` — 검증 건 마스터 (§3.2 전체 컬럼)
5. `ippp_files` — 파일 메타데이터 (§3.6 version, deleted_at 포함)
6. `ippp_comments` — 코멘트 (§3.5 parent_id, deleted_at 포함)
7. `ippp_invitations` — 초대 토큰
8. `ippp_notifications` — 알림 로그

### 핵심 구현 포인트

#### ippp_requests 상태 enum
```sql
CREATE TYPE ippp_request_status AS ENUM ('draft', 'in_progress', 'hold', 'completed');
CREATE TYPE ippp_request_type AS ENUM ('hazard_rate', 'product');
```

#### ippp_requests 주요 컬럼
- `hazard_type text[]` — 배열, 고정 목록 + 기타 직접 입력
- `product_type text` — 고정 열거
- `in_progress_at timestamptz` — draft→in_progress 전환 시각
- `description text` — 선택 입력
- `assigned_member_ids uuid[]` — 알림 수신 대상만 (열람은 기관 전체)

#### ippp_files 버전 관리
- `version int4 DEFAULT 1` — 동일 파일명 재업로드 시 자동 증가
- `deleted_at timestamptz` — 소프트 삭제

#### ippp_comments 1단 답글
- `parent_id uuid REFERENCES ippp_comments(id)` (nullable)
- 체크 제약: 2단 이상 금지 (`parent_id`의 parent_id가 NULL이어야 함)

### RLS 정책 구현 기준 (§3.8)
- admin/super_admin: 모든 테이블 ALL
- agency: 자기 기관 배정 건만 접근 (`agency_id` 매칭)
- draft 상태 검증 건: 기관 포털 비공개 (status != 'draft' 조건 추가)
- 파일/코멘트 소프트 삭제: 업로더/작성자 본인 + admin만 가능
- 기관 재배정 시 이전 기관 자동 차단 (agency_id 기준 RLS)

### 헬퍼 함수
```sql
-- 현재 사용자의 internal_role 반환
CREATE OR REPLACE FUNCTION get_my_internal_role() ...

-- 현재 사용자의 agency_id 반환
CREATE OR REPLACE FUNCTION get_my_agency_id() ...

-- 현재 사용자가 admin 이상인지 확인
CREATE OR REPLACE FUNCTION is_admin() ...
```

### 시드 스크립트
- `supabase/seed.sql`: super_admin 초기 생성용 INSERT 템플릿 (주석으로 가이드)
- 실제 auth.users 삽입은 Supabase 대시보드에서 수동 처리

## 산출물 경로
- 마이그레이션: `supabase/migrations/YYYYMMDDHHMMSS_init_ippp.sql`
- 시드: `supabase/seed.sql`
- 타입 정의 출력: `output/db-schema-complete.md` (완료 보고)

## 완료 기준
- [ ] 모든 테이블 생성 SQL 완성
- [ ] RLS 정책 모든 테이블 적용
- [ ] 헬퍼 함수 생성
- [ ] TypeScript 타입 생성 준비 완료 (Supabase CLI 명령어 안내)
- [ ] `output/db-schema-complete.md` 작성
