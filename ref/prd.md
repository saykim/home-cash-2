PRD: Our Home Ledger (Macro Money Manager)

1. 프로젝트 개요 (Overview)
   프로젝트명: 우리집 가계부 (Our Home Ledger)

부제: 3M (Macro Money Manager)

핵심 철학: "입력은 뭉뚱그려서(Macro), 계산은 정교하게(Logic)"

10원 단위의 마이크로 관리(Micro-management)를 지양한다.

**현금 흐름(Cashflow)**의 안전성 확보와 **카드 혜택(Benefit)**의 최대화를 목표로 한다.

2. 해결하고자 하는 문제 (Problem Statement)
   입력 피로도: 기존 가계부 앱은 낱알 같은 지출 내역 입력을 강요하여 지속성을 떨어뜨린다.

로직의 부재: 노션(Notion)이나 엑셀은 '결제일 기준 출금액'과 '실적 기간 기준 사용액'이 서로 다른 카드사의 복잡한 로직을 자동화하기 어렵다.

혜택 누수: 내가 이 카드를 얼마나 더 써야 혜택을 받는지 직관적으로 알기 어렵다.

3. 핵심 기능 (Key Features)
   3.1. 대시보드 (The View)
   Cashflow 신호등:

수입 - (지출 + 결제 예정액) = 예상 잔액

적자 예상 시 빨간색 경고 메시지 출력 (Visual Alert).

카드 실적 게이지 (Benefit Gauge):

카드별 목표 달성률을 프로그레스 바(Progress Bar)로 시각화.

*"15만 원 더 쓰면 주유 할인 달성!"*과 같은 구체적 액션 가이드 제공.

이미 달성한 혜택은 체크(✅) 표시.

3.2. 이중 집계 엔진 (Dual Aggregation Engine) - 핵심 차별점
하나의 지출 데이터를 두 가지 관점으로 자동 분류하여 계산한다.

자금 흐름 관점 (Billing View): 내 통장에서 언제 돈이 나가는가? (카드 결제일 기준)

혜택 실적 관점 (Performance View): 이 지출이 혜택 실적에 포함되는가? (실적 산정 기간 + 실적 제외 항목 필터링)

3.3. 기준 정보 관리 (Settings)
결제 수단 관리: 카드(신용/체크), 통장, 현금 등 등록.

날짜 규칙 정의: 결제일(예: 14일)과 실적 기준일(예: 전월 1일)을 각각 설정.

혜택 구간(Tier) 설정: 카드별 실적 구간(30만, 70만 등)과 혜택 내용 등록.

3.4. 매크로 입력 (Macro Input)
건별 입력뿐만 아니라, '주간 합계', '월간 청구액 합계' 등 덩어리 입력을 지원한다.

입력 시 실적 제외(Excluded) 플래그를 선택하여 실적 계산에서 뺄 수 있다.

4. 데이터 구조 (Data Schema)
   4.1. Payment Methods (결제 수단)
   id: UUID

type: CREDIT, CHECK, ACCOUNT, CASH

billing_date: 결제일 (자금 흐름용)

performance_start_day: 실적 시작일 (혜택용, 기본값 1일)

4.2. Benefit Tiers (혜택 구간)
payment_method_id: FK

threshold: 기준 금액 (예: 300,000)

benefit: 혜택 내용 (예: "통신비 1만원 할인")

4.3. Transactions (내역)
date: 사용 날짜

amount: 금액 (+ 수입, - 지출)

category: 분류

exclude_from_performance: Boolean (실적 제외 여부)

is_installment: Boolean (할부 여부 - MVP 단계에서는 단순 합산 처리)

5. 기술 스택 (Tech Stack)
   Frontend: Next.js 14 (App Router)

Styling: Tailwind CSS + Lucide React (Icons)

Backend & DB: Supabase (PostgreSQL)

Authentication: Supabase Auth

Database: Postgres RLS (Row Level Security) 적용

6. 개발 로드맵 (Roadmap)
   Phase 1: 골격 구축 (이번 주말 목표)
   [x] Supabase 프로젝트 생성 및 Table 스키마 적용.

[x] Next.js 프로젝트 세팅 및 기본 UI(Dashboard, Settings) 구현.

[ ] 결제 수단(카드) CRUD 기능 연동.

Phase 2: 핵심 로직 구현
[ ] 내역 입력(Transaction Create) 기능 구현.

[ ] 대시보드에 DB 데이터 바인딩 (실시간 잔액 및 게이지 연동).

[ ] exclude_from_performance 필터링 로직 검증.

Phase 3: 고도화
[ ] 로그인/회원가입 (Auth) 연동.

[ ] 모바일 반응형 최적화 (PWA 고려).
