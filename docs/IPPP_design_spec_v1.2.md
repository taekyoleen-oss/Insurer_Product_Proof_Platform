# Insurer_Product Proof Platform (IPPP) — 웹 개발 설계서

> **버전**: v1.3 | **기술 스택**: Next.js 15 (App Router) · TweakCN · Supabase · Vercel

---

## 1. 프로젝트 컨텍스트

### 1.1 목적 및 배경

보험사 상품·위험률 개발 실무자가 계리법인 등 외부 검증기관과 주고받는 검증 의뢰·결과·피드백을 하나의 플랫폼에서 일원화하여 관리하는 웹 애플리케이션입니다.

현재 이메일 기반으로 분산된 파일·커뮤니케이션 이력을 구조화된 데이터베이스로 전환하고, 검증 진행 상태를 실시간으로 가시화합니다.

### 1.2 대상 사용자 및 권한 계층

| 역할 | 설명 | 접근 권한 |
|------|------|----------|
| `super_admin` | 보험사 내부 최초 관리자 (본인). 시스템 전체 소유자. | 전체 기능 + 내부 `admin` 초대·권한 회수 |
| `admin` | 슈퍼 관리자가 초대한 내부 추가 담당자 | 검증 건 생성·배정·마감, 기관 관리, DB 아카이브 (내부 관리자 초대 제외) |
| `agency_admin` | 외부 검증기관의 대표 담당자. 기관당 1명만 존재. | 자기 기관 배정 건 전체 + 기관 내 멤버 초대·권한 회수 |
| `agency_member` | `agency_admin`이 초대한 기관 내 추가 담당자 | 자기 기관 배정 건 열람·파일 업로드·코멘트 작성 |

### 1.3 핵심 기능 요약

- **검증 건(Request) 생성**: 위험률 또는 상품 검증 타입 선택, 마감일·배정 기관 지정 (1건 = 1기관), 상세 설명(`description`) 선택 입력, 파일 첨부 (최대 10개 내외)
- **외부기관 워크스페이스**: 관리자가 `agency_admin` 초대 → `agency_admin`이 기관 내 멤버 추가 초대 → 각자 배정된 건 열람
- **양방향 파일 교환**: 관리자↔기관 간 버전별 파일 업로드, 코멘트·질의응답 스레드 (1단 답글 지원)
- **이메일 알림**: 새 파일·코멘트 발생 시 담당자에게 자동 발송 (Resend, 한국어 전용)
- **검증 완료 처리 (2단계)**: ① 기관이 최종 검증확인서 업로드 → ② admin이 확인 후 완료 승인 → 상태 → `completed`, DB 아카이브 자동 등록
- **대시보드**: 관리자용(전체 현황) · 기관용(담당 건 현황) 각각 제공
- **검증 DB 아카이브**: 완료 건 다중 필터 + 제목 키워드(`ilike`) 검색 (위험률 종류·상품 종류·기관·연도·상태), 확인서 다운로드
- **기관별 실적 리포트 (관리자)**: 기간 선택(월·분기·반기·연간·직전 1년) → 기관별 검증 건수·완료율·평균 소요일 집계 테이블
- **기관 자신 실적 조회 (`/portal/report`)**: 담당 기관이 자신의 기간별 실적(건수·완료율·평균 소요일·건 목록 요약) 조회

### 1.4 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 프론트엔드 | Next.js 15 (App Router) | RSC + Client Components 혼용 |
| UI 컴포넌트 | TweakCN (shadcn/ui 기반) | 커스터마이징 목록은 §4 참조 |
| 인증 | Supabase Auth | 이메일 초대 + 이메일/비밀번호 로그인 |
| 데이터베이스 | Supabase PostgreSQL + RLS | 기존 유료 구독 프로젝트 공유 |
| 파일 스토리지 | Supabase Storage | 버킷 단위 접근 제어, Signed URL |
| 이메일 | Resend | 알림 전용 트랜잭셔널 이메일 (한국어 전용) |
| 배포 | Vercel | 자동 CI/CD |
| 언어 | TypeScript | strict 모드 |

### 1.5 제약조건

| 구분 | 내용 |
|------|------|
| 보안 | RLS로 외부기관은 배정된 건 데이터만 SELECT 가능. 파일 스토리지도 Signed URL 방식으로 직접 접근 차단. |
| 파일 | 건당 최대 파일 수 15개, 단일 파일 최대 100MB. 허용 파일 형식: 무제한 (MIME 검증 없음). |
| Signed URL | 유효 시간 24시간. 이후 재발급 필요. |
| 성능 | 대시보드 초기 로드 ≤ 2초 (LCP 기준), Lighthouse 성능 점수 ≥ 85 |
| 접근성 | WCAG 2.1 AA 수준 — 키보드 탐색, 색 대비 4.5:1 이상 |
| 범위 | v1.3는 위험률·상품 검증 2종 한정. 타 업무 유형은 v2.0 이월 |
| 규모 | 월 11~50건 (중간 규모). Realtime 배치 처리 불필요, 단순 구독으로 충분. |
| 구현 | 완전 신규 (Supabase 테이블 없음, DB 마이그레이션부터 시작). v1.3 전체 기능 한 번에 구현. |

### 1.6 도메인 용어 정의

| 용어 | 설명 |
|------|------|
| 검증 건 (Request) | 위험률 또는 상품 하나에 대한 검증 의뢰 단위 |
| 위험률 검증 | 사망·질병·상해 등 보험 위험률 산출 결과의 외부 검증 |
| 상품 검증 | 생명·손해보험 상품 전반의 계리적 적정성 외부 검증 |
| 검증기관 | 계리법인 등 외부 검증 파트너 (최대 5개) |
| 검증확인서 | 검증 완료 후 기관이 발행하는 공식 확인 문서 |
| 아카이브 | 완료된 검증 건을 카테고리·필터별로 조회 가능하게 보관하는 DB |
| 코멘트 스레드 | 검증 건 단위로 관리자·기관이 주고받는 질의응답 기록 (플레인 텍스트, 1단 답글 지원) |
| `in_progress_at` | 검증 건이 `draft → in_progress`로 전환된 시각. 평균 소요일 계산의 기준점. |

---

## 2. 페이지 목록 및 사용자 흐름

### 2.1 전체 페이지 목록

| 경로 | 페이지명 | 접근 권한 | 설명 |
|------|--------|----------|------|
| `/` | 로그인 | Public | 로그인 전용 (로고 + 서비스명 + 로그인 폼). 비밀번호 찾기 포함. 로그인 시 역할별 대시보드로 리다이렉트 |
| `/auth/invite` | 초대 수락 | Public | 이메일 초대 링크 랜딩. 회원가입 폼 표시 |
| `/auth/callback` | OAuth 콜백 | Public | Supabase Auth 처리용 |
| `/dashboard` | 관리자 대시보드 | admin 이상 | 전체 검증 건 현황, KPI 카드, 기관별 진행 상태 |
| `/dashboard/requests` | 검증 건 목록 | admin 이상 | 필터·검색, 새 검증 건 생성 버튼 |
| `/dashboard/requests/new` | 검증 건 생성 | admin 이상 | 타입 선택, 기관 배정, 파일 업로드, 마감일 설정 |
| `/dashboard/requests/[id]` | 검증 건 상세 (관리자) | admin 이상 | 파일 목록, 코멘트 스레드, 상태 변경, 완료 처리 |
| `/dashboard/archive` | 검증 DB 아카이브 | admin 이상 | 완료 건 다중 필터 + 키워드 검색, 확인서 다운로드 |
| `/dashboard/report` | 기관별 실적 리포트 | admin 이상 | 기간 선택 → 기관별 검증 건수·완료율·평균 소요일 집계 |
| `/dashboard/agencies` | 검증기관 관리 | admin 이상 | 기관 목록(이름·연락처·활성여부), `agency_admin` 초대·비활성화 |
| `/dashboard/settings/members` | 내부 관리자 관리 | **super_admin 전용** | 내부 `admin` 초대·목록·권한 회수 |
| `/portal` | 기관 포털 대시보드 | agency 이상 | 담당 검증 건 목록, KPI 카드(활성 건수·마감 임박·완료 건수), 마감 임박 강조 |
| `/portal/requests/[id]` | 검증 건 상세 (기관) | agency 이상 | 열람 가능 파일, 파일 업로드, 코멘트 작성 |
| `/portal/members` | 기관 멤버 관리 | **agency_admin 전용** | 기관 내 멤버 초대·목록·비활성화 |
| `/portal/profile` | 기관 프로필 | agency 이상 | 담당자 정보 수정 (연락처 포함), 비밀번호 변경 |
| `/portal/report` | 기관 자신 실적 조회 | agency 이상 | 자신 기관의 기간별 실적 조회 (건수·완료율·평균 소요일·건 목록 요약) |

### 2.2 사용자 흐름

#### 관리자 플로우

```
로그인
  └─→ 관리자 대시보드
        ├─→ 검증 건 생성: 타입(위험률/상품) → 기관 선택 → 파일 업로드 → 마감일 → 등록 (draft)
        │     └─→ admin이 기관 배정 후 in_progress 전환 → 기관 agency_admin에게 이메일 알림
        ├─→ 검증 건 상세: 코멘트·추가 파일 교환 (반복)
        │     └─→ 완료 처리 (2단계): ① 기관이 검증확인서 업로드 → ② admin이 승인·완료 버튼 → 아카이브 자동 등록
        ├─→ 기관별 실적 리포트: 기간 선택 → 집계 확인
        └─→ 기관 관리: agency_admin 초대 (agency_admin이 기관 내 멤버 직접 관리)
```

#### 외부기관 플로우

```
초대 이메일 수신 (agency_admin)
  └─→ 초대 링크 → 회원가입 → 로그인
        └─→ 기관 포털 대시보드 (in_progress 상태부터 노출)
              ├─→ 멤버 관리: agency_member 초대 (agency_admin 전용)
              ├─→ 검증 건 상세 진입 → 자료 열람·파일 다운로드
              ├─→ 검증 결과 파일 업로드 + 코멘트 → 관리자에게 이메일 알림
              │     └─→ 추가 요청 반복 → 최종 검증확인서 업로드
              └─→ 자신 기관 실적 조회 (/portal/report)
```

### 2.3 인증·권한 분기 조건

| 조건 | 처리 |
|------|------|
| 미로그인 상태에서 보호 경로 접근 | `/` 로 리다이렉트 |
| `super_admin` / `admin`이 `/portal` 접근 | `/dashboard` 로 리다이렉트 |
| `agency_admin` / `agency_member`가 `/dashboard` 접근 | `/portal` 로 리다이렉트 |
| `agency_member`가 미배정 건 ID 직접 접근 | 404 반환 (RLS에서 SELECT 차단) |
| `agency_member`가 `/portal/members` 접근 | 403 반환. `agency_admin`만 접근 가능. |
| `admin`이 `/dashboard/settings/members` 접근 | 403 반환. `super_admin`만 접근 가능. |
| `agency_member`가 `/portal/report` 접근 | 허용. 자기 기관 건만 노출 (RLS 적용). |
| 초대 링크 만료 (72시간) | 만료 안내 페이지 + 재초대 요청 안내 |

### 2.4 데이터 흐름

| 단계 | 흐름 |
|------|------|
| 입력 | 관리자: 검증 건 메타데이터(타입·기관·마감일·description) + 파일 / 기관: 결과 파일 + 코멘트 |
| 처리 | 파일 → Supabase Storage 업로드 (`agencies/{agency_id}/requests/{request_id}/{filename}`) → Signed URL 생성 (24시간) |
| 알림 | API Route → Resend API → 담당자 이메일 발송 (이벤트 발생 시마다 즉시, 한국어) |
| 저장 | 검증 건 메타데이터·상태·코멘트 → PostgreSQL / 파일 → Storage |
| 표시 | 대시보드: 서버 컴포넌트 SSR / 코멘트 스레드: Supabase Realtime 구독 |
| 아카이브 | 상태 → `completed` 전환 시 `archive_at` 타임스탬프 기록, 아카이브 뷰 필터에 노출 |

---

## 3. 데이터 모델 (Supabase)

> 모든 테이블은 `ippp_` 프리픽스 사용. 기존 Supabase 프로젝트와 충돌 방지.
> 완전 신규 구현 — DB 마이그레이션부터 시작.

### 3.1 테이블 목록

| 테이블명 | 설명 | RLS | Realtime |
|---------|------|-----|----------|
| `ippp_agencies` | 외부 검증기관 목록 (이름, 연락처, 활성 여부, 계약 정보). | Admin 전체, Agency 본인만 | — |
| `ippp_agency_members` | 기관 담당자 계정 (auth.users 연결). `agency_role` 컬럼으로 `agency_admin` / `agency_member` 구분 | `agency_admin`: 기관 내 전체 / `agency_member`: 본인만 | — |
| `ippp_internal_members` | 내부 관리자 계정 (`super_admin` / `admin` 구분). auth.users 연결. | `super_admin` 전체, `admin` 본인만 | — |
| `ippp_requests` | 검증 건 마스터 (타입·상태·마감일·배정기관). 1건 = 1기관. | Admin 전체, Agency 배정 건만 | — |
| `ippp_files` | 첨부 파일 메타데이터 (Storage 경로·버전·업로더·소프트 삭제) | 검증 건 접근권한 상속 | — |
| `ippp_comments` | 코멘트 스레드 (건별·작성자·내용·타임스탬프·1단 답글·소프트 삭제) | 검증 건 접근권한 상속 | ✅ |
| `ippp_invitations` | 초대 토큰 관리 (이메일·기관·만료시각·사용여부·초대 역할) | `super_admin`·`admin` 전체 | — |
| `ippp_notifications` | 알림 로그 (수신자·유형·발송 상태·Resend ID) | `super_admin`·`admin` 전체 | — |

### 3.2 ippp_requests 핵심 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid PK` | 검증 건 식별자 |
| `type` | `enum` | `'hazard_rate'` \| `'product'` — 위험률 또는 상품 검증 |
| `title` | `text` | 검증 건 제목 |
| `description` | `text` | 검증 건 상세 설명 (선택 입력) |
| `agency_id` | `uuid FK` | `ippp_agencies.id` 참조 |
| `assigned_member_ids` | `uuid[]` | 이메일 알림 수신 대상 agency 멤버 ID 목록. 열람 권한은 기관 전체 멤버에 허용. |
| `status` | `enum` | `'draft'` \| `'in_progress'` \| `'hold'` \| `'completed'` |
| `hazard_type` | `text[]` | 위험률 종류 배열. 고정 열거(하이브리드): `['사망위험률', '질병위험률', '상해위험률', '신체후유장위험률', '장기요양위험률']` + 기타 직접 입력 가능 |
| `product_type` | `text` | 상품 종류. 고정 열거: `'사망보험'` \| `'질병보험/CI보험'` \| `'연금보험'` \| `'장기요양보험'` |
| `due_date` | `date` | 마감 기한. 초과 시 자동 상태 변경 없음 — 시각적 경고(animate-pulse, 경고 색상)만 표시. |
| `in_progress_at` | `timestamptz` | `draft → in_progress` 전환 시각. 평균 소요일 계산의 기준점. |
| `archive_at` | `timestamptz` | 완료 처리 시각 (NULL이면 미완료) |
| `fiscal_year` | `int4` | 연도 (아카이브 필터용) |
| `fiscal_quarter` | `int2` | 분기 1~4 (일반 분기: 1Q=1~3월, 2Q=4~6월, 3Q=7~9월, 4Q=10~12월) |

### 3.3 ippp_agencies 컬럼

기존 컬럼(id, name, is_active, created_at 등) 외 추가 컬럼:

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `phone` | `text` | 기관 대표 연락처(전화) |
| `contact_email` | `text` | 기관 대표 연락처(이메일) |
| `contract_date` | `date` | 계약 날짜 |
| `address` | `text` | 기관 소재지 |

> **기관 비활성화 정책**: 진행 중인 건은 유지하고 관리자에게 경고 알림 표시. 비활성 기관에는 신규 검증 건 배정 불가.

### 3.4 ippp_agency_members 컬럼

기존 컬럼(id, agency_id, user_id, agency_role, name, email, is_active, invited_at, created_at 등) 외 추가 컬럼:

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `phone` | `text` | 담당자 연락처. `/portal/profile`에서 본인이 수정 가능. |

### 3.5 ippp_comments 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid PK` | 코멘트 식별자 |
| `request_id` | `uuid FK` | `ippp_requests.id` 참조 |
| `author_id` | `uuid FK` | `auth.users.id` 참조 |
| `content` | `text` | 코멘트 내용 (플레인 텍스트, Markdown 미지원). 수정 불가. |
| `parent_id` | `uuid FK` (nullable) | 1단 답글용 자기참조 (`ippp_comments.id`). 2단 이상 답글 금지. |
| `deleted_at` | `timestamptz` | 소프트 삭제 시각. NULL이면 정상. 삭제 시 `[삭제된 메시지]`로 표시. |
| `created_at` | `timestamptz` | 작성 시각 |

> **코멘트 삭제 권한**: 작성자 본인 + admin. 수정 불가.

### 3.6 ippp_files 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid PK` | 파일 식별자 |
| `request_id` | `uuid FK` | `ippp_requests.id` 참조 |
| `uploader_id` | `uuid FK` | `auth.users.id` 참조 |
| `filename` | `text` | 원본 파일명 |
| `storage_path` | `text` | Storage 경로: `agencies/{agency_id}/requests/{request_id}/{filename}` |
| `version` | `int4` | 동일 파일명 누적 버전 (자동 증가). 모든 버전 Storage 영구 보관. |
| `deleted_at` | `timestamptz` | 소프트 삭제 시각. NULL이면 정상. UI: 최신 버전만 기본 표시 + "이전 버전 보기" 펼침. |
| `created_at` | `timestamptz` | 업로드 시각 |

> **파일 삭제 권한**: 업로더 본인 + admin. 소프트 삭제만 허용 (Storage 파일 영구 보관).

### 3.7 주요 관계

- `ippp_agencies` 1 : N `ippp_agency_members` — 기관에 여러 담당자
- `ippp_agencies` 1 : N `ippp_requests` — 기관이 여러 검증 건 담당 (1건 = 1기관)
- `ippp_requests` 1 : N `ippp_files` — 검증 건에 여러 파일
- `ippp_requests` 1 : N `ippp_comments` — 검증 건에 코멘트 스레드
- `ippp_comments` N : 1 `ippp_comments` (self) — `parent_id`로 1단 답글 구현
- `auth.users` 1 : 1 `ippp_agency_members` — Supabase Auth 사용자와 기관 담당자 연결
- `ippp_agency_members.agency_role`: `'agency_admin'` | `'agency_member'` — 기관 내 권한 계층
- `ippp_internal_members.internal_role`: `'super_admin'` | `'admin'` — 내부 권한 계층

### 3.8 RLS 정책 개요

| 테이블 | super_admin / admin | agency_admin | agency_member |
|--------|-------------------|--------------|---------------|
| `ippp_requests` | ALL | SELECT·INSERT·UPDATE (기관 건 전체, `in_progress` 이상만 노출) | SELECT (기관 건 전체, `in_progress` 이상만 노출) |
| `ippp_files` | ALL | SELECT·INSERT (기관 건). DELETE(소프트): 본인 업로드 건만 | SELECT·INSERT (기관 건). DELETE(소프트): 본인 업로드 건만 |
| `ippp_comments` | ALL | SELECT·INSERT (기관 건). DELETE(소프트): 본인 코멘트만 | SELECT·INSERT (기관 건). DELETE(소프트): 본인 코멘트만 |
| `ippp_agencies` | ALL | SELECT (본인 기관) | SELECT (본인 기관) |
| `ippp_agency_members` | ALL | SELECT·INSERT·UPDATE (기관 내 전체) | SELECT·UPDATE (본인만) |
| `ippp_internal_members` | ALL | — | — |

> **기관 재배정 정책**: 검증 건의 `agency_id`가 변경되면 이전 기관은 해당 건의 파일·코멘트에 대한 RLS 접근이 자동 차단됨 (RLS가 `agency_id` 기준으로 동작). 이전 기관의 코멘트·파일 데이터는 DB에 보존.

> **`super_admin` 초기 생성**: DB 시드 스크립트 사용. Supabase 대시보드에서 `auth.users`에 수동 삽입 후 `ippp_internal_members`에 INSERT.

---

## 4. UI/UX 설계 방향

### 4.1 디자인 톤

**선택: 다크 네이비 기반 정제된 프로페셔널 (Professional Dark)**

보험·계리 도메인은 정확성·신뢰성이 최우선입니다. 과도한 장식보다 정보 밀도와 상태 가시성에 집중하는 다크 네이비 베이스가 적합합니다. 외부 기관이 접속하는 포털도 같은 톤을 유지해 일관된 신뢰감을 줍니다.

### 4.2 컬러 토큰

| 토큰 | HEX | 용도 |
|------|-----|------|
| `--background` | `#F8FAFC` | 메인 배경 |
| `--surface` | `#FFFFFF` | 카드·패널 배경 |
| `--primary` | `#1E3A5F` | 헤더·주요 강조 |
| `--accent` | `#3B82F6` | 액션 버튼·링크·활성 상태 |
| `--success` | `#10B981` | 완료 상태 |
| `--warning` | `#F59E0B` | 마감 임박·보류 상태 |
| `--danger` | `#EF4444` | 오류·삭제 |
| `--muted` | `#6B7280` | 보조 텍스트 |
| `--border` | `#E5E7EB` | 구분선 |

### 4.3 핵심 컴포넌트 및 TweakCN 커스터마이징

| 컴포넌트 | 역할 | TweakCN 커스터마이징 |
|---------|------|-------------------|
| `RequestCard` | 검증 건 카드 (목록·대시보드) | 상태별 좌측 컬러 border, 마감 임박 시 warning 색상 + `animate-pulse` |
| `StatusBadge` | 검증 상태 뱃지 | 4개 상태별 컬러 맵, 아이콘 포함 |
| `FileUploadZone` | 파일 드래그앤드롭 업로드 | Supabase Storage 직결, 진행 바 표시. 파일 형식 무제한, 100MB 상한 |
| `FileVersionHistory` | 파일 버전 히스토리 펼침 | 최신 버전 기본 표시. "이전 버전 보기" 토글로 이전 버전 목록 펼침 |
| `CommentThread` | 코멘트 스레드 | 관리자/기관 말풍선 좌우 구분, 1단 답글, 소프트 삭제(`[삭제된 메시지]`), Realtime 갱신 |
| `FilterBar` | 아카이브 다중 필터 | Combobox 컴포넌트 다중 선택 + 제목 키워드 검색(`ilike`) |
| `KPICard` | 대시보드 지표 카드 | 아이콘 + 수치 + 전월 대비 delta |
| `AgencyAvatar` | 기관 식별 아바타 | 기관명 이니셜 + 컬러 해시 |
| `ReportPeriodSelector` | 실적 리포트 기간 선택기 | 월·분기·반기·연간·직전 1년 탭 + 커스텀 날짜 범위 Datepicker |
| `AgencyPerformanceTable` | 기관별 실적 집계 테이블 | 기간 내 건수·완료율·평균소요일·미완료 건수 컬럼 |
| `AgencyReportSummary` | 기관 포털 자신 실적 조회 | `/portal/report` 전용. 자기 기관의 건수·완료율·평균 소요일·건 목록 요약 |
| `InviteModal (관리자용)` | 관리자 측 초대 모달 | 이메일 입력 + 기관 선택 + 부여 역할(`agency_admin`) 설정 |
| `MemberManagePanel (기관용)` | 기관 내 멤버 관리 패널 | `agency_admin` 전용. 멤버 목록·초대·비활성화. `agency_member`에게는 숨김. |
| `DeadlineCountdown` | 마감일 카운트다운 | D-day 표시, D-7 이내 warning 색상 + `animate-pulse` |

#### 관리자 대시보드 KPI 카드

| KPI | 설명 |
|-----|------|
| 전체 활성 건수 | 현재 `in_progress` 또는 `hold` 상태인 검증 건 수 |
| 이번 달 완료 건수 | 이번 달 `completed`로 전환된 건 수 |
| 마감 임박 건수 | `due_date`가 D-7 이내인 활성 건 수 |
| 기관별 활성 건 수 | 각 기관별 현재 활성 건 수 |

#### 기관 포털 KPI 카드

| KPI | 설명 |
|-----|------|
| 담당 활성 건수 | 자기 기관의 `in_progress` 또는 `hold` 건 수 |
| 마감 임박 | D-7 이내 활성 건 수 |
| 완료 건수 | 자기 기관의 `completed` 건 수 |

### 4.4 반응형 브레이크포인트

| 브레이크포인트 | 너비 | 레이아웃 |
|-------------|------|---------|
| mobile | < 640px | 단일 컬럼 (주요 사용 환경은 데스크톱, 참고용) |
| tablet | 640px ~ 1024px | 사이드바 숨김, 햄버거 메뉴 |
| desktop | > 1024px | 고정 사이드바 240px + 메인 컨텐츠 영역 |
| wide | > 1440px | 메인 컨텐츠 최대 너비 1280px 제한 |

### 4.5 애니메이션·인터랙션

- 페이지 전환: Next.js View Transitions API (fade, 200ms)
- 상태 변경 (완료·보류): 상태 뱃지 scale + color transition 300ms
- 파일 업로드 진행: 인라인 progress bar, 완료 시 checkmark 애니메이션
- 코멘트 신규 수신 (Realtime): 하단에서 슬라이드업 150ms
- 마감 임박 카드: `animate-pulse` (Tailwind), warning 색상

---

## 5. 상태 전이 다이어그램

### 5.1 검증 건 상태 머신

```
                    ┌─────────────────────────────────┐
                    │                                 │
         (admin)    │                       (admin)   │
  draft ──────────→ in_progress ─────────────────────→ hold
                        │                             │
                        │ ① 기관이 확인서 업로드          │ (admin 해제)
                        ↓                             │
                  [확인서 업로드됨]                     │
                        │                             │
                        │ ② admin이 승인               ↓
                        └──────────────────────→ in_progress
                                                      │
                                           (admin 승인 후)
                                                      ↓
                                                 completed
                                              (아카이브 등록)
```

### 5.2 상태 전이 권한 표

| 전환 | 권한 | 조건 |
|------|------|------|
| `draft → in_progress` | admin 전용 | 기관 배정 후. 이 시점부터 기관 포털에 노출. `in_progress_at` 기록. |
| `in_progress → hold` | admin 전용 | 수동 일시중단 |
| `hold → in_progress` | admin 전용 | 수동 해제 |
| `in_progress → completed` | **2단계**: 기관 확인서 업로드 후 admin 승인 | admin만 `completed` 전환 가능 |
| `completed → 재개` | **불가** | 취소 후 신규 건 생성으로 대체 |

> **draft 상태**: 기관 포털에 비공개. `in_progress`로 전환 시 기관에 노출.
> **마감일 초과**: 자동 상태 변경 없음. 시각적 경고(animate-pulse, warning 색상)만 표시.

---

## 6. 구현 스펙

### 6.1 폴더 구조

```
/ippp
  ├── CLAUDE.md                          # 메인 에이전트 지침 (오케스트레이터)
  ├── .claude/
  │   ├── agents/
  │   │   ├── ui-builder/AGENT.md
  │   │   ├── db-architect/AGENT.md
  │   │   └── api-designer/AGENT.md
  │   └── skills/
  │       ├── supabase-rls/              # RLS 정책 패턴 레퍼런스
  │       ├── file-upload/               # Storage 업로드·Signed URL 패턴
  │       └── email-notify/             # Resend API 호출 패턴
  ├── app/
  │   ├── (public)/
  │   │   ├── page.tsx                   # 로그인 전용 (로고+서비스명+로그인 폼+비밀번호 찾기)
  │   │   └── auth/
  │   │       ├── invite/page.tsx
  │   │       └── callback/page.tsx
  │   ├── (admin)/                       # Admin 보호 라우트 그룹
  │   │   ├── layout.tsx                 # super_admin / admin 권한 체크
  │   │   └── dashboard/
  │   │       ├── page.tsx               # 관리자 대시보드
  │   │       ├── requests/
  │   │       │   ├── page.tsx
  │   │       │   ├── new/page.tsx
  │   │       │   └── [id]/page.tsx
  │   │       ├── archive/page.tsx
  │   │       ├── report/page.tsx
  │   │       ├── agencies/page.tsx
  │   │       └── settings/members/page.tsx   # super_admin 전용
  │   ├── (agency)/                      # Agency 보호 라우트 그룹
  │   │   ├── layout.tsx                 # agency_admin / agency_member 권한 체크
  │   │   └── portal/
  │   │       ├── page.tsx               # 기관 포털 대시보드
  │   │       ├── requests/[id]/page.tsx
  │   │       ├── members/page.tsx       # agency_admin 전용
  │   │       ├── profile/page.tsx
  │   │       └── report/page.tsx        # 기관 자신 실적 조회 (agency 이상)
  │   └── api/
  │       ├── invitations/route.ts
  │       ├── notifications/route.ts
  │       └── files/signed-url/route.ts
  ├── components/
  │   ├── ui/                            # TweakCN 기본 컴포넌트
  │   ├── requests/                      # 검증 건 관련
  │   ├── dashboard/                     # 대시보드 위젯
  │   ├── files/                         # 파일 업로드·목록·버전 히스토리
  │   ├── comments/                      # 코멘트 스레드
  │   └── shared/                        # StatusBadge, AgencyAvatar 등 공통
  ├── lib/
  │   ├── supabase/
  │   │   ├── client.ts                  # 클라이언트 사이드
  │   │   ├── server.ts                  # 서버 사이드
  │   │   └── queries/                   # 쿼리 함수 모음
  │   ├── resend/                        # 이메일 발송 유틸
  │   └── utils/
  ├── types/                             # TypeScript 타입 정의
  ├── output/                            # 에이전트 중간 산출물
  └── docs/
      ├── domain/schema.md               # ERD 상세 (db-architect가 작성)
      └── references/                    # 디자인 레퍼런스
```

### 6.2 에이전트 구조

**서브에이전트 3개 분리** — 페이지·컴포넌트 수가 많고 DB·API·UI 역할이 명확히 구분됨.

메인 `CLAUDE.md`가 오케스트레이터 역할. 서브에이전트 간 직접 호출 금지 → 메인을 통해 조율. 중간 산출물은 `/output/` 파일 경로로 전달.

| 서브에이전트 | 역할 | 트리거 조건 | 참조 스킬 |
|------------|------|-----------|---------|
| `ui-builder` | 페이지·컴포넌트 구현, TweakCN 커스터마이징 | 새 페이지/컴포넌트 구현 시 | `supabase-rls`, `file-upload` |
| `db-architect` | Supabase 스키마·RLS 정책·마이그레이션 | 데이터 모델 변경 시 | `supabase-rls` |
| `api-designer` | Route Handler, Server Action, Resend 연동 | 백엔드 로직 구현 시 | `email-notify` |

### 6.3 스킬 목록

| 스킬명 | 역할 | 트리거 조건 |
|-------|------|-----------|
| `supabase-rls` | RLS 정책 패턴 레퍼런스, 정책 검증 | 테이블 생성·권한 변경 시 |
| `file-upload` | Supabase Storage 업로드·Signed URL 생성 패턴 | 파일 관련 컴포넌트·API 구현 시 |
| `email-notify` | Resend API 호출, 이메일 템플릿 패턴 (한국어) | 알림 발송 로직 구현 시 |

### 6.4 구현 단계별 검증 기준

| 단계 | 성공 기준 | 검증 방법 | 실패 시 처리 |
|------|---------|---------|------------|
| DB 스키마 | 타입 오류 0, RLS 정책 통과 | TypeScript + Supabase 타입 자동생성 | 자동 재시도 (최대 3회) |
| API Route | 빌드 오류 0, 응답 스키마 Zod 통과 | 규칙 기반 + 타입 검증 | 자동 재시도 |
| UI 컴포넌트 | Lighthouse ≥ 85, 빌드 오류 0 | 규칙 기반 | 폴백 UI (단순 버전) |
| 파일 업로드 | Storage 접근 권한 정상, Signed URL 발급 (24시간) | 규칙 기반 + 실사용 테스트 | 에스컬레이션 (사람 검토) |
| 이메일 알림 | Resend 발송 성공 응답 | 규칙 기반 | 폴백: 알림 로그만 DB 저장 |
| 최종 배포 | 실제 브라우저 렌더링 확인 | 사람 검토 | 에스컬레이션 |

### 6.5 환경 변수

| 변수명 | 용도 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 (클라이언트) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 (서버 전용) |
| `RESEND_API_KEY` | Resend 이메일 발송 API 키 |
| `RESEND_FROM_EMAIL` | Resend 발신 주소 (예: `noreply@company.com`) |
| `NEXT_PUBLIC_APP_URL` | 배포 도메인 (초대 링크 생성용) |
| `INVITATION_EXPIRE_HOURS` | 초대 링크 유효 시간 (기본 72) |

### 6.6 구현 완료 검증 체크리스트

1. **스키마**: `supabase db diff` 로 마이그레이션 무결성 확인
2. **RLS**: 각 역할별 Supabase Studio에서 `SELECT/INSERT/UPDATE/DELETE` 정책 수동 테스트
3. **파일 업로드**: Signed URL 24시간 유효 확인 / `agencies/{id}/requests/{id}/` 경로 확인
4. **코멘트 Realtime**: 두 브라우저 탭에서 코멘트 작성 → 상대방 탭 자동 갱신 확인
5. **2단계 완료 흐름**: 기관 확인서 업로드 → 관리자 완료 버튼 활성화 → 완료 처리 → 아카이브 등장
6. **아카이브 키워드 검색**: 제목 일부 입력 후 결과 필터링 확인
7. **기관 포털 리포트**: `/portal/report` 접근 시 자기 기관 데이터만 노출 확인

---

## 7. v2.0 이월 기능

다음 기능은 v1.3 범위에서 제외하고 v2.0으로 이월합니다.

- KakaoTalk 알림 연동 (이메일 외 추가 채널)
- 검증 건 승인 워크플로우 (다단계 내부 결재)
- 위험률/상품 외 추가 검증 업무 유형
- 아카이브 통계 리포트 (연간 검증 현황 차트)
- 외부기관 복수 담당자 동시 배정
- 모바일 전용 최적화 (PWA)

---

## 8. 참고 자료

| 분류 | 내용 |
|------|------|
| 기술 문서 | Next.js 15 App Router — https://nextjs.org/docs |
| 기술 문서 | Supabase Auth — https://supabase.com/docs/guides/auth |
| 기술 문서 | Supabase Storage — https://supabase.com/docs/guides/storage |
| 기술 문서 | Resend API — https://resend.com/docs |
| UI 컴포넌트 | shadcn/ui — https://ui.shadcn.com |
| UI 컴포넌트 | TweakCN — https://tweakcn.com |
| 스키마 상세 | `docs/domain/schema.md` (구현 시 db-architect가 작성) |

---

> **구현 착수 안내**: 이 파일을 프로젝트 루트의 `docs/IPPP_design_spec_v1.2.md`에 두고, Claude Code 시작 시 `CLAUDE.md`에서 이 문서를 참조하도록 지정하세요.
