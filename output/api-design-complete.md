# IPPP API 레이어 구현 완료 보고서

## 구현된 파일 목록

### Supabase 클라이언트 (`lib/supabase/`)

| 파일 | 설명 |
|------|------|
| `lib/supabase/client.ts` | 브라우저용 Supabase 클라이언트 (`createBrowserClient`) |
| `lib/supabase/server.ts` | 서버/RSC용 Supabase 클라이언트 (`createServerClient` + `next/headers` cookies) |
| `lib/supabase/service.ts` | service_role 키 클라이언트 (RLS 우회, API Route 전용) |

### 쿼리 함수 (`lib/supabase/queries/`)

| 파일 | 함수 목록 |
|------|-----------|
| `lib/supabase/queries/requests.ts` | `getRequestsForAdmin`, `getRequestsForAgency`, `getRequestById`, `getKpiForAdmin`, `getKpiForAgency`, `getArchive`, `getReportForAdmin`, `getReportForAgency` |
| `lib/supabase/queries/files.ts` | `getFilesByRequest`, `getFileVersionHistory` |
| `lib/supabase/queries/comments.ts` | `getCommentsByRequest` |

### TypeScript 타입 (`types/`)

| 파일 | 설명 |
|------|------|
| `types/index.ts` | 공통 도메인 타입 (RequestStatus, RequestType, InternalRole, AgencyRole, KPI, Report 등) |
| `types/next-modules.d.ts` | Next.js 16.2.2 미완성 빌드를 위한 `next/cache`, `next/headers` 타입 스텁 |

### Server Actions (`lib/actions/`)

| 파일 | 함수 목록 |
|------|-----------|
| `lib/actions/requests.ts` | `createRequest`, `updateRequestStatus`, `completeRequest`, `assignAgency` |
| `lib/actions/files.ts` | `uploadFileAction`, `softDeleteFileAction` |
| `lib/actions/comments.ts` | `createCommentAction`, `softDeleteCommentAction` |
| `lib/actions/agencies.ts` | `createAgencyAction`, `updateAgencyAction`, `deactivateAgencyAction` |
| `lib/actions/invitations.ts` | `inviteUserAction`, `inviteAgencyAdmin`, `reinviteMemberAction` |

### Route Handlers (`app/api/`)

| 파일 | 메서드 | 설명 |
|------|--------|------|
| `app/api/invitations/route.ts` | POST | 초대 토큰 생성 + Resend 이메일 발송 |
| `app/api/files/signed-url/route.ts` | POST | Supabase Storage 24시간 Signed URL 발급 |
| `app/api/notifications/route.ts` | POST | 이메일 알림 발송 + `ippp_notifications` 로그 |

### Resend 이메일 (`lib/resend/`)

| 파일 | 설명 |
|------|------|
| `lib/resend/client.ts` | Resend 인스턴스 초기화 |
| `lib/resend/templates.ts` | 한국어 HTML 이메일 템플릿 4종 + 디스패처 |
| `lib/resend/send.ts` | `sendNotification()`, `getNotificationRecipients()` 유틸 |

### 미들웨어 & 환경변수

| 파일 | 설명 |
|------|------|
| `middleware.ts` | 인증 미들웨어 — 역할별 리다이렉트, public 경로 처리 |
| `.env.local.example` | 환경변수 예시 파일 |

---

## API 엔드포인트 요약

### POST /api/invitations
- **역할**: 초대 링크 생성 + Resend 이메일 발송
- **권한**: admin 이상 (서버에서 `ippp_internal_members` 검증)
- **입력 (Zod 검증)**:
  ```json
  {
    "email": "user@example.com",
    "role": "agency_admin",
    "agency_id": "uuid (optional)"
  }
  ```
- **처리**: 토큰 생성(crypto.randomUUID) → 72h 만료 → `ippp_invitations` INSERT → Resend 발송
- **응답**: `{ success: true, invitationId, expiresAt }`

### POST /api/files/signed-url
- **역할**: Supabase Storage 파일 Signed URL 발급
- **권한**: 인증된 사용자 + 해당 request에 RLS 접근 가능한 사용자
- **입력 (Zod 검증)**:
  ```json
  { "storage_path": "agencies/{agency_id}/requests/{request_id}/{filename}" }
  ```
- **처리**: RLS로 접근 권한 확인 → service_role 키로 24시간 Signed URL 생성
- **응답**: `{ url: "https://..." }`

### POST /api/notifications
- **역할**: 이메일 알림 발송 + `ippp_notifications` 로그 저장
- **권한**: 인증된 사용자
- **입력 (Zod 검증)**:
  ```json
  {
    "type": "new_comment | new_file | status_changed | invitation",
    "request_id": "uuid",
    "template_data": { "key": "value" }
  }
  ```
- **처리**: 수신자 조회(assigned_member_ids 우선) → 템플릿 적용 → Resend 발송 → 로그 저장
- **응답**: `{ success: true, sent: N }`

---

## Server Actions 요약

### 검증 건 관련 (`lib/actions/requests.ts`)
| 함수 | 권한 | 설명 |
|------|------|------|
| `createRequest(data)` | admin 이상 | draft 상태로 신규 검증 건 생성 |
| `updateRequestStatus(id, status)` | admin 이상 | 허용된 상태 전이만 처리 (§5.2 규칙 적용) |
| `completeRequest(id)` | admin 이상 | 파일 업로드 확인 후 completed + archive_at 기록 |
| `assignAgency(requestId, agencyId)` | admin 이상 | 기관 재배정 |

**상태 전이 규칙**:
- `draft → in_progress`: admin만, `in_progress_at` 자동 기록
- `in_progress → hold`: admin만
- `hold → in_progress`: admin만
- `in_progress → completed`: admin만, 파일 1개 이상 업로드 필수

### 파일 관련 (`lib/actions/files.ts`)
| 함수 | 권한 | 설명 |
|------|------|------|
| `uploadFileAction(formData)` | 인증된 사용자 | Storage 업로드 + 버전 자동 증가 + ippp_files INSERT |
| `softDeleteFileAction(fileId)` | 업로더 본인 또는 admin (RLS) | deleted_at 기록 |

### 코멘트 관련 (`lib/actions/comments.ts`)
| 함수 | 권한 | 설명 |
|------|------|------|
| `createCommentAction(requestId, content, parentId?)` | 인증된 사용자 | 코멘트/1단 답글 생성 + 알림 API 호출 |
| `softDeleteCommentAction(commentId)` | 작성자 본인 또는 admin (RLS) | deleted_at 기록 |

**2단 이상 답글 방지**: parentId가 제공되면 부모 코멘트의 `parent_id`가 null인지 서버에서 검증.

### 기관 관리 (`lib/actions/agencies.ts`)
| 함수 | 권한 | 설명 |
|------|------|------|
| `createAgencyAction(data)` | admin 이상 | 기관 생성 |
| `updateAgencyAction(id, data)` | admin 이상 | 기관 정보 수정 |
| `deactivateAgencyAction(id)` | admin 이상 | 비활성화 + 진행 중인 건 수 경고 반환 |

### 초대 관련 (`lib/actions/invitations.ts`)
| 함수 | 권한 | 설명 |
|------|------|------|
| `inviteUserAction(email, role, agencyId?)` | admin 이상 | /api/invitations 호출 래퍼 |
| `inviteAgencyAdmin(email, agencyId)` | admin 이상 | agency_admin 초대 전용 헬퍼 |
| `reinviteMemberAction(invitationId)` | admin 이상 | 기존 토큰 만료 처리 + 신규 초대 발급 |

---

## 이메일 템플릿 요약 (`lib/resend/templates.ts`)

| 유형 | 제목 | 수신자 |
|------|------|--------|
| `invitation` | `[IPPP] 검증기관 포털 초대장` | 초대된 이메일 |
| `new_comment` | `[IPPP] {title} 건에 새 코멘트가 등록되었습니다` | 기관 멤버 + 내부 관리자 (발송자 제외) |
| `new_file` | `[IPPP] {title} 건에 새 파일이 업로드되었습니다` | 기관 멤버 + 내부 관리자 (발송자 제외) |
| `status_changed` | `[IPPP] {title} 건 상태가 변경되었습니다` | 기관 멤버 |

---

## 미들웨어 라우팅 규칙 (`middleware.ts`)

| 조건 | 처리 |
|------|------|
| 미로그인 + 보호 경로 접근 | `/` 로 리다이렉트 |
| `super_admin`/`admin` + `/portal` 접근 | `/dashboard` 로 리다이렉트 |
| `agency_admin`/`agency_member` + `/dashboard` 접근 | `/portal` 로 리다이렉트 |
| 로그인 상태 + `/` 접근 | 역할별 대시보드 자동 리다이렉트 |
| Public 경로 (`/`, `/auth/*`) | 인증 불필요 |

---

## 완료 체크리스트

- [x] **Supabase 클라이언트 3종** 구현 (browser / server / service_role)
- [x] **Route Handler 3개** 구현 (Zod v4 검증 포함)
  - [x] `POST /api/invitations`
  - [x] `POST /api/files/signed-url`
  - [x] `POST /api/notifications`
- [x] **Server Actions 전체** 구현 (권한 검증 포함)
  - [x] requests: createRequest, updateRequestStatus, completeRequest, assignAgency
  - [x] files: uploadFileAction, softDeleteFileAction
  - [x] comments: createCommentAction, softDeleteCommentAction
  - [x] agencies: createAgencyAction, updateAgencyAction, deactivateAgencyAction
  - [x] invitations: inviteUserAction, inviteAgencyAdmin, reinviteMemberAction
- [x] **Supabase 쿼리 함수 모음** 완성 (requests, files, comments)
- [x] **Resend 이메일 템플릿 4종** (한국어 HTML)
- [x] **TypeScript 타입** 정의 (`types/index.ts`)
- [x] **인증 미들웨어** (`middleware.ts`)
- [x] **환경변수 예시** (`.env.local.example`)
- [x] **TypeScript strict 모드** 통과 (기존 layout.tsx 제외)
- [x] **`output/api-design-complete.md`** 작성

---

## 특이사항

### Next.js 16.2.2 불완전 설치 대응
현재 프로젝트의 `next@16.2.2` 패키지가 `dist/compiled`, `dist/client`, `dist/server/request` 등 핵심 디렉토리가 없는 불완전한 상태입니다. 이에 따라:
- `types/next-modules.d.ts`를 생성하여 `next/cache`, `next/headers` 모듈의 타입 스텁을 추가
- 실제 배포 시 완전한 Next.js가 설치되면 해당 스텁은 자동으로 Next.js 공식 타입으로 대체됨

### Zod v4 API 변경
- Zod v4에서 `ZodError.errors` 속성이 제거되고 `ZodError.issues`로 통일됨
- 모든 Route Handler에서 `.issues[0]?.message` 패턴 사용

### 다음 단계: ui-builder
API 레이어 구현이 완료되었습니다. 다음 작업은 `ui-builder` 에이전트가 담당합니다.
- 페이지 컴포넌트 구현 (`/dashboard`, `/portal`, `/auth/invite` 등)
- `RequestCard`, `StatusBadge`, `FileUploadZone`, `CommentThread` 컴포넌트 구현
- Supabase Realtime 구독 (코멘트 스레드)
