# IPPP — 메인 오케스트레이터 지침

## 설계서 참조
이 프로젝트의 전체 설계는 `docs/IPPP_design_spec_v1.2.md`를 기준으로 한다.
구현 전 반드시 해당 문서를 먼저 읽고 착수할 것.

## 기술 스택
- Next.js 15 (App Router), TypeScript strict
- TweakCN (shadcn/ui 기반) UI 컴포넌트
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Resend 이메일
- Vercel 배포

## 서브에이전트 구조

| 에이전트 | 파일 | 역할 |
|---------|------|------|
| `db-architect` | `.claude/agents/db-architect/AGENT.md` | Supabase 스키마·RLS·마이그레이션 |
| `api-designer` | `.claude/agents/api-designer/AGENT.md` | Route Handler·Server Action·Resend |
| `ui-builder` | `.claude/agents/ui-builder/AGENT.md` | 페이지·컴포넌트·TweakCN |

### 에이전트 조율 규칙
- 서브에이전트 간 직접 호출 금지 → 이 파일(메인)을 통해 조율
- 중간 산출물은 `/output/` 디렉토리에 파일로 저장
- 구현 순서: **db-architect → api-designer → ui-builder**
- 각 단계 완료 후 `docs/IPPP_design_spec_v1.2.md` §6.6 체크리스트 검증

## 스킬 참조

| 스킬 | 경로 | 사용 시점 |
|------|------|---------|
| `supabase-rls` | `.claude/skills/supabase-rls/SKILL.md` | 테이블 생성·RLS 정책 작성 시 |
| `file-upload` | `.claude/skills/file-upload/SKILL.md` | Storage 업로드·Signed URL 구현 시 |
| `email-notify` | `.claude/skills/email-notify/SKILL.md` | Resend 알림 발송 구현 시 |

## 공통 코딩 규칙
- TypeScript strict 모드 (any 금지)
- async/await 사용, callback 패턴 지양
- 환경변수: `.env.local` 사용, git 커밋 금지
- Supabase `service_role` 키는 서버/API Route 전용
- 모든 DB 접근에 RLS 적용 확인
- 테이블명 접두사: `ippp_` 필수

## 환경변수 목록
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL
INVITATION_EXPIRE_HOURS=72
```
