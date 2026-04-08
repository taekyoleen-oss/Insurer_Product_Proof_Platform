-- ============================================================
-- Insurer Product Proof Platform (IPPP) — 샘플 데이터
-- ============================================================
-- 실행 전 준비사항:
--   1. Supabase 대시보드 > Authentication > Users에서
--      super_admin 계정을 먼저 생성하세요.
--   2. ippp_internal_members에 super_admin을 INSERT 하세요.
--   3. 그 다음 이 SQL을 실행하면 super_admin ID를 자동으로 조회합니다.
-- ============================================================

DO $$
DECLARE
  super_admin_uid   uuid;
  agency1_id        uuid;
  agency2_id        uuid;
  agency3_id        uuid;
  req1_id           uuid;
  req2_id           uuid;
  req3_id           uuid;
  req4_id           uuid;
  req5_id           uuid;
  req6_id           uuid;
  req7_id           uuid;
  req8_id           uuid;
  req9_id           uuid;
  req10_id          uuid;
  req11_id          uuid;
  req12_id          uuid;

BEGIN

  -- super_admin user_id 자동 조회
  SELECT user_id INTO super_admin_uid
  FROM ippp_internal_members
  WHERE internal_role = 'super_admin'
  LIMIT 1;

  IF super_admin_uid IS NULL THEN
    RAISE EXCEPTION 'super_admin 계정이 없습니다. ippp_internal_members에 super_admin을 먼저 등록하세요.';
  END IF;

-- ============================================================
-- 1. 검증기관 3개
-- ============================================================

  INSERT INTO ippp_agencies (name, phone, contact_email, contract_date, address)
  VALUES ('한국계리법인', '02-2122-3344', 'contact@kcal.co.kr', '2022-03-01', '서울시 영등포구 여의도동 12-1')
  RETURNING id INTO agency1_id;

  INSERT INTO ippp_agencies (name, phone, contact_email, contract_date, address)
  VALUES ('삼성화재 계리사무소', '02-3344-5566', 'actuary@sf-consulting.co.kr', '2021-07-15', '서울시 강남구 테헤란로 521')
  RETURNING id INTO agency2_id;

  INSERT INTO ippp_agencies (name, phone, contact_email, contract_date, address)
  VALUES ('아시아계리연구원', '02-5566-7788', 'research@asia-actuary.co.kr', '2023-11-01', '서울시 중구 을지로 100')
  RETURNING id INTO agency3_id;


-- ============================================================
-- 2. 검증 건 12개 (다양한 상태·유형)
-- ============================================================

  -- [1] 위험률 — 진행중 — 한국계리법인 — 마감 D-3
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, hazard_type,
     due_date, in_progress_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'hazard_rate', '2026년 상반기 사망위험률 검증',
    '생명보험 표준위험률 개정을 위한 사망위험률 외부 검증 의뢰입니다. 최근 3개년 경험통계 기반으로 산출된 위험률의 타당성 검토를 요청합니다.',
    agency1_id, 'in_progress', ARRAY['사망위험률'],
    (CURRENT_DATE + INTERVAL '3 days')::date, NOW() - INTERVAL '10 days',
    2026, 1, super_admin_uid
  ) RETURNING id INTO req1_id;

  -- [2] 위험률 — 진행중 — 삼성화재 — 마감 D-5
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, hazard_type,
     due_date, in_progress_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'hazard_rate', '질병·상해 복합 위험률 검증 (CI특약)',
    'CI특약 개발을 위한 질병위험률·상해위험률 복합 검증입니다. 암, 심장, 뇌혈관 3대 질병 위험률을 포함합니다.',
    agency2_id, 'in_progress', ARRAY['질병위험률', '상해위험률'],
    (CURRENT_DATE + INTERVAL '5 days')::date, NOW() - INTERVAL '7 days',
    2026, 1, super_admin_uid
  ) RETURNING id INTO req2_id;

  -- [3] 상품 — 진행중 — 아시아계리 — 마감 D+12
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, product_type,
     due_date, in_progress_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'product', '무배당 종신보험 상품 검증',
    '신규 출시 예정인 무배당 종신보험 상품의 계리적 적정성 검증을 의뢰합니다. 보험료 산출, 책임준비금 적립, 해지환급금 계산 검증을 포함합니다.',
    agency3_id, 'in_progress', '사망보험',
    (CURRENT_DATE + INTERVAL '12 days')::date, NOW() - INTERVAL '5 days',
    2026, 1, super_admin_uid
  ) RETURNING id INTO req3_id;

  -- [4] 상품 — 진행중 — 한국계리법인 — 마감 D+20
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, product_type,
     due_date, in_progress_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'product', '연금저축보험 개정 상품 계리 검증',
    '기존 연금저축보험 상품의 공시이율 구조 개편에 따른 계리적 타당성 검증입니다. 연금전환 옵션 및 최저보증이율 관련 준비금 검증 포함.',
    agency1_id, 'in_progress', '연금보험',
    (CURRENT_DATE + INTERVAL '20 days')::date, NOW() - INTERVAL '3 days',
    2026, 2, super_admin_uid
  ) RETURNING id INTO req4_id;

  -- [5] 위험률 — 보류 — 삼성화재 — 마감 D+1 (임박!)
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, hazard_type,
     due_date, in_progress_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'hazard_rate', '장기요양 위험률 검증 (2026 개정)',
    '노인 장기요양보험 위험률 개정안 검증. 요양등급별 발생률 변화 및 평균 요양 기간 재산출 결과의 타당성 검토를 요청합니다.',
    agency2_id, 'hold', ARRAY['장기요양위험률'],
    (CURRENT_DATE + INTERVAL '1 days')::date, NOW() - INTERVAL '20 days',
    2026, 1, super_admin_uid
  ) RETURNING id INTO req5_id;

  -- [6] 상품 — 보류 — 아시아계리 — 마감 D+8
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, product_type,
     due_date, in_progress_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'product', '간호·간병 통합서비스 보험 검증',
    '간호·간병 통합서비스 신규 보험상품 계리 검증. 간호 행위별 비용 통계 및 재원일수 분포 기반 보험료 산출 적정성 검토.',
    agency3_id, 'hold', '질병보험/CI보험',
    (CURRENT_DATE + INTERVAL '8 days')::date, NOW() - INTERVAL '15 days',
    2026, 2, super_admin_uid
  ) RETURNING id INTO req6_id;

  -- [7] 위험률 — 완료 — 한국계리법인 (2025 Q4)
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, hazard_type,
     due_date, in_progress_at, archive_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'hazard_rate', '2025년 하반기 사망·재해 위험률 검증',
    '표준생명표 2025년 개정을 위한 사망 및 재해 위험률 종합 검증.',
    agency1_id, 'completed', ARRAY['사망위험률', '상해위험률'],
    '2025-12-15', '2025-10-01', '2025-11-28',
    2025, 4, super_admin_uid
  ) RETURNING id INTO req7_id;

  -- [8] 상품 — 완료 — 삼성화재 (2025 Q4)
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, product_type,
     due_date, in_progress_at, archive_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'product', '어린이 CI보험 리뉴얼 상품 검증',
    '소아·청소년 CI보험 리뉴얼 상품의 계리 검증. 소아암·소아당뇨 특약 추가에 따른 보험료 적정성 검토.',
    agency2_id, 'completed', '질병보험/CI보험',
    '2025-11-30', '2025-10-10', '2025-11-25',
    2025, 4, super_admin_uid
  ) RETURNING id INTO req8_id;

  -- [9] 위험률 — 완료 — 아시아계리 (2025 Q3)
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, hazard_type,
     due_date, in_progress_at, archive_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'hazard_rate', '신체후유장해 위험률 검토 (상해보험)',
    '상해보험 후유장해 지급률 산출 근거 검토 및 장해 등급별 위험률 적정성 검증.',
    agency3_id, 'completed', ARRAY['신체후유장위험률'],
    '2025-09-30', '2025-07-15', '2025-09-22',
    2025, 3, super_admin_uid
  ) RETURNING id INTO req9_id;

  -- [10] 상품 — 완료 — 한국계리법인 (2025 Q3)
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, product_type,
     due_date, in_progress_at, archive_at, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'product', '퇴직연금 변액보험 상품 계리 검증',
    '퇴직연금 연계 변액보험 신상품 검증. 펀드 구성별 보증비용 및 최저연금지급보증 준비금 계산 적정성 검토.',
    agency1_id, 'completed', '연금보험',
    '2025-08-31', '2025-06-20', '2025-08-25',
    2025, 3, super_admin_uid
  ) RETURNING id INTO req10_id;

  -- [11] 위험률 — 초안(draft) — 준비중
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, hazard_type,
     due_date, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'hazard_rate', '2026년 질병위험률 재산출 검증 (준비중)',
    '2026년 하반기 신상품 개발을 위한 질병위험률 재산출 검증 의뢰 준비 중. 기관 배정 예정.',
    agency2_id, 'draft', ARRAY['질병위험률', '장기요양위험률'],
    (CURRENT_DATE + INTERVAL '45 days')::date,
    2026, 2, super_admin_uid
  ) RETURNING id INTO req11_id;

  -- [12] 상품 — 초안(draft) — 준비중
  INSERT INTO ippp_requests
    (type, title, description, agency_id, status, product_type,
     due_date, fiscal_year, fiscal_quarter, created_by)
  VALUES (
    'product', '헬스케어 연계 건강보험 신상품 검증 (준비중)',
    '웨어러블 기기 연계 건강보험 혜택 차등 적용 신상품의 계리적 타당성 사전 검토 요청.',
    agency3_id, 'draft', '질병보험/CI보험',
    (CURRENT_DATE + INTERVAL '60 days')::date,
    2026, 2, super_admin_uid
  ) RETURNING id INTO req12_id;


-- ============================================================
-- 3. 코멘트 샘플 (진행중·완료 건에 첨부)
-- ============================================================

  INSERT INTO ippp_comments (request_id, author_id, content) VALUES
    (req1_id, super_admin_uid, '검증 의뢰 자료를 업로드했습니다. 경험통계 기간은 2023~2025년 3개년이며, 성별·연령별 세부 분류 포함입니다.'),
    (req1_id, super_admin_uid, '추가로 표준생명표 2021년 버전과의 비교 분석 자료도 함께 첨부했습니다.'),
    (req2_id, super_admin_uid, '질병위험률 원시데이터와 CI특약 과거 청구 이력을 ZIP으로 압축해서 업로드했습니다.'),
    (req2_id, super_admin_uid, '상해위험률은 직업급수 A~C등급 구분해서 산출했습니다. 파일 참조 부탁드립니다.'),
    (req3_id, super_admin_uid, '보험료 산출 기초서류 및 책임준비금 계산 Excel 파일 업로드 완료했습니다.'),
    (req5_id, super_admin_uid, '추가 데이터 요청이 있어 일시 보류 처리했습니다. 요양등급별 세분화 통계 준비 중입니다.'),
    (req7_id, super_admin_uid, '검증확인서 수령했습니다. 최종 보고서 및 확인서 파일 아카이브 완료.'),
    (req8_id, super_admin_uid, '소아암 특약 관련 추가 질의사항 반영하여 최종 검증 완료되었습니다.');

  RAISE NOTICE '✅ Insurer Product Proof Platform (IPPP) 샘플 데이터 삽입 완료';
  RAISE NOTICE '   - 검증기관: 3개';
  RAISE NOTICE '   - 검증 건: 12개 (in_progress: 4, hold: 2, completed: 4, draft: 2)';
  RAISE NOTICE '   - 코멘트: 8개';

END $$;
