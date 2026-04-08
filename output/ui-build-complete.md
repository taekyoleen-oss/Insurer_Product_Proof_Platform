# IPPP UI 빌드 완료 보고서

## 구현된 페이지 목록 (총 16개)

### Public (3개)
| 파일 | 설명 |
|------|------|
| `app/(public)/page.tsx` | 로그인 전용 |
| `app/(public)/auth/invite/page.tsx` | 초대 수락·회원가입 |
| `app/(public)/auth/callback/page.tsx` | Supabase Auth 콜백 |

### Admin (8개)
| 파일 | 설명 |
|------|------|
| `app/(admin)/layout.tsx` | 고정 사이드바 레이아웃, 권한 체크 |
| `app/(admin)/dashboard/page.tsx` | KPI 카드 4종 + 기관별 활성 건수 |
| `app/(admin)/dashboard/requests/page.tsx` | 검증 건 목록 (필터·검색) |
| `app/(admin)/dashboard/requests/new/page.tsx` | 검증 건 생성 폼 |
| `app/(admin)/dashboard/requests/[id]/page.tsx` | 상세 (파일·코멘트·상태변경·완료처리) |
| `app/(admin)/dashboard/archive/page.tsx` | 다중 필터 + ilike 키워드 검색 |
| `app/(admin)/dashboard/report/page.tsx` | 기관별 실적 리포트 (기간 선택) |
| `app/(admin)/dashboard/agencies/page.tsx` | 기관 관리 (생성·비활성화·agency_admin 초대) |
| `app/(admin)/dashboard/settings/members/page.tsx` | super_admin 전용 내부 관리자 관리 |

### Agency (5개)
| 파일 | 설명 |
|------|------|
| `app/(agency)/layout.tsx` | 고정 사이드바 레이아웃, 권한 체크 |
| `app/(agency)/portal/page.tsx` | KPI 카드 3종 + 담당 건 목록 |
| `app/(agency)/portal/requests/[id]/page.tsx` | 파일·코멘트 (기관용) |
| `app/(agency)/portal/members/page.tsx` | agency_admin 전용 멤버 초대·비활성화 |
| `app/(agency)/portal/profile/page.tsx` | 담당자 정보·연락처 수정, 비밀번호 변경 |
| `app/(agency)/portal/report/page.tsx` | 자기 기관 실적 조회 |

---

## 구현된 컴포넌트 목록

### 공통 (`components/shared/`)
| 파일 | 설명 |
|------|------|
| `StatusBadge` | 4상태 컬러맵 + 아이콘 |
| `KPICard` | 아이콘 + 수치 + description |
| `AgencyAvatar` | 이니셜 + 컬러 해시 |
| `DeadlineCountdown` | D-day 표시, D-7 이내 animate-pulse |

### 검증 건 (`components/requests/`)
| 파일 | 설명 |
|------|------|
| `RequestCard` | 상태별 좌측 컬러 border |
| `FilterBar` | Combobox 다중 선택 + 키워드 검색 |
| `RequestForm` | 검증 건 생성/수정 폼 |

### 파일 (`components/files/`)
| 파일 | 설명 |
|------|------|
| `FileUploadZone` | 드래그앤드롭, 진행 바, 100MB 상한 |
| `FileVersionHistory` | 최신만 기본 + "이전 버전 보기" 펼침 |

### 코멘트 (`components/comments/`)
| 파일 | 설명 |
|------|------|
| `CommentThread` | 관리자/기관 말풍선 좌우, 1단 답글, Realtime 구독 |

### 대시보드 (`components/dashboard/`)
| 파일 | 설명 |
|------|------|
| `ReportPeriodSelector` | 월/분기/반기/연간/직전12개월/직접설정 탭 |
| `AgencyPerformanceTable` | 건수·완료율·평균소요일·미완료 건수, 정렬 |
| `AgencyReportSummary` | 기관용 실적 KPI + 건 목록 테이블 |

### 레이아웃 (`components/layout/`)
| 파일 | 설명 |
|------|------|
| `AdminSidebar` | 240px 고정, 반응형 햄버거 |
| `AgencySidebar` | 240px 고정, 반응형 햄버거 |

---

## 완료 체크리스트

- [x] **전체 페이지 16개** 구현
- [x] **핵심 컴포넌트 전체** 구현
- [x] **Realtime 코멘트 구독** 동작 (CommentThread - Supabase Realtime)
- [x] **2단계 완료 흐름 UI** (파일 업로드 감지 → 완료 버튼 활성화, RequestStatusActions)
- [x] **반응형 레이아웃** (1024px 기준, Sheet 햄버거 메뉴)
- [x] **권한 분기** 구현 (super_admin 전용, agency_admin 전용)
- [x] **소프트 삭제 UI** (파일·코멘트 [삭제된 메시지] 표시)
- [x] **기관 관리** (생성·비활성화·agency_admin 초대)
- [x] **내부 관리자 관리** (초대·권한 회수, super_admin 전용)
- [x] **기관 멤버 관리** (초대·비활성화, agency_admin 전용)
- [x] **프로필 수정** (이름·연락처, 비밀번호 변경)

---

## 신규 생성 파일 (이번 단계)

| 파일 | 설명 |
|------|------|
| `app/(admin)/dashboard/report/page.tsx` | 관리자 실적 리포트 |
| `app/(admin)/dashboard/agencies/page.tsx` | 기관 목록 (Server) |
| `app/(admin)/dashboard/agencies/AgenciesClient.tsx` | 기관 관리 UI (Client) |
| `app/(admin)/dashboard/settings/members/page.tsx` | 내부 관리자 (Server, 권한 체크) |
| `app/(admin)/dashboard/settings/members/InternalMembersClient.tsx` | 내부 관리자 UI (Client) |
| `app/(agency)/portal/page.tsx` | 기관 포털 대시보드 |
| `app/(agency)/portal/requests/[id]/page.tsx` | 기관용 검증 건 상세 |
| `app/(agency)/portal/members/page.tsx` | 기관 멤버 (Server, 권한 체크) |
| `app/(agency)/portal/members/AgencyMembersClient.tsx` | 기관 멤버 UI (Client) |
| `app/(agency)/portal/profile/page.tsx` | 프로필 수정 (Client) |
| `app/(agency)/portal/report/page.tsx` | 기관 자신 실적 조회 |
