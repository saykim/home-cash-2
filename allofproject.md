# Home Cash 2 프로젝트 백서

- 문서명: `allofproject.md`
- 작성일: 2026-02-16
- 대상: 운영/개발 팀 내부 공유용
- 범위: 프로젝트 목적, 구조, 기술 선택 이유, 기능 구성, 장애/오류와 해결 이력

## 1. 프로젝트 개요

### 1.1 목적
`home-cash-2`는 "세부 소비 항목을 과도하게 쪼개지 않고(매크로 입력), 월 단위 현금흐름과 카드 실적을 정확하게 관리"하는 가계부 서비스다.

핵심 목표는 2가지다.
1. 월별 수입/지출/잔액의 빠른 파악
2. 결제수단(특히 카드) 실적 달성 상태의 가시화

### 1.2 문제정의
기존 가계부의 일반적 문제는 다음과 같았다.
1. 입력 피로: 소액 지출까지 세밀하게 입력해야 해서 지속성이 낮음
2. 계산 복잡도: 결제일, 실적 제외 항목, 카드 혜택 기준을 수동으로 계산해야 함
3. 실행 지표 부재: "이번 달 얼마 더 써야 혜택 달성인지"를 실시간으로 알기 어려움

본 프로젝트는 위 문제를 "간결한 입력 + 자동 집계 + 시각화"로 해결하도록 설계했다.

## 2. 왜 이 구조를 선택했는가

### 2.1 Next.js(App Router) 선택 이유
이 프로젝트는 Vite/Svelte보다 Next.js 14(App Router)가 운영 요구에 더 맞았다.

1. API와 UI를 단일 리포에서 관리
- `src/app/api/*`로 서버 API를 같은 코드베이스에서 운영
- 인증, DB 접근, UI 변경을 한 흐름으로 관리 가능

2. 인증 연동 단순화
- Neon Auth 서버 핸들러를 Next 라우트(`src/app/api/auth/[...path]/route.ts`)로 직접 연결
- 미들웨어(`src/middleware.ts`)로 보호 라우트 제어가 용이

3. 배포 일관성
- Vercel 타깃과 궁합이 좋고, 환경변수/서버리스 라우트 운영 패턴이 표준화됨

### 2.2 Neon(Postgres + Auth) 선택 이유
1. DB와 Auth를 동일 벤더에서 운영해 초기 구축 속도 확보
2. `DATABASE_URL` 기반으로 서버리스 연결 단순화
3. 사용자 세션 기반 확장(개인별 설정 저장 등) 대응 가능

## 3. 현재 시스템 구조

### 3.1 상위 구조
1. 프론트엔드: Next.js Client Components
2. 백엔드: Next.js Route Handlers (`src/app/api/*`)
3. 인증: Neon Auth (`@neondatabase/neon-js/auth/next`)
4. 데이터베이스: Neon Postgres (`@neondatabase/serverless`)

### 3.2 핵심 디렉터리
1. 화면/라우팅
- `src/app/page.tsx`: 메인 대시보드
- `src/app/auth/sign-in/page.tsx`: 로그인
- `src/app/auth/sign-up/page.tsx`: 회원가입
- `src/app/account/page.tsx`: 계정 관리

2. API
- `src/app/api/dashboard/route.ts`
- `src/app/api/transactions/route.ts`
- `src/app/api/transactions/[id]/route.ts`
- `src/app/api/payment-methods/route.ts`
- `src/app/api/payment-methods/[id]/route.ts`
- `src/app/api/benefit-tiers/route.ts`
- `src/app/api/benefit-tiers/[id]/route.ts`
- `src/app/api/auth/[...path]/route.ts`
- `src/app/api/user-dashboard-layout/route.ts`

3. 공통 인프라
- `src/lib/db.ts`: DB 풀/초기화
- `src/lib/schema.ts`: 스키마 생성
- `src/lib/auth/server.ts`: 서버 Auth 설정 생성
- `src/lib/auth/require-auth.ts`: API 인증 가드
- `src/middleware.ts`: 페이지 접근 보호

### 3.3 데이터 스키마
현재 핵심 테이블은 4개다.
1. `payment_methods`
2. `benefit_tiers`
3. `transactions`
4. `user_dashboard_layouts` (사용자별 대시보드 카드 순서 저장)

## 4. 기능 구성

### 4.1 대시보드(요약)
- 수입/지출/잔액 요약
- 메인 지표를 최상단 고정

### 4.2 결제수단 실적/사용 현황
- 카드별 실적 누적
- 다음 혜택까지 남은 금액 가시화

### 4.3 월별 누적 변화 추이
- 월별 수입/지출 누적 흐름 시각화

### 4.4 최근 내역 요약
- 검색/필터(분류/결제수단/실적 포함 여부)
- 실적 집계 포함/제외 기준으로 목록 제어
- "내역 입력" 버튼을 최근내역 섹션에서 바로 실행 가능

### 4.5 내역 입력 UX 개선
- 금액 필드 한국식 3자리 콤마 포맷(`1,234,567`)
- 입력 중 커서 위치 보정 로직으로 편집 안정성 확보

### 4.6 개인화 레이아웃
- 최상단 요약 카드는 고정
- 하위 3개 섹션은 드래그로 순서 변경
- 사용자별 순서가 서버에 저장되어 재접속 시 복원

## 5. 운영/배포 구성

### 5.1 필수 환경변수
1. `DATABASE_URL`
2. `NEON_AUTH_BASE_URL` (또는 `VITE_NEON_AUTH_URL` 보조)
3. `NEON_AUTH_COOKIE_SECRET`

### 5.2 인증 흐름
1. 클라이언트: `authClient.signIn.email` / `authClient.signUp.email`
2. 서버: `src/app/api/auth/[...path]/route.ts`가 Neon Auth handler로 프록시
3. 보호 API: `requireAuth()`로 세션 검사
4. 보호 페이지: `middleware.ts`에서 인증 없으면 차단

## 6. 오류/장애 이력과 해결

아래는 실제 운영/개발 중 발생한 대표 이슈와 조치 내용이다.

### 6.1 Vercel 배포 중 404/NOT_FOUND
- 증상: 배포 URL 접근 시 `404: NOT_FOUND`
- 원인: 배포 상태/경로/빌드 실패 시점이 겹치며 정상 라우트가 준비되지 않은 상태
- 조치: 빌드 오류를 우선 해소하고 재배포, 환경변수/브랜치 반영 상태 점검
- 재발 방지: 배포 전 `env + lockfile + build command` 체크리스트 운영

### 6.2 CI 설치 실패 (`ERR_PNPM_OUTDATED_LOCKFILE`)
- 증상: `pnpm install`이 frozen-lockfile로 실패
- 원인: `package.json` 변경 후 `pnpm-lock.yaml` 미동기화
- 조치: lockfile 갱신 후 커밋/푸시
- 재발 방지: 의존성 변경 시 lockfile 동시 커밋을 규칙화

### 6.3 Auth 초기화 실패 (`NEON_AUTH_COOKIE_SECRET is not set`)
- 증상: Vercel 빌드/런타임에서 Auth 라우트 초기화 실패
- 원인: 필수 환경변수 누락
- 조치: Vercel에 `NEON_AUTH_COOKIE_SECRET` 추가
- 재발 방지: 환경변수 필수 목록 문서화 및 신규 프로젝트 템플릿에 포함

### 6.4 서버 인증 미구성 에러
- 증상: `Server auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.`
- 원인: `NEON_AUTH_BASE_URL`/`NEON_AUTH_COOKIE_SECRET` 값 누락 또는 유효하지 않은 값
- 조치: 두 변수 모두 등록, 값 공백/형식 점검
- 코드 보강: `src/lib/auth/server.ts`에서 `trim()` 및 예외 방어(`try/catch`) 추가

### 6.5 가입 시 `Password too short` (400)
- 증상: `/api/auth/sign-up/email` 400
- 원인: Neon Auth 비밀번호 정책 미충족
- 조치: 회원가입 UI에 최소 길이(8자) 사전 검증 추가
- 위치: `src/app/auth/sign-up/page.tsx`

### 6.6 로그인 후 로그아웃 불안정
- 증상: 로그아웃 호출 후 세션 잔류/이동 실패 사례
- 원인: 클라이언트 signOut 실패 시 예외 경로 미흡
- 조치: 실패 시 `/api/auth/sign-out` fallback 호출 후 강제 리다이렉트 처리
- 위치: `src/app/page.tsx`, `src/app/account/page.tsx`

### 6.7 `Invalid origin` 오류
- 증상: 인증 요청 시 origin 검증 실패
- 원인: Neon Auth 허용 origin에 배포 도메인 미등록
- 조치: Neon 콘솔에 Vercel 도메인(프리뷰/프로덕션 포함) 등록
- 재발 방지: 도메인 추가 시 Auth allowed origins 동기 업데이트

### 6.8 금액 입력 UX 문제(콤마 없음, 편집 혼란)
- 증상: 큰 금액 입력 시 가독성 저하, 커서 점프
- 원인: 숫자 원문 입력만 처리
- 조치: 3자리 콤마 표시 + 커서 보정 로직 적용
- 위치: `src/components/TransactionForm.tsx`

### 6.9 최근 내역 섹션 액션 접근성
- 증상: 내역 추가 액션이 상단 요약에 있어 컨텍스트 분리
- 조치: "내역 입력" 버튼을 `최근 내역 요약` 필터 라인으로 이동
- 위치: `src/components/TransactionTable.tsx`, `src/app/page.tsx`

### 6.10 사용자별 대시보드 순서 요구 반영
- 요구: 상단 요약 고정 + 하단 카드 순서 사용자별 이동
- 조치: 드래그 재정렬 UI + `user_dashboard_layouts` 저장 API 추가
- 위치:
1. `src/app/page.tsx`
2. `src/app/api/user-dashboard-layout/route.ts`
3. `src/lib/schema.ts`

## 7. 핵심 설계 의사결정 요약

1. "빠른 운영" 우선
- Next.js + Route Handler + Neon 조합으로 백엔드 별도 서비스 분리 없이 운영 시작

2. "복잡도 점진 증가" 전략
- 초기 데이터는 단순 트랜잭션 중심
- 개인화(카드 순서 저장) 같은 기능은 별도 테이블로 확장

3. "입력 안정성" 우선
- 사용자 입력에서 자주 생기는 혼란(금액 가독성, 폼 에러)을 프론트에서 선제 방어

4. "실패 허용 설계"
- 인증/로그아웃 경로에 fallback 추가
- 설정값 오류 시 명시적 에러 메시지로 운영 디버깅 시간 단축

## 8. 현재 한계와 다음 단계

### 8.1 현재 한계
1. 드래그 정렬은 기본 HTML DnD 기반이라 모바일/접근성 확장성이 제한됨
2. 다중 사용자 데이터 분리(가계부 단위 권한 모델)는 아직 미적용
3. 스키마 버전 관리(정식 migration 도구) 미도입

### 8.2 다음 단계 권장
1. `dnd-kit` 전환으로 모바일/키보드 접근성 강화
2. 사용자/가계부 분리 모델(예: household_id, membership) 도입
3. 마이그레이션 체계화(Drizzle/Prisma/Flyway 중 택1)
4. 배포 체크리스트 자동화(CI에서 env/lockfile/schema 검사)

## 9. 결론

`home-cash-2`는 단순 입력과 실용적인 월간 의사결정을 목표로 하는 경량 가계부 시스템이다.
현재 구조는 운영 속도와 확장성의 균형을 잡는 데 초점을 맞췄고, 인증/배포/입력 UX에서 발생했던 주요 장애를 실무적으로 정리하고 개선해왔다.

즉, 이 프로젝트의 핵심은 "복잡한 재무 로직을 사용자 행동 비용이 낮은 UI로 제공"하는 것이며, 앞으로의 확장 포인트는 "사용자/권한 모델 강화"와 "운영 자동화"다.
