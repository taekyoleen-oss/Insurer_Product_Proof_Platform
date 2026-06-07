// ============================================================
// IPPP 하네스 — 격리 DB 통합 테스트 (RLS · 도메인 통제 실데이터 검증)
//   대상: 로컬 Supabase(`supabase start`) 또는 별도 테스트 프로젝트.
//   안전장치: 운영(.env.local) URL 과 동일하면 즉시 중단한다.
//
//   사전 조건:
//     1) harness/.env.harness 에 테스트 인스턴스 자격 설정 (.env.harness.example 참조)
//     2) 스키마 적용:  supabase db reset   (init + hardening 마이그레이션 + seed)
//   실행:  node harness/db/rls.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..', '..')

// ─── 간단 .env 파서 (의존성 0) ─────────────────────────────────────────────
function parseEnv(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return out
}

const harnessEnv = parseEnv(join(__dirname, '..', '.env.harness'))
const localEnv = parseEnv(join(root, '.env.local'))

const URL = harnessEnv.NEXT_PUBLIC_SUPABASE_URL
const ANON = harnessEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = harnessEnv.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SERVICE) {
  console.error('✗ harness/.env.harness 에 URL/ANON/SERVICE 키가 필요합니다. (.env.harness.example 참조)')
  process.exit(2)
}

// ─── 운영 DB 보호 가드 ─────────────────────────────────────────────────────
const prodUrl = localEnv.NEXT_PUBLIC_SUPABASE_URL
if (prodUrl && prodUrl === URL && harnessEnv.HARNESS_ALLOW_PROD !== 'I_UNDERSTAND') {
  console.error('✗ 안전 중단: 하네스 URL 이 운영(.env.local) URL 과 동일합니다.')
  console.error('  격리된 로컬/테스트 인스턴스를 사용하세요. (의도적이면 HARNESS_ALLOW_PROD=I_UNDERSTAND)')
  process.exit(2)
}
if (!/localhost|127\.0\.0\.1|test|staging/i.test(URL) && harnessEnv.HARNESS_ALLOW_PROD !== 'I_UNDERSTAND') {
  console.error(`✗ 안전 중단: URL(${URL}) 이 로컬/테스트로 보이지 않습니다.`)
  console.error('  격리 인스턴스가 맞다면 HARNESS_ALLOW_PROD=I_UNDERSTAND 로 명시하세요.')
  process.exit(2)
}

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })

// ─── 미니 어설션 러너 ──────────────────────────────────────────────────────
let pass = 0
let fail = 0
async function check(name, fn) {
  try {
    await fn()
    pass++
    console.log(`ok   - ${name}`)
  } catch (e) {
    fail++
    console.log(`FAIL - ${name}\n       ${e.message}`)
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

async function userClient(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`로그인 실패(${email}): ${error.message}`)
  return c
}

const PW = 'harness-Passw0rd!'
const uid = (s) => `harness+${s}@example.com`
const made = { users: [], agencies: [], requests: [] }

async function createUser(tag) {
  const { data, error } = await svc.auth.admin.createUser({
    email: uid(tag),
    password: PW,
    email_confirm: true,
  })
  if (error && !/already/i.test(error.message)) throw new Error(error.message)
  let userId = data?.user?.id
  if (!userId) {
    const { data: list } = await svc.auth.admin.listUsers()
    userId = list.users.find((u) => u.email === uid(tag))?.id
  }
  made.users.push(userId)
  return userId
}

// ─── 시드 (서비스롤) ───────────────────────────────────────────────────────
async function seed() {
  const adminUser = await createUser('admin')
  const aAdmin = await createUser('agencyA')
  const bAdmin = await createUser('agencyB')

  await svc.from('ippp_internal_members').upsert(
    { user_id: adminUser, internal_role: 'super_admin', name: 'H-Admin', email: uid('admin'), is_active: true },
    { onConflict: 'user_id' }
  )

  const { data: agA } = await svc.from('ippp_agencies').insert({ name: 'H-AgencyA' }).select().single()
  const { data: agB } = await svc.from('ippp_agencies').insert({ name: 'H-AgencyB' }).select().single()
  made.agencies.push(agA.id, agB.id)

  await svc.from('ippp_agency_members').upsert(
    { user_id: aAdmin, agency_id: agA.id, agency_role: 'agency_admin', name: 'H-A', email: uid('agencyA'), is_active: true },
    { onConflict: 'user_id' }
  )
  await svc.from('ippp_agency_members').upsert(
    { user_id: bAdmin, agency_id: agB.id, agency_role: 'agency_admin', name: 'H-B', email: uid('agencyB'), is_active: true },
    { onConflict: 'user_id' }
  )

  const { data: reqInProg } = await svc.from('ippp_requests').insert({
    type: 'hazard_rate', title: 'H-A 진행건', agency_id: agA.id, status: 'in_progress',
    hazard_type: ['사망위험률'], in_progress_at: new Date().toISOString(), created_by: adminUser,
  }).select().single()
  const { data: reqDraft } = await svc.from('ippp_requests').insert({
    type: 'product', title: 'H-A 초안건', agency_id: agA.id, status: 'draft', created_by: adminUser,
  }).select().single()
  made.requests.push(reqInProg.id, reqDraft.id)

  return { adminUser, aAdmin, bAdmin, agA, agB, reqInProg, reqDraft }
}

// ─── 정리 ──────────────────────────────────────────────────────────────────
async function cleanup() {
  for (const id of made.requests) await svc.from('ippp_requests').delete().eq('id', id)
  for (const id of made.agencies) await svc.from('ippp_agencies').delete().eq('id', id)
  for (const id of made.users) if (id) await svc.auth.admin.deleteUser(id).catch(() => {})
}

// ─── 테스트 ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`# IPPP DB 하네스 — 대상: ${URL}`)
  const ctx = await seed()

  const aClient = await userClient(uid('agencyA'), PW)
  const bClient = await userClient(uid('agencyB'), PW)

  // P0-2 회귀: 배열 컬럼에 빈 배열로 INSERT 가능(완료 마이그레이션 후)
  await check('createRequest: 배열 NOT NULL 빈배열 허용', async () => {
    const { error } = await svc.from('ippp_requests').insert({
      type: 'product', title: 'H 배열테스트', agency_id: ctx.agA.id, status: 'draft',
      assigned_member_ids: [], hazard_type: [], created_by: ctx.adminUser,
    })
    assert(!error, `INSERT 실패: ${error?.message}`)
  })

  // RLS: 타 기관 건 비노출
  await check('RLS: A기관은 B기관 건을 볼 수 없음', async () => {
    const { data } = await bClient.from('ippp_requests').select('id').eq('id', ctx.reqInProg.id)
    assert((data ?? []).length === 0, 'B가 A기관 건을 조회함')
  })

  // RLS: 본 기관 진행건은 노출
  await check('RLS: A기관은 자기 진행건을 볼 수 있음', async () => {
    const { data } = await aClient.from('ippp_requests').select('id').eq('id', ctx.reqInProg.id)
    assert((data ?? []).length === 1, 'A가 자기 진행건을 못 봄')
  })

  // RLS: draft 비노출
  await check('RLS: 기관은 draft 건을 볼 수 없음', async () => {
    const { data } = await aClient.from('ippp_requests').select('id').eq('id', ctx.reqDraft.id)
    assert((data ?? []).length === 0, 'A가 draft 건을 조회함')
  })

  // P0-3 회귀: is_active=false 면 is_admin() 차단
  await check('P0-3: 비활성 관리자는 RLS 접근 불가', async () => {
    await svc.from('ippp_internal_members').update({ is_active: false }).eq('user_id', ctx.adminUser)
    const revoked = await userClient(uid('admin'), PW)
    const { data } = await revoked.from('ippp_requests').select('id').limit(1)
    await svc.from('ippp_internal_members').update({ is_active: true }).eq('user_id', ctx.adminUser)
    assert((data ?? []).length === 0, '비활성 관리자가 여전히 조회함 (is_admin is_active 누락)')
  })

  await cleanup()
  console.log(`\n# pass ${pass}  fail ${fail}`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(async (e) => {
  console.error('하네스 오류:', e)
  await cleanup().catch(() => {})
  process.exit(1)
})
