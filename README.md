# Our Home Ledger (Macro Money Manager)

> **"입력은 뭉뚱그려서(Macro), 계산은 정교하게(Logic)"**

10원 단위의 마이크로 관리(Micro-management)를 지양하고, **현금 흐름(Cashflow)**의 안전성 확보와 **카드 혜택(Benefit)**의 최대화를 목표로 하는 가계부 프로젝트입니다.

## 1. 왜 만들었는가? (Problem & Solution)

기존 가계부 앱의 한계와 비효율을 해결하기 위함입니다.

- **입력 피로도 해결**: 껌값 하나하나 입력하는 방식은 지속 불가능합니다. 주간/월간 단위의 '덩어리(Macro)' 입력을 지향합니다.
- **복잡한 로직 자동화**: 카드 결제일(자금 출금)과 실적 산정 기간(혜택 기준)이 다른 복잡한 계산을 자동화합니다.
- **혜택 누수 방지**: "이 카드 이번 달에 얼마 더 써야 혜택받지?"를 직관적으로 시각화하여 혜택을 놓치지 않게 합니다.

## 2. 핵심 기능 (Key Features)

### 2.1. 이중 집계 엔진 (Dual Aggregation Engine)

하나의 지출 데이터를 두 가지 관점으로 자동 분리하여 계산합니다.

1.  **자금 흐름 (Billing View)**: 실제 내 통장에서 돈이 나가는 날짜 기준 (결제일 관리).
2.  **혜택 실적 (Performance View)**: 카드사 실적 산정 기간 기준 (혜택 달성 여부 확인).

### 2.2. 대시보드 (Dashboard)

- **Cashflow 신호등**: 수입/지출/결제예정액을 분석하여 적자 예상 시 🔴 경고를 표시합니다.
- **Benefit Gauge**: 카드별 실적 달성률을 프로그레스 바로 보여줍니다. (예: "15만원 더 쓰면 혜택 달성")

### 2.3. 매크로 입력 (Macro Input)

- 주간 합계, 월간 청구액 등 '덩어리' 입력에 최적화된 인터페이스를 제공합니다.
- 실적 포함 여부, 청구 제외 여부를 플래그로 간단히 관리합니다.

## 3. 기술 스택 (Tech Stack)

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite (`better-sqlite3`) - 로컬 파일 기반 (`data/ledger.db`)
- **Styling**: Tailwind CSS, Lucide React

## 4. 시작하기 (Quick Start)

필수 요구사항: Node.js 18+, pnpm

```bash
# 1. 의존성 설치
pnpm install

# 2. 개발 서버 실행
# 앱 실행 시 data/ledger.db가 자동으로 생성 및 초기화됩니다.
pnpm dev
```
# home-cash-2
