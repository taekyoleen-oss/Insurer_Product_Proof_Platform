// IPPP Presentation Generator
// Generates a professional PowerPoint for the Insurer Product Proof Platform

import PptxGenJS from 'pptxgenjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Layout Constants ─────────────────────────────────────────────────────────
const SLIDE = { W: 13.33, H: 7.5 }

const L = {
  HDR: 1.05,   // header bar height
  Y0:  1.12,   // content start y
  YB:  6.80,   // content bottom limit — never exceed
  XL:  0.40,   // left margin
  XR:  12.93,  // right limit (13.33 - 0.40)
}
L.W  = L.XR - L.XL   // 12.53
L.AH = L.YB - L.Y0   // 5.68

function calcCardH(startY, rows, gap = 0.10, margin = 0.05) {
  const available = (L.YB - margin) - startY
  const cardH = (available - gap * (rows - 1)) / rows
  return Math.max(cardH, 0.40)
}

function assertInBounds(y, h, label) {
  const bottom = y + h
  if (bottom > L.YB + 0.01) {
    console.warn(`  ⚠ OVERFLOW [${label}]: y=${y.toFixed(3)} + h=${h.toFixed(3)} = ${bottom.toFixed(3)} > YB=${L.YB}`)
  }
}

// ─── Color & Font Constants ───────────────────────────────────────────────────
const C = {
  navy:   '1E3A5F',
  blue:   '2563EB',
  white:  'FFFFFF',
  black:  '111827',
  gray:   '374151',
  sub:    '6B7280',
  card:   'F9FAFB',
  border: 'E5E7EB',
  accent: 'DBEAFE',
  accentText: '1D4ED8',
  green:  '059669',
  greenBg: 'ECFDF5',
  amber:  'D97706',
  amberBg: 'FFFBEB',
}

const F = 'Noto Sans KR'

// ─── Resolve output path (no overwrite) ──────────────────────────────────────
function resolveOutputPath(dir, baseName = 'IPPP_Presentation') {
  let candidate = path.join(dir, `${baseName}.pptx`)
  if (!fs.existsSync(candidate)) return candidate
  let n = 2
  while (true) {
    candidate = path.join(dir, `${baseName}_${n}.pptx`)
    if (!fs.existsSync(candidate)) return candidate
    n++
  }
}

// ─── Slide Helpers ────────────────────────────────────────────────────────────

function addHeader(s, pptx, slideNum, total, title, subtitle = '') {
  // Header bar background
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE.W, h: L.HDR,
    fill: { color: C.navy },
    line: { color: C.navy, width: 0 },
  })

  // Slide number (left)
  s.addText(`${String(slideNum).padStart(2, '0')} / ${total}`, {
    x: L.XL, y: 0.10, w: 1.20, h: 0.35,
    fontSize: 12, color: 'AABBD0', fontFace: F,
    bold: false, valign: 'top', fit: 'shrink', wrap: false,
  })

  // Title (center-ish)
  s.addText(title, {
    x: L.XL + 1.30, y: 0.06, w: L.W - 1.30 - (subtitle ? 2.0 : 0), h: 0.52,
    fontSize: 26, bold: true, color: C.white, fontFace: F,
    valign: 'middle', fit: 'shrink', wrap: false,
  })

  // Subtitle badge (right)
  if (subtitle) {
    s.addShape(pptx.ShapeType.rect, {
      x: L.XR - 2.0, y: 0.18, w: 1.85, h: 0.38,
      fill: { color: C.blue },
      line: { color: C.blue, width: 0 },
      rectRadius: 0.08,
    })
    s.addText(subtitle, {
      x: L.XR - 2.0, y: 0.18, w: 1.85, h: 0.38,
      fontSize: 13, bold: true, color: C.white, fontFace: F,
      align: 'center', valign: 'middle', fit: 'shrink', wrap: false,
    })
  }
}

function addCard(s, pptx, x, y, w, h, { icon = '', title = '', lines = [], titleColor = C.navy, accent = false } = {}) {
  s.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color: accent ? C.accent : C.card },
    line: { color: accent ? 'BFDBFE' : C.border, width: 0.75 },
  })

  const pad = 0.15
  let cy = y + pad

  if (icon || title) {
    const titleH = Math.min(h * 0.30, 0.42)
    const txt = icon ? `${icon}  ${title}` : title
    s.addText(txt, {
      x: x + pad, y: cy, w: w - pad * 2, h: titleH,
      fontSize: 17, bold: true, color: titleColor || C.navy, fontFace: F,
      valign: 'top', fit: 'shrink', wrap: false,
    })
    assertInBounds(cy, titleH, `card-title:${title}`)
    cy += titleH + 0.06
  }

  if (lines.length > 0) {
    const remainH = y + h - cy - pad
    const lineH = Math.max(remainH / lines.length, 0.22)
    for (const line of lines) {
      s.addText(line, {
        x: x + pad, y: cy, w: w - pad * 2, h: lineH,
        fontSize: 14, color: C.gray, fontFace: F,
        valign: 'top', fit: 'shrink', wrap: true,
        lineSpacingMultiple: 1.1,
      })
      assertInBounds(cy, lineH, `card-line:${line.slice(0,20)}`)
      cy += lineH
    }
  }
}

function addDivider(s, x, y, w) {
  s.addShape('line', {
    x, y, w, h: 0,
    line: { color: C.border, width: 0.5 },
  })
}

// ─── Slide Builders ───────────────────────────────────────────────────────────

// Slide 1: Cover
function slide01_cover(pptx) {
  const s = pptx.addSlide()
  const TOTAL = 16

  // Full background — dark navy
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE.W, h: SLIDE.H,
    fill: { color: C.navy },
    line: { color: C.navy, width: 0 },
  })

  // Decorative accent stripe
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.90, w: SLIDE.W, h: 0.08,
    fill: { color: C.blue },
    line: { color: C.blue, width: 0 },
  })

  // Shield icon background circle
  s.addShape(pptx.ShapeType.ellipse, {
    x: 5.92, y: 0.80, w: 1.50, h: 1.50,
    fill: { color: C.blue },
    line: { color: 'BFDBFE', width: 1.5 },
  })
  s.addText('🛡', {
    x: 5.92, y: 0.80, w: 1.50, h: 1.50,
    fontSize: 36, align: 'center', valign: 'middle',
    fontFace: 'Segoe UI Emoji',
    h: 1.50, fit: 'shrink', wrap: false,
  })

  // Main title
  s.addText('Insurer Product\nProof Platform', {
    x: L.XL, y: 2.55, w: L.W, h: 1.50,
    fontSize: 48, bold: true, color: C.white, fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: true,
    lineSpacingMultiple: 1.15,
  })

  // Subtitle
  s.addText('IPPP — 보험사 상품 검증 관리 플랫폼', {
    x: L.XL, y: 4.25, w: L.W, h: 0.55,
    fontSize: 22, bold: false, color: 'AABBD0', fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: false,
  })

  // Version & date
  s.addText('v1.3  |  2026', {
    x: L.XL, y: 5.05, w: L.W, h: 0.38,
    fontSize: 15, color: '7A9BBB', fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: false,
  })

  // Tech badges row
  const badges = ['Next.js 15', 'TypeScript', 'Supabase', 'Resend', 'Vercel']
  const badgeW = 1.50
  const badgeGap = 0.25
  const totalBadgeW = badges.length * badgeW + (badges.length - 1) * badgeGap
  let bx = (SLIDE.W - totalBadgeW) / 2
  for (const b of badges) {
    s.addShape(pptx.ShapeType.rect, {
      x: bx, y: 6.15, w: badgeW, h: 0.32,
      fill: { color: '1A3357' },
      line: { color: '2E4F7A', width: 0.75 },
    })
    s.addText(b, {
      x: bx, y: 6.15, w: badgeW, h: 0.32,
      fontSize: 11, color: '7AB5E0', fontFace: F,
      align: 'center', valign: 'middle', fit: 'shrink', wrap: false,
    })
    bx += badgeW + badgeGap
  }

  // Slide number
  s.addText(`01 / ${TOTAL}`, {
    x: L.XL, y: 7.10, w: 1.5, h: 0.28,
    fontSize: 11, color: '7A9BBB', fontFace: F,
    valign: 'top', fit: 'shrink', wrap: false,
  })
}

// Slide 2: Table of Contents
function slide02_toc(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 2, TOTAL, '목차')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.25
  const colW = (L.W - COL_GAP) / 2
  const ROW_GAP = 0.10
  const cardH = calcCardH(startY, 4, ROW_GAP)

  const tocItems = [
    {
      col: 0, row: 0,
      num: '01', title: '앱 개요 및 배경',
      items: ['플랫폼 목적', '사용자 역할 구조', '핵심 개념 정의'],
    },
    {
      col: 1, row: 0,
      num: '02', title: '시스템 아키텍처',
      items: ['2-Role 구조', '검증 워크플로우', '데이터 흐름'],
    },
    {
      col: 0, row: 1,
      num: '03', title: '어드민 기능 (보험사)',
      items: ['대시보드 KPI', '검증 건 관리', '파일·코멘트', '기관·멤버 관리', '아카이브·리포트'],
    },
    {
      col: 1, row: 1,
      num: '04', title: '기관 포털 기능 (검증기관)',
      items: ['포털 대시보드', '검증 건 처리', '멤버·프로필 관리', '실적 조회'],
    },
    {
      col: 0, row: 2,
      num: '05', title: '보안 및 접근 제어',
      items: ['RLS 행 수준 보안', '역할별 권한 분리', '초대 기반 온보딩'],
    },
    {
      col: 1, row: 2,
      num: '06', title: '파일 & 커뮤니케이션',
      items: ['파일 버전 관리', 'Supabase Storage', '실시간 코멘트'],
    },
    {
      col: 0, row: 3,
      num: '07', title: '기술 스택',
      items: ['Next.js 15 App Router', 'Supabase PostgreSQL', 'Resend 이메일'],
    },
    {
      col: 1, row: 3,
      num: '08', title: '마무리',
      items: ['도입 효과', '확장 방향'],
    },
  ]

  for (const item of tocItems) {
    const cx = L.XL + item.col * (colW + COL_GAP)
    const cy = startY + item.row * (cardH + ROW_GAP)

    s.addShape(pptx.ShapeType.rect, {
      x: cx, y: cy, w: colW, h: cardH,
      fill: { color: C.card },
      line: { color: C.border, width: 0.75 },
    })

    // Accent left bar
    s.addShape(pptx.ShapeType.rect, {
      x: cx, y: cy, w: 0.06, h: cardH,
      fill: { color: C.blue },
      line: { color: C.blue, width: 0 },
    })

    const pad = 0.14
    // Number badge
    s.addShape(pptx.ShapeType.rect, {
      x: cx + 0.14, y: cy + pad, w: 0.42, h: 0.30,
      fill: { color: C.blue },
      line: { color: C.blue, width: 0 },
    })
    s.addText(item.num, {
      x: cx + 0.14, y: cy + pad, w: 0.42, h: 0.30,
      fontSize: 12, bold: true, color: C.white, fontFace: F,
      align: 'center', valign: 'middle', fit: 'shrink', wrap: false,
    })

    s.addText(item.title, {
      x: cx + 0.65, y: cy + pad, w: colW - 0.80, h: 0.33,
      fontSize: 15, bold: true, color: C.navy, fontFace: F,
      valign: 'top', fit: 'shrink', wrap: false,
    })

    const listStartY = cy + pad + 0.36
    const listH = cy + cardH - 0.10 - listStartY
    const lineH = Math.max(listH / item.items.length, 0.18)
    let lY = listStartY
    for (const it of item.items) {
      s.addText(`• ${it}`, {
        x: cx + 0.14, y: lY, w: colW - 0.28, h: lineH,
        fontSize: 12, color: C.gray, fontFace: F,
        valign: 'top', fit: 'shrink', wrap: true,
        lineSpacingMultiple: 1.0,
      })
      lY += lineH
    }
    assertInBounds(cy, cardH, `toc-card:${item.num}`)
  }
}

// Slide 3: App Overview
function slide03_overview(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 3, TOTAL, '앱 개요 — IPPP란 무엇인가?')

  // Purpose box (full width)
  const purposeY = L.Y0 + 0.06
  const purposeH = 0.72
  s.addShape(pptx.ShapeType.rect, {
    x: L.XL, y: purposeY, w: L.W, h: purposeH,
    fill: { color: C.accent },
    line: { color: 'BFDBFE', width: 1.0 },
  })
  s.addText('보험사(내부)와 외부 검증기관 간의 상품·위험률 검증 업무를 디지털화하여 검증 건 생성부터 완료까지 원스톱 관리하는 B2B SaaS 플랫폼', {
    x: L.XL + 0.20, y: purposeY + 0.10, w: L.W - 0.40, h: purposeH - 0.20,
    fontSize: 17, color: C.navy, fontFace: F, bold: false,
    valign: 'top', fit: 'shrink', wrap: true, lineSpacingMultiple: 1.2,
  })
  assertInBounds(purposeY, purposeH, 'purpose-box')

  // 4 overview cards
  const cardStartY = purposeY + purposeH + 0.14
  const COL_GAP = 0.18
  const ROW_GAP = 0.10
  const colW = (L.W - COL_GAP) / 2
  const cardH = calcCardH(cardStartY, 2, ROW_GAP)

  const cards = [
    {
      col: 0, row: 0,
      icon: '🏢', title: '보험사 내부 사용자 (어드민)',
      lines: [
        '· 검증 건 생성 · 배정 · 상태 관리',
        '· 검증기관 및 멤버 관리',
        '· 아카이브 조회 · 기관별 실적 리포트',
      ],
    },
    {
      col: 1, row: 0,
      icon: '🏛', title: '검증기관 외부 사용자 (포털)',
      lines: [
        '· 배정된 검증 건 목록 조회',
        '· 파일 업로드 및 코멘트 소통',
        '· 기관 멤버 초대 · 실적 조회',
      ],
    },
    {
      col: 0, row: 1,
      icon: '📋', title: '검증 유형',
      lines: [
        '· 위험률 검증 (hazard_rate)',
        '· 상품 검증 (product)',
        '· 연도별 회계연도(fiscal_year) 분류',
      ],
    },
    {
      col: 1, row: 1,
      icon: '🔄', title: '검증 상태 흐름',
      lines: [
        '· 초안(draft) → 진행중(in_progress)',
        '· 진행중 → 보류(on_hold) / 완료(completed)',
        '· 완료 건 → 아카이브 자동 이관',
      ],
    },
  ]

  for (const card of cards) {
    const cx = L.XL + card.col * (colW + COL_GAP)
    const cy = cardStartY + card.row * (cardH + ROW_GAP)
    addCard(s, pptx, cx, cy, colW, cardH, {
      icon: card.icon, title: card.title, lines: card.lines,
    })
    assertInBounds(cy, cardH, `overview-card:${card.title}`)
  }
}

// Slide 4: System Architecture
function slide04_architecture(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 4, TOTAL, '시스템 아키텍처')

  // Two-role flow diagram (text-based)
  const startY = L.Y0 + 0.10
  const COL_GAP = 0.30
  const colW3 = (L.W - COL_GAP * 2) / 3
  const boxH = 1.40

  // Column 1: Admin (Insurer)
  s.addShape(pptx.ShapeType.rect, {
    x: L.XL, y: startY, w: colW3, h: boxH,
    fill: { color: C.navy },
    line: { color: C.navy, width: 0 },
  })
  s.addText('🏢\n어드민 (보험사)', {
    x: L.XL, y: startY + 0.10, w: colW3, h: 0.70,
    fontSize: 18, bold: true, color: C.white, fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: true,
    lineSpacingMultiple: 1.2,
  })
  const adminItems = ['검증 건 생성·관리', '기관 등록·초대', '상태 변경·완료']
  let ay = startY + 0.82
  for (const it of adminItems) {
    s.addText(`· ${it}`, {
      x: L.XL + 0.10, y: ay, w: colW3 - 0.20, h: 0.20,
      fontSize: 12, color: 'AABBD0', fontFace: F,
      valign: 'top', fit: 'shrink', wrap: false,
    })
    ay += 0.18
  }

  // Arrow 1→2
  const arrowY = startY + boxH / 2 - 0.15
  s.addShape(pptx.ShapeType.rect, {
    x: L.XL + colW3 + 0.02, y: arrowY + 0.10, w: COL_GAP - 0.04, h: 0.06,
    fill: { color: C.blue },
    line: { color: C.blue, width: 0 },
  })
  s.addText('검증 요청\n배정', {
    x: L.XL + colW3 + 0.02, y: arrowY - 0.10, w: COL_GAP - 0.04, h: 0.40,
    fontSize: 10, color: C.blue, fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: true,
    lineSpacingMultiple: 1.0,
  })

  // Column 2: Supabase (Center)
  const c2x = L.XL + colW3 + COL_GAP
  s.addShape(pptx.ShapeType.rect, {
    x: c2x, y: startY, w: colW3, h: boxH,
    fill: { color: '1A3A5C' },
    line: { color: C.blue, width: 1.5 },
  })
  s.addText('⚙\nSupabase', {
    x: c2x, y: startY + 0.10, w: colW3, h: 0.65,
    fontSize: 18, bold: true, color: C.white, fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: true,
    lineSpacingMultiple: 1.2,
  })
  const sbItems = ['PostgreSQL DB + RLS', 'Auth (JWT)', 'Storage (파일)', 'Realtime']
  let sy2 = startY + 0.80
  for (const it of sbItems) {
    s.addText(`• ${it}`, {
      x: c2x + 0.10, y: sy2, w: colW3 - 0.20, h: 0.18,
      fontSize: 11, color: '7AB5E0', fontFace: F,
      valign: 'top', fit: 'shrink', wrap: false,
    })
    sy2 += 0.15
  }

  // Arrow 2→3
  const a2x = c2x + colW3 + 0.02
  s.addShape(pptx.ShapeType.rect, {
    x: a2x, y: arrowY + 0.10, w: COL_GAP - 0.04, h: 0.06,
    fill: { color: C.blue },
    line: { color: C.blue, width: 0 },
  })
  s.addText('검증 결과\n회신', {
    x: a2x, y: arrowY - 0.10, w: COL_GAP - 0.04, h: 0.40,
    fontSize: 10, color: C.blue, fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: true,
    lineSpacingMultiple: 1.0,
  })

  // Column 3: Agency Portal
  const c3x = c2x + colW3 + COL_GAP
  s.addShape(pptx.ShapeType.rect, {
    x: c3x, y: startY, w: colW3, h: boxH,
    fill: { color: '14532D' },
    line: { color: '059669', width: 1.0 },
  })
  s.addText('🏛\n기관 포털', {
    x: c3x, y: startY + 0.10, w: colW3, h: 0.65,
    fontSize: 18, bold: true, color: C.white, fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: true,
    lineSpacingMultiple: 1.2,
  })
  const agItems = ['검증 건 조회·처리', '파일 업로드', '코멘트 소통', '실적 조회']
  let agy = startY + 0.80
  for (const it of agItems) {
    s.addText(`· ${it}`, {
      x: c3x + 0.10, y: agy, w: colW3 - 0.20, h: 0.18,
      fontSize: 12, color: '6EE7B7', fontFace: F,
      valign: 'top', fit: 'shrink', wrap: false,
    })
    agy += 0.15
  }

  // Bottom: workflow steps
  const wfY = startY + boxH + 0.22
  s.addText('검증 워크플로우', {
    x: L.XL, y: wfY, w: L.W, h: 0.30,
    fontSize: 16, bold: true, color: C.navy, fontFace: F,
    valign: 'top', fit: 'shrink', wrap: false,
  })

  const steps = [
    { num: '1', label: '검증 건 생성', desc: '어드민이 제목·유형·기관·마감일 설정' },
    { num: '2', label: '진행중 전환', desc: '상태 → in_progress, 기관에 알림 발송' },
    { num: '3', label: '파일 업로드', desc: '어드민 또는 기관 담당자가 파일 첨부' },
    { num: '4', label: '코멘트 소통', desc: '실시간 코멘트로 피드백 교환' },
    { num: '5', label: '완료 처리', desc: '어드민이 완료 전환 → 아카이브 자동 이관' },
  ]

  const stepW = (L.W - 0.12 * 4) / 5
  let sx = L.XL
  const stepY = wfY + 0.36
  const stepH = calcCardH(stepY, 1, 0, 0.05)

  for (const step of steps) {
    s.addShape(pptx.ShapeType.rect, {
      x: sx, y: stepY, w: stepW, h: stepH,
      fill: { color: C.card },
      line: { color: C.border, width: 0.75 },
    })
    // Number circle background
    s.addShape(pptx.ShapeType.ellipse, {
      x: sx + stepW / 2 - 0.22, y: stepY + 0.10, w: 0.44, h: 0.36,
      fill: { color: C.blue },
      line: { color: C.blue, width: 0 },
    })
    s.addText(step.num, {
      x: sx + stepW / 2 - 0.22, y: stepY + 0.10, w: 0.44, h: 0.36,
      fontSize: 15, bold: true, color: C.white, fontFace: F,
      align: 'center', valign: 'middle', fit: 'shrink', wrap: false,
    })
    s.addText(step.label, {
      x: sx + 0.06, y: stepY + 0.52, w: stepW - 0.12, h: 0.30,
      fontSize: 13, bold: true, color: C.navy, fontFace: F,
      align: 'center', valign: 'top', fit: 'shrink', wrap: false,
    })
    s.addText(step.desc, {
      x: sx + 0.06, y: stepY + 0.84, w: stepW - 0.12, h: stepH - 0.90,
      fontSize: 11, color: C.gray, fontFace: F,
      align: 'center', valign: 'top', fit: 'shrink', wrap: true,
      lineSpacingMultiple: 1.1,
    })
    assertInBounds(stepY, stepH, `step:${step.num}`)
    sx += stepW + 0.12
  }

  // Email notification note
  s.addShape(pptx.ShapeType.rect, {
    x: L.XL, y: L.YB - 0.35, w: L.W, h: 0.32,
    fill: { color: C.amberBg },
    line: { color: 'FCD34D', width: 0.75 },
  })
  s.addText('📧  상태 변경 시 Resend를 통해 관련 담당자에게 자동 이메일 알림 발송', {
    x: L.XL + 0.12, y: L.YB - 0.35, w: L.W - 0.24, h: 0.32,
    fontSize: 13, color: C.amber, fontFace: F,
    valign: 'middle', fit: 'shrink', wrap: false,
  })
  assertInBounds(L.YB - 0.35, 0.32, 'email-note')
}

// Slide 5: Admin Login & Dashboard
function slide05_admin_dashboard(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 5, TOTAL, '어드민 — 로그인 & 대시보드', '어드민')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.22
  const colW = (L.W - COL_GAP) / 2
  const ROW_GAP = 0.10
  const cardH = calcCardH(startY, 2, ROW_GAP)

  const cards = [
    {
      col: 0, row: 0,
      icon: '🔐', title: '로그인 & 인증',
      lines: [
        '· 이메일 + 비밀번호 로그인 (Supabase Auth)',
        '· 역할 자동 감지 → 어드민/포털 분기 리다이렉트',
        '· 비밀번호 재설정 이메일 발송 지원',
        '· 초대 링크 기반 신규 계정 생성',
      ],
    },
    {
      col: 1, row: 0,
      icon: '📊', title: 'KPI 대시보드',
      lines: [
        '· 전체 활성 건수 (진행중 + 보류)',
        '· 이번 달 완료 건수',
        '· D-7 마감 임박 건수',
        '· 참여 기관 수 (활성 건 보유)',
      ],
    },
    {
      col: 0, row: 1,
      icon: '📋', title: '최근 진행중 검증 건',
      lines: [
        '· 진행중 상태 검증 건 최대 8건 표시',
        '· 기관명 · 상태 배지 · 마감일 카운트다운',
        '· 클릭 시 검증 건 상세 페이지 이동',
      ],
    },
    {
      col: 1, row: 1,
      icon: '🏛', title: '기관별 활성 건수',
      lines: [
        '· 기관 아바타 + 기관명 + 활성 건 수',
        '· 실시간 집계 현황 표시',
        '· 기관별 업무량 한눈에 파악',
      ],
    },
  ]

  for (const card of cards) {
    const cx = L.XL + card.col * (colW + COL_GAP)
    const cy = startY + card.row * (cardH + ROW_GAP)
    addCard(s, pptx, cx, cy, colW, cardH, {
      icon: card.icon, title: card.title, lines: card.lines,
    })
    assertInBounds(cy, cardH, `dash-card:${card.title}`)
  }
}

// Slide 6: Admin Request List
function slide06_request_list(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 6, TOTAL, '어드민 — 검증 건 목록 & 필터', '어드민')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.22
  const colW = (L.W - COL_GAP) / 2
  const ROW_GAP = 0.10
  const cardH = calcCardH(startY, 2, ROW_GAP)

  const cards = [
    {
      col: 0, row: 0,
      icon: '🔍', title: '필터 바 (FilterBar)',
      lines: [
        '· 상태 필터: 전체 / 초안 / 진행중 / 보류 / 완료',
        '· 기관 필터: 등록된 활성 기관 목록 선택',
        '· 회계연도 필터: fiscal_year 기준 분류',
        '· 키워드 검색: 제목 기반 텍스트 검색',
      ],
    },
    {
      col: 1, row: 0,
      icon: '➕', title: '새 검증 건 생성',
      lines: [
        '· 제목 · 유형(위험률/상품) · 설명 입력',
        '· 배정 기관 선택 · 마감일 설정',
        '· 위험률 유형 태그 / 상품 유형 태그 지정',
        '· 초안(draft) 상태로 생성 → 이후 진행중 전환',
      ],
    },
    {
      col: 0, row: 1,
      icon: '🃏', title: '검증 건 카드 목록',
      lines: [
        '· 반응형 그리드 (sm: 2열, xl: 3열)',
        '· 상태 배지 · 기관명 · 마감일 표시',
        '· D-day 카운트다운 자동 계산',
      ],
    },
    {
      col: 1, row: 1,
      icon: '📌', title: '상태 배지 체계',
      lines: [
        '· 초안: 회색 · 진행중: 파란색',
        '· 보류: 주황색 · 완료: 초록색',
        '· URL 파라미터 기반 필터 상태 유지',
      ],
    },
  ]

  for (const card of cards) {
    const cx = L.XL + card.col * (colW + COL_GAP)
    const cy = startY + card.row * (cardH + ROW_GAP)
    addCard(s, pptx, cx, cy, colW, cardH, {
      icon: card.icon, title: card.title, lines: card.lines,
    })
    assertInBounds(cy, cardH, `reqlist-card:${card.title}`)
  }
}

// Slide 7: Admin Request Detail & Status
function slide07_request_detail(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 7, TOTAL, '어드민 — 검증 건 상세 & 상태 관리', '어드민')

  const startY = L.Y0 + 0.08
  // 3 cards top row + 1 wide card bottom
  const COL_GAP = 0.18
  const ROW_GAP = 0.10
  const colW3 = (L.W - COL_GAP * 2) / 3
  const topH = 1.80
  const bottomY = startY + topH + ROW_GAP
  const bottomH = calcCardH(bottomY, 1, 0, 0.05)

  const topCards = [
    {
      icon: '📄', title: '기본 정보 표시',
      lines: [
        '· 제목 · 검증 유형 배지',
        '· 기관명 · 마감일 · D-day',
        '· 설명 텍스트',
        '· 위험률/상품 유형 태그',
      ],
    },
    {
      icon: '🔄', title: '상태 전환 액션',
      lines: [
        '· 초안 → 진행중 (파일 없어도 전환 가능)',
        '· 진행중 → 보류 / 완료',
        '· 완료 시 파일 필수 조건 확인',
        '· 완료 → 아카이브 자동 이관',
      ],
    },
    {
      icon: '⚠', title: '상태 전환 제약',
      lines: [
        '· draft: 파일 업로드 불가',
        '· in_progress: 모든 기능 활성화',
        '· completed: 파일 업로드 비활성화',
        '· 상태 변경 시 이메일 알림 자동 발송',
      ],
    },
  ]

  for (let i = 0; i < topCards.length; i++) {
    const cx = L.XL + i * (colW3 + COL_GAP)
    addCard(s, pptx, cx, startY, colW3, topH, {
      icon: topCards[i].icon, title: topCards[i].title, lines: topCards[i].lines,
    })
    assertInBounds(startY, topH, `detail-top:${topCards[i].title}`)
  }

  // Bottom wide card: Status flow visualization
  s.addShape(pptx.ShapeType.rect, {
    x: L.XL, y: bottomY, w: L.W, h: bottomH,
    fill: { color: C.card },
    line: { color: C.border, width: 0.75 },
  })

  s.addText('검증 건 상태 흐름도', {
    x: L.XL + 0.15, y: bottomY + 0.12, w: 3.0, h: 0.28,
    fontSize: 14, bold: true, color: C.navy, fontFace: F,
    valign: 'top', fit: 'shrink', wrap: false,
  })

  const statuses = [
    { key: 'draft', label: '초안', color: '9CA3AF', bg: 'F3F4F6' },
    { key: 'in_progress', label: '진행중', color: '2563EB', bg: 'EFF6FF' },
    { key: 'on_hold', label: '보류', color: 'D97706', bg: 'FFFBEB' },
    { key: 'completed', label: '완료', color: '059669', bg: 'ECFDF5' },
    { key: 'archive', label: '아카이브', color: '7C3AED', bg: 'F5F3FF' },
  ]

  const stW = 1.60
  const stGap = 0.55
  const totalStW = statuses.length * stW + (statuses.length - 1) * stGap
  let stX = L.XL + (L.W - totalStW) / 2
  const stY = bottomY + 0.52
  const stH = bottomH - 0.62

  for (let i = 0; i < statuses.length; i++) {
    const st = statuses[i]
    s.addShape(pptx.ShapeType.rect, {
      x: stX, y: stY, w: stW, h: stH,
      fill: { color: st.bg },
      line: { color: st.color, width: 1.25 },
    })
    s.addText(st.label, {
      x: stX, y: stY, w: stW, h: stH,
      fontSize: 15, bold: true, color: st.color, fontFace: F,
      align: 'center', valign: 'middle', fit: 'shrink', wrap: false,
    })
    assertInBounds(stY, stH, `status-box:${st.label}`)

    // Arrow between statuses
    if (i < statuses.length - 1) {
      s.addText('→', {
        x: stX + stW + 0.03, y: stY, w: stGap - 0.06, h: stH,
        fontSize: 18, color: C.sub, fontFace: F,
        align: 'center', valign: 'middle', fit: 'shrink', wrap: false,
      })
    }
    stX += stW + stGap
  }
}

// Slide 8: File Upload & Comments
function slide08_files_comments(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 8, TOTAL, '어드민 — 파일 업로드 & 코멘트', '어드민')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.22
  const colW = (L.W - COL_GAP) / 2
  const ROW_GAP = 0.10
  const cardH = calcCardH(startY, 2, ROW_GAP)

  const cards = [
    {
      col: 0, row: 0,
      icon: '📁', title: '파일 업로드 (FileUploadZone)',
      lines: [
        '· 드래그&드롭 또는 클릭으로 파일 선택',
        '· Supabase Storage에 안전하게 저장',
        '· 업로드 시 기관 ID 경로 분리 저장',
        '· 진행중 상태에서만 업로드 활성화',
      ],
    },
    {
      col: 1, row: 0,
      icon: '📜', title: '파일 버전 히스토리 (FileVersionHistory)',
      lines: [
        '· 업로드된 모든 파일 목록 표시',
        '· 파일명 · 업로드자 · 업로드 일시 표시',
        '· Signed URL로 안전한 다운로드',
        '· 어드민/기관 공통 접근 (RLS 적용)',
      ],
    },
    {
      col: 0, row: 1,
      icon: '💬', title: '코멘트 스레드 (CommentThread)',
      lines: [
        '· 검증 건별 실시간 코멘트 작성',
        '· 어드민 ↔ 기관 담당자 양방향 소통',
        '· 코멘트 작성자 · 시간 표시',
        '· 500px 고정 높이 스크롤 영역',
      ],
    },
    {
      col: 1, row: 1,
      icon: '🔒', title: '보안 접근 제어',
      lines: [
        '· Supabase RLS로 기관별 파일 격리',
        '· Signed URL 만료 시간 설정',
        '· API Route에서 service_role 키 사용',
        '· 미인증 접근 자동 차단',
      ],
    },
  ]

  for (const card of cards) {
    const cx = L.XL + card.col * (colW + COL_GAP)
    const cy = startY + card.row * (cardH + ROW_GAP)
    addCard(s, pptx, cx, cy, colW, cardH, {
      icon: card.icon, title: card.title, lines: card.lines,
    })
    assertInBounds(cy, cardH, `file-card:${card.title}`)
  }
}

// Slide 9: Agency Management
function slide09_agency_mgmt(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 9, TOTAL, '어드민 — 검증기관 관리', '어드민')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.18
  const ROW_GAP = 0.10
  const colW3 = (L.W - COL_GAP * 2) / 3

  // Top: 3 feature cards
  const topH = 2.20
  const topCards = [
    {
      icon: '🏛', title: '기관 등록',
      lines: [
        '· 기관명 (필수)',
        '· 대표 연락처 · 이메일',
        '· 계약일 · 소재지',
        '· 즉시 활성 상태로 등록',
      ],
    },
    {
      icon: '📧', title: '관리자 초대 (Resend)',
      lines: [
        '· agency_admin 역할로 초대',
        '· 이메일로 초대 링크 자동 발송',
        '· 72시간 유효 토큰 생성',
        '· 초대 수락 시 계정 자동 생성',
      ],
    },
    {
      icon: '🚫', title: '기관 비활성화',
      lines: [
        '· 진행 중 검증 건 경고 표시',
        '· 비활성화 후 포털 접근 차단',
        '· 완료된 검증 건 기록 보존',
        '· 재활성화 지원',
      ],
    },
  ]

  for (let i = 0; i < topCards.length; i++) {
    const cx = L.XL + i * (colW3 + COL_GAP)
    addCard(s, pptx, cx, startY, colW3, topH, {
      icon: topCards[i].icon, title: topCards[i].title, lines: topCards[i].lines,
    })
    assertInBounds(startY, topH, `agency-top:${topCards[i].title}`)
  }

  // Bottom: Table structure info
  const bottomY = startY + topH + ROW_GAP
  const bottomH = calcCardH(bottomY, 1, 0, 0.05)

  s.addShape(pptx.ShapeType.rect, {
    x: L.XL, y: bottomY, w: L.W, h: bottomH,
    fill: { color: C.card },
    line: { color: C.border, width: 0.75 },
  })

  s.addText('기관 목록 테이블 구성', {
    x: L.XL + 0.15, y: bottomY + 0.10, w: 3.0, h: 0.28,
    fontSize: 14, bold: true, color: C.navy, fontFace: F,
    valign: 'top', fit: 'shrink', wrap: false,
  })

  const cols = [
    { label: '기관명', desc: '아바타 + 기관명' },
    { label: '연락처', desc: '대표 전화번호' },
    { label: '이메일', desc: '대표 이메일' },
    { label: '계약일', desc: '계약 시작일' },
    { label: '상태', desc: '활성/비활성 배지' },
    { label: '관리', desc: '초대 · 비활성화 버튼' },
  ]

  const colW6 = (L.W - 0.30) / cols.length
  let cX = L.XL + 0.15
  const cY = bottomY + 0.44
  const cH = bottomH - 0.54

  for (const col of cols) {
    s.addShape(pptx.ShapeType.rect, {
      x: cX, y: cY, w: colW6, h: cH,
      fill: { color: C.accent },
      line: { color: 'BFDBFE', width: 0.5 },
    })
    s.addText(`${col.label}\n${col.desc}`, {
      x: cX + 0.04, y: cY + 0.06, w: colW6 - 0.08, h: cH - 0.12,
      fontSize: 12, color: C.navy, fontFace: F,
      align: 'center', valign: 'top', fit: 'shrink', wrap: true,
      lineSpacingMultiple: 1.15,
    })
    assertInBounds(cY, cH, `agency-col:${col.label}`)
    cX += colW6
  }
}

// Slide 10: Member & Settings Management
function slide10_members(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 10, TOTAL, '어드민 — 멤버 & 설정 관리', '어드민')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.22
  const colW = (L.W - COL_GAP) / 2
  const ROW_GAP = 0.10
  const cardH = calcCardH(startY, 2, ROW_GAP)

  const cards = [
    {
      col: 0, row: 0,
      icon: '👥', title: '내부 멤버 관리 (super_admin 전용)',
      lines: [
        '· ippp_internal_members 테이블 관리',
        '· 역할: super_admin / admin',
        '· 멤버 활성화 / 비활성화',
        '· 신규 멤버 초대 이메일 발송',
      ],
    },
    {
      col: 1, row: 0,
      icon: '🔑', title: '역할 체계 (Internal)',
      lines: [
        '· super_admin: 최고 관리자 — 모든 권한',
        '· admin: 일반 관리자 — 검증 건 관리',
        '· 설정 > 멤버 메뉴는 super_admin 전용',
        '· 권한 외 접근 시 오류 메시지 표시',
      ],
    },
    {
      col: 0, row: 1,
      icon: '📩', title: '초대 온보딩 프로세스',
      lines: [
        '· 어드민이 이메일로 초대 발송',
        '· 72시간 유효 초대 토큰 생성',
        '· /auth/invite 페이지에서 비밀번호 설정',
        '· 설정 완료 후 자동 로그인',
      ],
    },
    {
      col: 1, row: 1,
      icon: '🛡', title: '보안 정책',
      lines: [
        '· Supabase RLS: 행 단위 접근 제어',
        '· 미인증 사용자 미들웨어 차단',
        '· service_role 키: 서버/API Route 전용',
        '· ANON 키: 클라이언트 read-only 제한',
      ],
    },
  ]

  for (const card of cards) {
    const cx = L.XL + card.col * (colW + COL_GAP)
    const cy = startY + card.row * (cardH + ROW_GAP)
    addCard(s, pptx, cx, cy, colW, cardH, {
      icon: card.icon, title: card.title, lines: card.lines,
    })
    assertInBounds(cy, cardH, `member-card:${card.title}`)
  }
}

// Slide 11: Archive & Reports
function slide11_archive_report(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 11, TOTAL, '어드민 — 아카이브 & 리포트', '어드민')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.22
  const colW = (L.W - COL_GAP) / 2
  const ROW_GAP = 0.10
  const cardH = calcCardH(startY, 2, ROW_GAP)

  const cards = [
    {
      col: 0, row: 0,
      icon: '🗄', title: '검증 DB 아카이브',
      lines: [
        '· 완료(completed) 상태 검증 건 전체 보관',
        '· 기관 · 연도 · 키워드 필터 지원',
        '· 제목 · 기관 · 유형 · 상태 · 연도 · 완료일',
        '· 읽기 전용 — 영구 보존 이력',
      ],
    },
    {
      col: 1, row: 0,
      icon: '📈', title: '기관별 실적 리포트 (어드민)',
      lines: [
        '· 기간 선택: 이번 달 / 분기 / 연간 / 직접 설정',
        '· 기관별 완료 건수 · 평균 처리 기간',
        '· AgencyPerformanceTable 컴포넌트',
        '· Suspense 스켈레톤 로딩 처리',
      ],
    },
    {
      col: 0, row: 1,
      icon: '🔎', title: '아카이브 필터 조건',
      lines: [
        '· 기관 필터: 특정 기관만 조회',
        '· 회계연도 필터: fiscal_year 기준',
        '· 키워드 검색: 검증 건 제목 검색',
        '· URL 파라미터 기반 필터 상태 유지',
      ],
    },
    {
      col: 1, row: 1,
      icon: '📅', title: '리포트 기간 옵션',
      lines: [
        '· month: 이번 달 기준',
        '· quarter: 이번 분기',
        '· year: 이번 연도',
        '· custom: 시작일~종료일 직접 입력',
      ],
    },
  ]

  for (const card of cards) {
    const cx = L.XL + card.col * (colW + COL_GAP)
    const cy = startY + card.row * (cardH + ROW_GAP)
    addCard(s, pptx, cx, cy, colW, cardH, {
      icon: card.icon, title: card.title, lines: card.lines,
    })
    assertInBounds(cy, cardH, `archive-card:${card.title}`)
  }
}

// Slide 12: Agency Portal Dashboard
function slide12_agency_portal(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 12, TOTAL, '기관 포털 — 대시보드', '기관 포털')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.18
  const ROW_GAP = 0.10
  const colW3 = (L.W - COL_GAP * 2) / 3

  // Top: 3 KPI cards
  const kpiH = 1.55
  const kpis = [
    {
      icon: '📋', title: '활성 검증 건',
      desc: '진행중 + 보류 합산\n담당 기관의 현재 처리 중인 건수',
      color: C.navy,
    },
    {
      icon: '⏰', title: 'D-7 마감 임박',
      desc: '7일 이내 마감 예정\n긴급 처리가 필요한 건수',
      color: C.amber,
    },
    {
      icon: '✅', title: '총 완료 건수',
      desc: '누적 완료 처리 건수\n기관의 전체 실적 총계',
      color: C.green,
    },
  ]

  for (let i = 0; i < kpis.length; i++) {
    const cx = L.XL + i * (colW3 + COL_GAP)
    const kpi = kpis[i]

    s.addShape(pptx.ShapeType.rect, {
      x: cx, y: startY, w: colW3, h: kpiH,
      fill: { color: C.card },
      line: { color: C.border, width: 0.75 },
    })
    s.addShape(pptx.ShapeType.rect, {
      x: cx, y: startY, w: colW3, h: 0.06,
      fill: { color: kpi.color },
      line: { color: kpi.color, width: 0 },
    })
    s.addText(kpi.icon, {
      x: cx + 0.15, y: startY + 0.15, w: 0.50, h: 0.50,
      fontSize: 24, fontFace: 'Segoe UI Emoji',
      valign: 'top', fit: 'shrink', wrap: false,
      h: 0.50,
    })
    s.addText(kpi.title, {
      x: cx + 0.15, y: startY + 0.70, w: colW3 - 0.30, h: 0.30,
      fontSize: 15, bold: true, color: kpi.color, fontFace: F,
      valign: 'top', fit: 'shrink', wrap: false,
    })
    s.addText(kpi.desc, {
      x: cx + 0.15, y: startY + 1.02, w: colW3 - 0.30, h: kpiH - 1.12,
      fontSize: 12, color: C.gray, fontFace: F,
      valign: 'top', fit: 'shrink', wrap: true,
      lineSpacingMultiple: 1.15,
    })
    assertInBounds(startY, kpiH, `kpi:${kpi.title}`)
  }

  // Bottom: 3 feature cards
  const botStartY = startY + kpiH + ROW_GAP
  const botH = calcCardH(botStartY, 1, 0, 0.05)
  const botColW = (L.W - COL_GAP * 2) / 3
  const botCards = [
    {
      icon: '🃏', title: '담당 검증 건 목록',
      lines: [
        '· 배정된 검증 건 카드 그리드 표시',
        '· 상태 배지 · 마감일 · D-day 표시',
        '· 클릭 시 검증 건 상세 페이지 이동',
      ],
    },
    {
      icon: '🔐', title: '기관 격리 보안',
      lines: [
        '· RLS로 소속 기관 검증 건만 조회',
        '· 타 기관 데이터 자동 차단',
        '· agency_id 기반 데이터 필터링',
      ],
    },
    {
      icon: '📱', title: '반응형 UI',
      lines: [
        '· 모바일~데스크탑 대응 레이아웃',
        '· 사이드바 + 메인 콘텐츠 구조',
        '· 기관 포털 전용 네비게이션',
      ],
    },
  ]

  let bx = L.XL
  for (const card of botCards) {
    addCard(s, pptx, bx, botStartY, botColW, botH, {
      icon: card.icon, title: card.title, lines: card.lines,
    })
    assertInBounds(botStartY, botH, `portal-bot:${card.title}`)
    bx += botColW + COL_GAP
  }
}

// Slide 13: Agency Request Processing
function slide13_agency_request(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 13, TOTAL, '기관 포털 — 검증 건 처리', '기관 포털')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.22
  const colW = (L.W - COL_GAP) / 2
  const ROW_GAP = 0.10
  const cardH = calcCardH(startY, 2, ROW_GAP)

  const cards = [
    {
      col: 0, row: 0,
      icon: '📄', title: '검증 건 상세 조회',
      lines: [
        '· 제목 · 상태 배지 · 검증 유형 태그',
        '· 마감일 및 D-day 카운트다운',
        '· 설명 텍스트 · 위험률/상품 유형 태그',
        '· 기관 일치 검증 (타 기관 데이터 차단)',
      ],
    },
    {
      col: 1, row: 0,
      icon: '📁', title: '파일 업로드 (기관)',
      lines: [
        '· 진행중 · 보류 상태에서 업로드 가능',
        '· 검증 결과 파일 첨부',
        '· 업로드 이력 목록 확인',
        '· 어드민이 올린 파일도 다운로드 가능',
      ],
    },
    {
      col: 0, row: 1,
      icon: '💬', title: '코멘트 소통',
      lines: [
        '· 어드민 ↔ 기관 실시간 코멘트',
        '· 질의 응답 · 추가 자료 요청',
        '· 작성자 구분 표시',
        '· 500px 스크롤 영역',
      ],
    },
    {
      col: 1, row: 1,
      icon: '🔒', title: '접근 제어 (기관)',
      lines: [
        '· RLS: 소속 기관 검증 건만 접근',
        '· 상태 변경 권한 없음 (조회/파일/코멘트)',
        '· 완료된 건: 파일 업로드 비활성화',
        '· 미인증 자동 리다이렉트 → 로그인',
      ],
    },
  ]

  for (const card of cards) {
    const cx = L.XL + card.col * (colW + COL_GAP)
    const cy = startY + card.row * (cardH + ROW_GAP)
    addCard(s, pptx, cx, cy, colW, cardH, {
      icon: card.icon, title: card.title, lines: card.lines,
    })
    assertInBounds(cy, cardH, `agency-req:${card.title}`)
  }
}

// Slide 14: Agency Members & Profile
function slide14_agency_members(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 14, TOTAL, '기관 포털 — 멤버 관리 & 프로필', '기관 포털')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.18
  const ROW_GAP = 0.10
  const colW3 = (L.W - COL_GAP * 2) / 3
  const topH = 2.10

  const topCards = [
    {
      icon: '👤', title: '멤버 관리 (agency_admin)',
      lines: [
        '· agency_admin만 접근 가능',
        '· 소속 기관 멤버 전체 목록 조회',
        '· 멤버 활성화 / 비활성화',
        '· 신규 멤버 초대 이메일 발송',
      ],
    },
    {
      icon: '🏷', title: '역할 체계 (Agency)',
      lines: [
        '· agency_admin: 기관 담당자',
        '  멤버 관리 + 검증 건 처리',
        '· agency_member: 일반 멤버',
        '  검증 건 처리만 가능',
      ],
    },
    {
      icon: '📈', title: '실적 조회 (기관)',
      lines: [
        '· 기간별 완료 건수 조회',
        '· month / quarter / year / custom',
        '· AgencyReportSummary 컴포넌트',
        '· 자기 기관 실적만 조회 가능',
      ],
    },
  ]

  for (let i = 0; i < topCards.length; i++) {
    const cx = L.XL + i * (colW3 + COL_GAP)
    addCard(s, pptx, cx, startY, colW3, topH, {
      icon: topCards[i].icon, title: topCards[i].title, lines: topCards[i].lines,
    })
    assertInBounds(startY, topH, `agency-member:${topCards[i].title}`)
  }

  // Bottom: Profile card wide
  const botY = startY + topH + ROW_GAP
  const botH = calcCardH(botY, 1, 0, 0.05)

  s.addShape(pptx.ShapeType.rect, {
    x: L.XL, y: botY, w: L.W, h: botH,
    fill: { color: C.card },
    line: { color: C.border, width: 0.75 },
  })

  s.addText('👤  프로필 관리', {
    x: L.XL + 0.15, y: botY + 0.12, w: 3.0, h: 0.30,
    fontSize: 15, bold: true, color: C.navy, fontFace: F,
    valign: 'top', fit: 'shrink', wrap: false,
  })

  const profileItems = [
    { label: '소속 기관', desc: '기관명 + 이메일 표시 (변경 불가)' },
    { label: '담당자 정보', desc: '이름 · 연락처 수정 가능' },
    { label: '비밀번호 변경', desc: '8자 이상 새 비밀번호 설정' },
    { label: '저장', desc: 'Supabase Auth updateUser API 호출' },
  ]

  const pColW = (L.W - 0.30) / profileItems.length
  let pX = L.XL + 0.15
  const pY = botY + 0.48
  const pH = botH - 0.58

  for (const pi of profileItems) {
    s.addShape(pptx.ShapeType.rect, {
      x: pX, y: pY, w: pColW, h: pH,
      fill: { color: C.accent },
      line: { color: 'BFDBFE', width: 0.5 },
    })
    s.addText(`${pi.label}\n${pi.desc}`, {
      x: pX + 0.06, y: pY + 0.08, w: pColW - 0.12, h: pH - 0.16,
      fontSize: 12, color: C.navy, fontFace: F,
      align: 'center', valign: 'top', fit: 'shrink', wrap: true,
      lineSpacingMultiple: 1.15,
    })
    assertInBounds(pY, pH, `profile:${pi.label}`)
    pX += pColW
  }
}

// Slide 15: Tech Stack
function slide15_tech(pptx) {
  const TOTAL = 16
  const s = pptx.addSlide()
  s.background = { color: C.white }
  addHeader(s, pptx, 15, TOTAL, '기술 스택')

  const startY = L.Y0 + 0.08
  const COL_GAP = 0.18
  const ROW_GAP = 0.10
  const colW3 = (L.W - COL_GAP * 2) / 3
  const cardH = calcCardH(startY, 2, ROW_GAP)

  const techCards = [
    {
      col: 0, row: 0,
      icon: '⚡', title: 'Next.js 15 (App Router)',
      color: C.navy,
      lines: [
        '· React 19 + Server Components',
        '· Route Group 기반 역할 분리',
        '  (admin) / (agency) / (public)',
        '· TypeScript strict 모드',
        '· Vercel 서버리스 배포',
      ],
    },
    {
      col: 1, row: 0,
      icon: '🗄', title: 'Supabase',
      color: '059669',
      lines: [
        '· PostgreSQL — ippp_ 접두사 테이블',
        '· Row Level Security (RLS)',
        '· Auth — JWT 기반 인증',
        '· Storage — 파일 업로드 버킷',
        '· Realtime — 코멘트 구독',
      ],
    },
    {
      col: 2, row: 0,
      icon: '🎨', title: 'UI & 스타일',
      color: '7C3AED',
      lines: [
        '· TweakCN (shadcn/ui 기반)',
        '· Tailwind CSS v4',
        '· lucide-react 아이콘',
        '· sonner 토스트 알림',
        '· Noto Sans KR 폰트',
      ],
    },
    {
      col: 0, row: 1,
      icon: '📧', title: 'Resend',
      color: 'DC2626',
      lines: [
        '· 초대 이메일 발송',
        '· 상태 변경 알림 이메일',
        '· 비밀번호 재설정 이메일',
        '· RESEND_API_KEY 환경 변수',
      ],
    },
    {
      col: 1, row: 1,
      icon: '🔐', title: '보안 & 인프라',
      color: 'D97706',
      lines: [
        '· Supabase RLS 행 수준 보안',
        '· middleware.ts 미인증 차단',
        '· service_role 키: 서버 전용',
        '· Signed URL 파일 접근 제어',
      ],
    },
    {
      col: 2, row: 1,
      icon: '🧰', title: '개발 도구',
      color: '374151',
      lines: [
        '· zod — 스키마 유효성 검사',
        '· date-fns — 날짜 처리',
        '· react-day-picker — 날짜 선택',
        '· Supabase CLI — 마이그레이션',
      ],
    },
  ]

  for (const card of techCards) {
    const cx = L.XL + card.col * (colW3 + COL_GAP)
    const cy = startY + card.row * (cardH + ROW_GAP)

    s.addShape(pptx.ShapeType.rect, {
      x: cx, y: cy, w: colW3, h: cardH,
      fill: { color: C.card },
      line: { color: card.color, width: 1.25 },
    })

    // Color top accent bar
    s.addShape(pptx.ShapeType.rect, {
      x: cx, y: cy, w: colW3, h: 0.07,
      fill: { color: card.color },
      line: { color: card.color, width: 0 },
    })

    const pad = 0.14
    const titleH = Math.min(cardH * 0.30, 0.40)
    s.addText(`${card.icon}  ${card.title}`, {
      x: cx + pad, y: cy + 0.14, w: colW3 - pad * 2, h: titleH,
      fontSize: 15, bold: true, color: card.color, fontFace: F,
      valign: 'top', fit: 'shrink', wrap: false,
    })
    assertInBounds(cy + 0.14, titleH, `tech-title:${card.title}`)

    const lineStartY = cy + 0.14 + titleH + 0.06
    const remainH = cy + cardH - lineStartY - pad
    const lineH = Math.max(remainH / card.lines.length, 0.18)
    let lY = lineStartY
    for (const line of card.lines) {
      s.addText(line, {
        x: cx + pad, y: lY, w: colW3 - pad * 2, h: lineH,
        fontSize: 12, color: C.gray, fontFace: F,
        valign: 'top', fit: 'shrink', wrap: true,
        lineSpacingMultiple: 1.05,
      })
      assertInBounds(lY, lineH, `tech-line:${line.slice(0,20)}`)
      lY += lineH
    }
    assertInBounds(cy, cardH, `tech-card:${card.title}`)
  }
}

// Slide 16: Closing
function slide16_closing(pptx) {
  const s = pptx.addSlide()
  const TOTAL = 16

  // Navy background
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE.W, h: SLIDE.H,
    fill: { color: C.navy },
    line: { color: C.navy, width: 0 },
  })

  // Accent line
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.50, w: SLIDE.W, h: 0.06,
    fill: { color: C.blue },
    line: { color: C.blue, width: 0 },
  })
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.0, w: SLIDE.W, h: 0.06,
    fill: { color: C.blue },
    line: { color: C.blue, width: 0 },
  })

  // Main message
  s.addText('IPPP', {
    x: L.XL, y: 1.80, w: L.W, h: 0.80,
    fontSize: 54, bold: true, color: C.white, fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: false,
  })

  s.addText('Insurer Product Proof Platform', {
    x: L.XL, y: 2.72, w: L.W, h: 0.45,
    fontSize: 20, color: 'AABBD0', fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: false,
  })

  // 3 summary points
  const points = [
    { icon: '🏢', text: '보험사 내부 업무 디지털화' },
    { icon: '🔄', text: '검증 워크플로우 자동화' },
    { icon: '🔒', text: '기관별 데이터 격리 보안' },
  ]

  const ptW = (L.W - 0.40 * 2) / 3
  let ptX = L.XL + 0.40
  const ptY = 3.40

  for (const pt of points) {
    s.addShape(pptx.ShapeType.rect, {
      x: ptX, y: ptY, w: ptW, h: 0.65,
      fill: { color: '1A3357' },
      line: { color: C.blue, width: 0.75 },
    })
    s.addText(`${pt.icon}  ${pt.text}`, {
      x: ptX + 0.10, y: ptY, w: ptW - 0.20, h: 0.65,
      fontSize: 15, color: C.white, fontFace: F,
      align: 'center', valign: 'middle', fit: 'shrink', wrap: false,
    })
    ptX += ptW + 0.10
  }

  // Tech badges
  const badges = ['Next.js 15', 'Supabase', 'TypeScript', 'Resend', 'Vercel']
  const bW = 1.45
  const bGap = 0.22
  const totalBW = badges.length * bW + (badges.length - 1) * bGap
  let bx = (SLIDE.W - totalBW) / 2
  for (const b of badges) {
    s.addShape(pptx.ShapeType.rect, {
      x: bx, y: 4.30, w: bW, h: 0.32,
      fill: { color: '152B4A' },
      line: { color: '2E4F7A', width: 0.75 },
    })
    s.addText(b, {
      x: bx, y: 4.30, w: bW, h: 0.32,
      fontSize: 11, color: '7AB5E0', fontFace: F,
      align: 'center', valign: 'middle', fit: 'shrink', wrap: false,
    })
    bx += bW + bGap
  }

  // Closing text
  s.addText('검증 업무의 디지털 전환, IPPP로 시작하세요.', {
    x: L.XL, y: 5.00, w: L.W, h: 0.50,
    fontSize: 18, color: 'AABBD0', fontFace: F,
    align: 'center', valign: 'top', fit: 'shrink', wrap: false,
  })

  // Slide number
  s.addText(`${TOTAL} / ${TOTAL}`, {
    x: L.XL, y: 7.10, w: 1.5, h: 0.28,
    fontSize: 11, color: '7A9BBB', fontFace: F,
    valign: 'top', fit: 'shrink', wrap: false,
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 IPPP Presentation Generator 시작...\n')

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'IPPP System'
  pptx.company = 'Insurer Product Proof Platform'
  pptx.subject = 'IPPP — 보험사 상품 검증 관리 플랫폼 소개'
  pptx.title = 'Insurer Product Proof Platform (IPPP) Presentation'

  console.log('  📝 슬라이드 생성 중...')

  slide01_cover(pptx)
  console.log('  ✅ Slide 01: 표지')

  slide02_toc(pptx)
  console.log('  ✅ Slide 02: 목차')

  slide03_overview(pptx)
  console.log('  ✅ Slide 03: 앱 개요')

  slide04_architecture(pptx)
  console.log('  ✅ Slide 04: 시스템 아키텍처')

  slide05_admin_dashboard(pptx)
  console.log('  ✅ Slide 05: 어드민 대시보드')

  slide06_request_list(pptx)
  console.log('  ✅ Slide 06: 검증 건 목록')

  slide07_request_detail(pptx)
  console.log('  ✅ Slide 07: 검증 건 상세')

  slide08_files_comments(pptx)
  console.log('  ✅ Slide 08: 파일 & 코멘트')

  slide09_agency_mgmt(pptx)
  console.log('  ✅ Slide 09: 기관 관리')

  slide10_members(pptx)
  console.log('  ✅ Slide 10: 멤버 관리')

  slide11_archive_report(pptx)
  console.log('  ✅ Slide 11: 아카이브 & 리포트')

  slide12_agency_portal(pptx)
  console.log('  ✅ Slide 12: 기관 포털 대시보드')

  slide13_agency_request(pptx)
  console.log('  ✅ Slide 13: 기관 검증 건 처리')

  slide14_agency_members(pptx)
  console.log('  ✅ Slide 14: 기관 멤버 & 프로필')

  slide15_tech(pptx)
  console.log('  ✅ Slide 15: 기술 스택')

  slide16_closing(pptx)
  console.log('  ✅ Slide 16: 마무리')

  // Save
  const outputDir = __dirname
  const outputPath = resolveOutputPath(outputDir, 'IPPP_Presentation')

  await pptx.writeFile({ fileName: outputPath })
  console.log(`\n✅ 저장 완료: ${outputPath}`)
  console.log(`📊 총 16장 슬라이드 생성`)
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err)
  process.exit(1)
})
