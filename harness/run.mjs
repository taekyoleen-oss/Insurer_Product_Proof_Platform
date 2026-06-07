// ============================================================
// IPPP 하네스 오케스트레이터
//   1) 순수 도메인 로직 회귀 테스트 (항상 실행, 의존성 0)
//   2) 격리 DB 통합 테스트 (.env.harness 존재 시에만 실행)
//   실행:  npm run harness    또는    node harness/run.mjs
// ============================================================

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function run(label, cmd, args) {
  console.log(`\n=== ${label} ===`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: join(__dirname, '..') })
  return r.status ?? 1
}

let failed = 0

// 1) 로직 테스트
failed += run('1/2 순수 로직 회귀 테스트', process.execPath, [
  '--experimental-strip-types',
  '--test',
  'harness/logic/domain.test.ts',
]) === 0 ? 0 : 1

// 2) DB 통합 테스트 (선택)
if (existsSync(join(__dirname, '.env.harness'))) {
  failed += run('2/2 격리 DB 통합 테스트', process.execPath, ['harness/db/rls.mjs']) === 0 ? 0 : 1
} else {
  console.log('\n=== 2/2 격리 DB 통합 테스트 — 건너뜀 ===')
  console.log('  harness/.env.harness 가 없습니다. 로컬/테스트 Supabase 준비 후 실행하세요.')
  console.log('  (.env.harness.example 참조 · `supabase start` 또는 별도 테스트 프로젝트 필요)')
}

console.log(`\n=== 하네스 종료: ${failed === 0 ? '성공' : `실패(${failed} 단계)`} ===`)
process.exit(failed > 0 ? 1 : 0)
