# IPPP 하네스 실행 · 검증 리포트

> 작성일: 2026-06-07 · 연계: `docs/IPPP_appropriateness_assessment_v1.md`
> 본 세션에서 실제로 실행한 검증 결과와, 격리 인프라가 필요한 후속 항목을 기록한다.

## 1. 이번 세션에서 실행·검증한 것 (증거 기반)

| 검증 | 명령 | 결과 |
|------|------|------|
| TypeScript 타입체크 | `npx tsc --noEmit` | **통과** (오류 0) |
| 순수 로직 회귀 테스트 | `npm run harness:logic` | **11/11 통과** |
| 프로덕션 빌드 | `next build --no-lint` | **성공** (22개 라우트 컴파일, 타입 유효성 통과) |
| **격리 DB 통합 (실 DB)** | `node harness/db/rls.mjs` | **5/5 통과** (2026-06-07, 운영 프로젝트 대상) |

### 1.1 실제 DB 하네스 실행 결과 (2026-06-07)

사용자가 `20260607000000_hardening.sql` 을 운영 Supabase에 적용한 뒤, 운영 프로젝트를 대상으로 실행.
사전 read-only 점검으로 마이그레이션 반영 확인(`ippp_audit_logs`·`accepted_at` 존재) 후 통합 하네스 수행.

```
# IPPP DB 하네스 — 대상: https://amnzfscyvfisrbtyzrkx.supabase.co
ok - createRequest: 배열 NOT NULL 빈배열 허용        (P0-2)
ok - RLS: A기관은 B기관 건을 볼 수 없음               (격리)
ok - RLS: A기관은 자기 진행건을 볼 수 있음
ok - RLS: 기관은 draft 건을 볼 수 없음
ok - P0-3: 비활성 관리자는 RLS 접근 불가             (is_active 강화 검증)
# pass 5  fail 0
```

- 테스트 데이터(`harness+*@example.com`, `H-Agency*`, 테스트 건)는 실행 후 **전량 정리 → 잔존 0건** 확인.
- 실행에 사용한 `harness/.env.harness`(운영 service_role 키 포함)는 실행 후 **삭제**. 재실행 시 재생성 필요.

> 참고: 로컬 Supabase는 이 환경에 Docker가 없어 미사용. ESLint는 환경의 `eslint-plugin-jsx-a11y`
> 설치 손상으로 실행 불가(코드 변경과 무관) → 빌드는 `--no-lint` 로 검증.

## 2. 발견 → 수정 → 테스트 매핑

| 발견 | 수정 | 회귀 테스트 |
|------|------|-------------|
| P0-1 `used_at`/`accepted_at` 드리프트 | 정정 마이그레이션(rename/병합) | DB: 초대 플로(수동) · 빌드 통과 |
| P0-2 배열 NOT NULL 에 null INSERT | `createRequest` 빈배열 보정 | DB: "배열 빈배열 INSERT 허용" |
| P0-3 비활성 관리자 RLS 접근 | `is_admin()`/`get_my_internal_role()` is_active | DB: "비활성 관리자 접근 불가" |
| P0-4 브라우저 권한 INSERT/조회 | 서버 라우트(`/api/invitations/accept` POST·GET) | 빌드: 라우트 생성 확인 |
| P0-5 Storage 정책 미코드화 | 버킷+Storage RLS 마이그레이션 | DB: 업로드 RLS(로컬 권장) |
| P1-1 2단계 완료 우회 | 기관 업로더 확인서 강제 | 로직: `hasAgencyCertificate` |
| P1-2 감사 추적 부재 | `ippp_audit_logs` + `writeAuditLog` | 빌드/타입 통과 |
| P1-3 재배정 시 배열 null | `assigned_member_ids: []` | DB: 배열 INSERT |
| P1-5 연체 가시성 | (로드맵) `dueSoonWindow` 추출로 후속 분리 용이 | 로직: `dueSoonWindow` |

## 3. 격리 DB 하네스에서 검증되는 항목 (실행 시)

`npm run harness:db` (로컬/테스트 Supabase, 운영 URL 자동 차단):

1. 배열 NOT NULL 빈배열 INSERT 허용 (P0-2)
2. RLS — 타 기관 건 비노출 / 자기 진행건 노출 / draft 비노출
3. is_active=false 관리자 RLS 접근 차단 (P0-3)

## 4. 후속 권고 (차기 세션)

- **운영 DB 정합화**: 본 hardening 마이그레이션을 운영에 적용해 VCS=운영 일치 (스키마 드리프트 해소).
- DB 하네스 케이스 확장: Storage 경로 RLS, 완료 통제 end-to-end, 초대 수락 라우트 통합.
- 연체(overdue) KPI/대시보드 분리 노출 구현 (P1-5).
- ESLint 환경 복구(`npm i` 재설치) 후 `next build` 전체(lint 포함) 게이트 복원.
- 감사 로그 활동 타임라인 UI(P1-2 연계) 및 요청 항목 체크리스트(벤치마킹 권고).
