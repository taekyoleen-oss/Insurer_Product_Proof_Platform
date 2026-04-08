# ui-builder 에이전트

## 역할
Next.js 15 App Router 페이지, TweakCN 컴포넌트 구현. RSC + Client Components 혼용.

## 참조 문서
- 설계서: `docs/IPPP_design_spec_v1.2.md` §2, §4, §6.1
- 파일 업로드 패턴: `.claude/skills/file-upload/SKILL.md`
- db-architect 산출물: `output/db-schema-complete.md`
- api-designer 산출물: `output/api-design-complete.md`

## 디자인 시스템
- 컬러 토큰: §4.2 그대로 적용 (`--primary: #1E3A5F`, `--accent: #3B82F6` 등)
- TweakCN 기반. `npx shadcn@latest add` 로 컴포넌트 설치
- 마감 임박: `animate-pulse` + warning 색상 (`#F59E0B`)
- 상태 변경: scale + color transition 300ms

## 구현할 페이지 목록 (§2.1)

### Public
- `app/(public)/page.tsx` — 로그인 전용 (로고+서비스명+로그인폼+비밀번호찾기)
- `app/(public)/auth/invite/page.tsx` — 초대 수락·회원가입
- `app/(public)/auth/callback/page.tsx` — Supabase Auth 콜백

### Admin (§2.1)
- `app/(admin)/dashboard/page.tsx` — KPI 카드 4종 + 기관별 활성 건 수
- `app/(admin)/dashboard/requests/page.tsx` — 검증 건 목록 (필터·검색)
- `app/(admin)/dashboard/requests/new/page.tsx` — 검증 건 생성 폼
- `app/(admin)/dashboard/requests/[id]/page.tsx` — 상세 (파일·코멘트·상태변경·완료처리)
- `app/(admin)/dashboard/archive/page.tsx` — 다중 필터 + ilike 키워드 검색
- `app/(admin)/dashboard/report/page.tsx` — 기관별 실적 리포트
- `app/(admin)/dashboard/agencies/page.tsx` — 기관 관리
- `app/(admin)/dashboard/settings/members/page.tsx` — super_admin 전용

### Agency (§2.1)
- `app/(agency)/portal/page.tsx` — KPI 카드 3종 + 담당 건 목록
- `app/(agency)/portal/requests/[id]/page.tsx` — 파일·코멘트 (기관용)
- `app/(agency)/portal/members/page.tsx` — agency_admin 전용
- `app/(agency)/portal/profile/page.tsx` — 담당자 정보·연락처 수정
- `app/(agency)/portal/report/page.tsx` — 자기 기관 실적 조회

## 핵심 컴포넌트 (§4.3)

### 공통 (`components/shared/`)
- `StatusBadge` — 4상태 컬러맵 + 아이콘
- `KPICard` — 아이콘 + 수치 + delta
- `AgencyAvatar` — 이니셜 + 컬러 해시
- `DeadlineCountdown` — D-day 표시, D-7 이내 animate-pulse

### 검증 건 (`components/requests/`)
- `RequestCard` — 상태별 좌측 컬러 border
- `FilterBar` — Combobox 다중 선택 + 키워드 검색 input
- `RequestForm` — 검증 건 생성/수정 폼 (hazard_type 하이브리드 선택)

### 파일 (`components/files/`)
- `FileUploadZone` — 드래그앤드롭, 진행 바, 100MB 상한
- `FileVersionHistory` — 최신만 기본 표시 + "이전 버전 보기" 펼침

### 코멘트 (`components/comments/`)
- `CommentThread` — 관리자/기관 말풍선 좌우, 1단 답글, 소프트 삭제 표시
  - Supabase Realtime 구독 (Client Component)
  - 삭제된 코멘트: `[삭제된 메시지]` 표시
  - 플레인 텍스트 입력 (Markdown 렌더 없음)

### 대시보드 (`components/dashboard/`)
- `ReportPeriodSelector` — 월/분기/반기/연간/직전1년 탭
- `AgencyPerformanceTable` — 건수·완료율·평균소요일·미완료 건수
- `AgencyReportSummary` — `/portal/report` 전용 자기 기관 실적

## 레이아웃 구조
- `app/(admin)/layout.tsx`: 고정 사이드바 240px + 권한 체크 (admin 이상)
- `app/(agency)/layout.tsx`: 고정 사이드바 240px + 권한 체크 (agency 이상)
- 반응형: 1024px 미만 햄버거 메뉴

## 상태 관리
- 서버 상태: RSC + Server Action (기본)
- 실시간: Supabase Realtime (코멘트만, Client Component)
- 로컬 UI 상태: `useState` / `useReducer`

## 산출물 경로
- `output/ui-build-complete.md` (완료 보고)

## 완료 기준
- [ ] 전체 페이지 16개 구현
- [ ] 핵심 컴포넌트 전체 구현
- [ ] Realtime 코멘트 구독 동작
- [ ] 2단계 완료 흐름 UI (확인서 업로드 감지 → 완료 버튼 활성화)
- [ ] 반응형 레이아웃 (1024px 기준)
- [ ] `output/ui-build-complete.md` 작성
