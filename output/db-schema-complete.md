# IPPP DB 스키마 구현 완료 보고서

## 생성된 파일

| 파일 | 설명 |
|------|------|
| `supabase/migrations/20260408000000_init_ippp.sql` | 전체 스키마 마이그레이션 |
| `supabase/seed.sql` | super_admin 초기 생성 가이드 |
| `supabase/config.toml` | Supabase 로컬 개발 설정 |

---

## 생성된 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `ippp_agencies` | 외부 검증기관 정보 |
| `ippp_internal_members` | 보험사 내부 관리자 (super_admin / admin) |
| `ippp_agency_members` | 외부기관 담당자 (agency_admin / agency_member) |
| `ippp_requests` | 검증 건 마스터 |
| `ippp_files` | 파일 메타데이터 (소프트 삭제, 버전 관리) |
| `ippp_comments` | 코멘트 스레드 (1단 답글, 소프트 삭제) |
| `ippp_invitations` | 초대 토큰 |
| `ippp_notifications` | 이메일 알림 발송 로그 |

---

## ENUM 타입

| 타입 | 값 |
|------|----|
| `ippp_request_status` | `draft`, `in_progress`, `hold`, `completed` |
| `ippp_request_type` | `hazard_rate`, `product` |
| `ippp_internal_role` | `super_admin`, `admin` |
| `ippp_agency_role` | `agency_admin`, `agency_member` |

---

## RLS 정책 요약

### ippp_agencies
| 정책명 | 대상 | 작업 | 조건 |
|--------|------|------|------|
| `ippp_agencies_admin_all` | authenticated | ALL | `is_admin()` |
| `ippp_agencies_agency_select` | authenticated | SELECT | 자기 기관 + `is_agency_member()` |

### ippp_internal_members
| 정책명 | 대상 | 작업 | 조건 |
|--------|------|------|------|
| `ippp_internal_members_super_admin_all` | authenticated | ALL | `get_my_internal_role() = 'super_admin'` |
| `ippp_internal_members_admin_select_own` | authenticated | SELECT | 본인 레코드 + role = 'admin' |
| `ippp_internal_members_admin_update_own` | authenticated | UPDATE | 본인 레코드 + role = 'admin' |

### ippp_agency_members
| 정책명 | 대상 | 작업 | 조건 |
|--------|------|------|------|
| `ippp_agency_members_admin_all` | authenticated | ALL | `is_admin()` |
| `ippp_agency_members_agency_admin_manage` | authenticated | ALL | 기관 내 + agency_role = 'agency_admin' |
| `ippp_agency_members_agency_member_own_select` | authenticated | SELECT | 본인 레코드 |
| `ippp_agency_members_agency_member_own_update` | authenticated | UPDATE | 본인 레코드 |

### ippp_requests
| 정책명 | 대상 | 작업 | 조건 |
|--------|------|------|------|
| `ippp_requests_admin_all` | authenticated | ALL | `is_admin()` |
| `ippp_requests_agency_select` | authenticated | SELECT | 자기 기관 + status != 'draft' |

> agency는 INSERT 정책 없음 → 검증기관의 건 직접 생성 차단

### ippp_files
| 정책명 | 대상 | 작업 | 조건 |
|--------|------|------|------|
| `ippp_files_admin_all` | authenticated | ALL | `is_admin()` |
| `ippp_files_agency_select_insert` | authenticated | SELECT | 자기 기관 건 + status != 'draft' |
| `ippp_files_agency_insert` | authenticated | INSERT | 자기 기관 건 + status != 'draft' |
| `ippp_files_soft_delete_own` | authenticated | UPDATE | 업로더 본인 또는 admin, deleted_at IS NULL → NOT NULL |

### ippp_comments
| 정책명 | 대상 | 작업 | 조건 |
|--------|------|------|------|
| `ippp_comments_admin_all` | authenticated | ALL | `is_admin()` |
| `ippp_comments_agency_select` | authenticated | SELECT | 자기 기관 건 + status != 'draft' |
| `ippp_comments_agency_insert` | authenticated | INSERT | 자기 기관 건 + status != 'draft' |
| `ippp_comments_soft_delete_own` | authenticated | UPDATE | 작성자 본인 또는 admin, deleted_at IS NULL → NOT NULL |

### ippp_invitations
| 정책명 | 대상 | 작업 | 조건 |
|--------|------|------|------|
| `ippp_invitations_admin_all` | authenticated | ALL | `is_admin()` |

### ippp_notifications
| 정책명 | 대상 | 작업 | 조건 |
|--------|------|------|------|
| `ippp_notifications_admin_all` | authenticated | ALL | `is_admin()` |

---

## 헬퍼 함수

| 함수 | 반환 타입 | 설명 |
|------|-----------|------|
| `get_my_internal_role()` | `text` | 현재 사용자의 internal_role 반환 |
| `get_my_agency_id()` | `uuid` | 현재 사용자의 agency_id 반환 |
| `is_admin()` | `boolean` | admin 이상 여부 (super_admin 포함) |
| `is_agency_member()` | `boolean` | 활성 agency 멤버 여부 |

---

## Supabase Realtime

`ippp_comments` 테이블이 `supabase_realtime` publication에 등록됨.
코멘트 스레드 실시간 구독에 사용.

---

## TypeScript 타입 생성

마이그레이션 적용 후 아래 명령어로 타입 파일을 생성합니다.

```bash
# 로컬 Supabase 사용 시
supabase gen types typescript --local > types/database.types.ts

# 원격 프로젝트 사용 시 (PROJECT_ID 교체)
supabase gen types typescript --project-id <PROJECT_ID> > types/database.types.ts
```

---

## 다음 단계: api-designer

DB 스키마 구현이 완료되었습니다. 다음 작업은 `api-designer` 에이전트가 담당합니다.

### api-designer 작업 범위
1. **Route Handlers** (`app/api/`)
   - `POST /api/requests` — 검증 건 생성
   - `PATCH /api/requests/[id]/status` — 상태 변경 (draft→in_progress→hold→completed)
   - `POST /api/files/upload` — 파일 업로드 (Supabase Storage, Signed URL 반환)
   - `POST /api/invitations` — 초대 토큰 생성 + Resend 이메일 발송
   - `POST /api/notifications` — 이메일 알림 트리거
2. **Server Actions** (`app/actions/`)
   - `createRequest`, `updateRequestStatus`, `archiveRequest`
   - `inviteAgencyAdmin`, `inviteAgencyMember`, `inviteInternalAdmin`
   - `softDeleteFile`, `softDeleteComment`
3. **Supabase Client 설정** (`lib/supabase/`)
   - `server.ts` — createServerClient (cookies)
   - `client.ts` — createBrowserClient
   - `admin.ts` — createAdminClient (service_role, server only)

### 참고 사항
- 모든 서버 액션은 `service_role` 키 사용 금지 (클라이언트 노출 위험)
- 파일 업로드 경로: `agencies/{agency_id}/requests/{request_id}/{filename}`
- 이메일 발송: Resend API, 한국어 전용 템플릿
