# api-designer 에이전트

## 역할
Next.js 15 App Router 기반 Route Handler, Server Action, Resend 이메일 연동 구현.

## 참조 문서
- 설계서: `docs/IPPP_design_spec_v1.2.md` §2.4, §5, §6
- 이메일 패턴: `.claude/skills/email-notify/SKILL.md`
- 파일 업로드 패턴: `.claude/skills/file-upload/SKILL.md`
- db-architect 산출물: `output/db-schema-complete.md`

## 구현 범위

### Route Handlers (`app/api/`)

#### `/api/invitations` (POST)
- 역할: 초대 이메일 발송 + `ippp_invitations` 레코드 생성
- 입력: `{ email, agency_id?, role }` (Zod 검증)
- 처리: 토큰 생성(72h 만료) → DB 저장 → Resend 발송
- 권한: admin 이상만 호출 가능 (서버에서 role 검증)

#### `/api/files/signed-url` (POST)
- 역할: Supabase Storage Signed URL 발급
- 입력: `{ storage_path }` (Zod 검증)
- 처리: `service_role` 키로 24시간 Signed URL 생성
- 권한: 해당 request_id에 접근 권한 있는 사용자만

#### `/api/notifications` (POST)
- 역할: 이메일 알림 발송 + `ippp_notifications` 로그
- 입력: `{ type, request_id, trigger_user_id }` (Zod 검증)
- 처리: 수신자 목록 조회(assigned_member_ids) → 한국어 이메일 템플릿 → Resend 발송
- 알림 유형: `new_comment`, `new_file`, `status_changed`, `invitation`

### Server Actions (`app/(admin)/dashboard/`, `app/(agency)/portal/`)

#### 검증 건 관련
- `createRequest(formData)` — 신규 검증 건 생성 (draft 상태)
- `updateRequestStatus(id, status)` — 상태 전이 (§5.2 권한 검증)
  - draft→in_progress: admin만, `in_progress_at` 기록
  - in_progress→hold: admin만
  - hold→in_progress: admin만
  - in_progress→completed: admin만 (확인서 업로드 여부 사전 확인)
- `assignAgency(requestId, agencyId)` — 기관 재배정
- `completeRequest(id)` — 2단계 완료 처리 (archive_at 기록)

#### 파일 관련
- `uploadFile(requestId, file)` — Storage 업로드 + ippp_files INSERT
  - storage_path: `agencies/{agency_id}/requests/{request_id}/{filename}`
  - 동일 파일명 시 version 자동 증가
- `softDeleteFile(fileId)` — deleted_at 기록 (본인 또는 admin만)

#### 코멘트 관련
- `createComment(requestId, content, parentId?)` — 코멘트 + 답글 생성
  - parent_id 유효성: 2단 이상 금지 검증
  - 작성 후 알림 API 호출
- `softDeleteComment(commentId)` — deleted_at 기록 (본인 또는 admin만)

#### 기관 관리
- `inviteAgencyAdmin(email, agencyId)` — agency_admin 초대
- `deactivateAgency(agencyId)` — 기관 비활성화 + 관리자 경고 처리
- `reinviteMember(invitationId)` — 재초대 (기존 토큰 만료 처리 + 신규 발급)

### Supabase 쿼리 함수 (`lib/supabase/queries/`)

```typescript
// requests.ts
getRequestsForAdmin(filters)        // 전체 건 목록
getRequestsForAgency(agencyId)      // 기관 건 목록 (in_progress 이상만)
getRequestById(id, userRole)        // 단건 상세
getKpiForAdmin()                    // 관리자 KPI (활성/완료/마감임박/기관별)
getKpiForAgency(agencyId)           // 기관 KPI (활성/마감임박/완료)
getArchive(filters)                 // 완료 건 + ilike 검색
getReportForAdmin(period)           // 기관별 실적 집계
getReportForAgency(agencyId, period) // 기관 자신 실적

// files.ts
getFilesByRequest(requestId)        // 최신 버전만 + 이전 버전 포함
getFileVersionHistory(filename, requestId)

// comments.ts
getCommentsByRequest(requestId)     // 트리 구조 (parent + children)
```

### 이메일 템플릿 (`lib/resend/templates/`)
한국어 전용. Resend React Email 또는 HTML 템플릿.

| 템플릿 | 제목 예시 |
|-------|---------|
| `invitation.tsx` | `[IPPP] 검증기관 포털 초대장` |
| `new-comment.tsx` | `[IPPP] {title} 건에 새 코멘트가 등록되었습니다` |
| `new-file.tsx` | `[IPPP] {title} 건에 새 파일이 업로드되었습니다` |
| `status-changed.tsx` | `[IPPP] {title} 건 상태가 변경되었습니다` |

## 산출물 경로
- `output/api-design-complete.md` (완료 보고)

## 완료 기준
- [ ] Route Handler 3개 구현 (Zod 검증 포함)
- [ ] Server Action 전체 구현 (권한 검증 포함)
- [ ] Supabase 쿼리 함수 모음 완성
- [ ] Resend 이메일 템플릿 4종 (한국어)
- [ ] `output/api-design-complete.md` 작성
