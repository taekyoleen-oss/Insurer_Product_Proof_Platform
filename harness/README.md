# IPPP 테스트 하네스

설계서 의도와 실제 동작을 **실데이터로 검증**하고 회귀를 방지하기 위한 경량 하네스.
진단 결과(`docs/IPPP_appropriateness_assessment_v1.md`)의 P0/P1 수정 사항을 테스트로 고정한다.

## 구성

| 층 | 위치 | 의존성 | 실행 환경 |
|----|------|--------|-----------|
| 순수 로직 회귀 | `harness/logic/domain.test.ts` | 0 (node:test) | **어디서나 즉시 실행** |
| 격리 DB 통합 (RLS·통제) | `harness/db/rls.mjs` | `@supabase/supabase-js` | 로컬 Supabase / 테스트 프로젝트 |
| 오케스트레이터 | `harness/run.mjs` | — | 위 둘을 순차 실행 |

## 실행

```bash
# 1) 로직 회귀 테스트 (즉시)
npm run harness:logic

# 2) 전체 (로직 + .env.harness 있으면 DB 통합)
npm run harness
```

### DB 통합 테스트 준비

운영 데이터 오염 방지를 위해 **반드시 격리 인스턴스**를 사용한다.
하네스는 `.env.harness` URL 이 운영(`.env.local`)과 같거나 로컬/테스트처럼 보이지 않으면 **자동 중단**한다.

```bash
# (A) 로컬 Supabase 기동 — Docker 필요
supabase start
supabase db reset            # init + hardening 마이그레이션 + seed 적용

# (B) 자격 설정
cp harness/.env.harness.example harness/.env.harness
#   supabase start 출력의 API URL / anon / service_role 키 입력

# (C) 실행
npm run harness:db
```

> 별도 "테스트" Supabase 프로젝트를 써도 된다. 이 경우 URL 에 `test`/`staging` 이 포함되거나
> `HARNESS_ALLOW_PROD=I_UNDERSTAND` 를 명시해야 가드를 통과한다.

## 현재 검증 항목

**로직(즉시 실행, 11 케이스 통과 확인됨)**
- 상태 전이 허용/불허 (§5.2)
- 스토리지 경로 빌드/파싱 (버전 접두사)
- 리포트 기간 범위(분기/연/월/custom) · 평균 소요일 · 완료율
- 마감 임박 윈도우
- **2단계 완료 통제**: admin 단독 파일만으로 완료 불가 (P1-1 회귀 방지)

**DB 통합(격리 인스턴스)**
- 배열 NOT NULL 빈배열 INSERT 허용 (P0-2)
- RLS: 타 기관 건 비노출 / 자기 진행건 노출 / draft 비노출
- **P0-3**: `is_active=false` 관리자의 RLS 접근 차단

## 확장 가이드

- 로직 케이스 추가: `harness/logic/*.test.ts` 에 `node:test` 형식으로 작성.
- DB 케이스 추가: `harness/db/rls.mjs` 의 `check(...)` 블록 추가.
- CI 연동: `npm run harness:logic` 은 외부 의존 없이 PR 게이트로 사용 가능.
