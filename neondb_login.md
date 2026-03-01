# neondb_login

`home-cash-2`에서 **Neon DB 연결 + Neon Auth 로그인 활성화 + (옵션) SQLite 데이터 마이그레이션**을
실수 없이 빠르게 반복하기 위한 실행 런북.

## 0. 먼저 경로 선택

- 경로 A: 기존 SQLite 데이터를 버리고 새로 시작 (가짜 데이터였던 경우)
- 경로 B: 기존 SQLite 데이터를 Neon으로 이전 (실데이터 보존 필요)

둘 다 공통으로 **Neon 연결 + Auth 설정 + Vercel 설정**이 필요하다.

## 1. 이 프로젝트의 현재 구조 (중요)

- DB 드라이버: `@neondatabase/serverless`
- 스키마 생성: `src/lib/schema.ts`의 `initSchema()`
- DB 초기화 진입점: `src/lib/db.ts`의 `getDb()`
- 시드 데이터: `src/lib/seed.ts`는 존재하지만 `db.ts`에서 **비활성화** 상태
- API는 인증 필요: 대부분 라우트가 `requireAuth()`로 보호됨

즉, 로그인 없이 API를 때리면 `401`이므로, 테이블 자동 생성도 로그인 이후 실제 API 호출 시점에 일어난다.

## 2. 사전 준비

### 2.1 계정/툴

- Neon 계정
- Vercel 프로젝트
- 로컬 Node + pnpm
- (경로 B만) `sqlite3`, `psql` CLI

### 2.2 Neon에서 확보할 값

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL` (`.../auth`로 끝나는 URL)

`NEON_AUTH_COOKIE_SECRET` 생성:

```bash
openssl rand -base64 32
```

## 3. 로컬 연결 (공통)

### 3.1 `.env` 작성

```env
DATABASE_URL=postgresql://...
NEON_AUTH_BASE_URL=https://<project>.neonauth.../neondb/auth
NEON_AUTH_COOKIE_SECRET=<openssl로 생성한 값>
```

참고: 현재 코드상 `VITE_NEON_AUTH_URL`은 fallback 용도다. 로컬/배포 모두 `NEON_AUTH_BASE_URL` 기준으로 맞추는 것을 권장.

### 3.2 설치/빌드

```bash
pnpm install
pnpm run build
```

### 3.3 실행/초기화 확인

```bash
pnpm dev
```

브라우저에서:

1. `/auth/sign-up` 또는 `/auth/sign-in`
2. 로그인 성공 후 `/` 진입

이때 대시보드 API 호출이 발생하면서 `initSchema()`가 실행되어 테이블이 생성된다.

Neon SQL Editor에서 확인:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

기대 테이블:

- `payment_methods`
- `benefit_tiers`
- `transactions`

## 4. 경로 A: 마이그레이션 없이 새로 시작

현재 프로젝트 기본 모드다.

- 시드 데이터 자동 입력 없음 (`seedIfEmpty` 비활성)
- 로그인 후 빈 상태에서 직접 데이터 입력

원하면 테스트용 시드 사용 가능:

- `src/lib/db.ts`에서 `seedIfEmpty(client)` 주석 해제
- 완료 후 다시 비활성화 권장

## 5. 경로 B: SQLite -> Neon 데이터 이전

상세는 `neondb_migration_guide.md`를 보고, 여기서는 실수 방지 핵심만 다룬다.

### 5.1 이전 전 원칙

- Neon 대상 DB 백업/스냅샷 먼저
- FK 순서 준수: `payment_methods -> benefit_tiers -> transactions`
- 컬럼/타입 호환 확인 (`type` 값은 CHECK 제약 준수)

### 5.2 최소 절차

1. SQLite에서 CSV export
2. Neon에서 테이블 준비 (`initSchema` 실행 또는 SQL 직접 생성)
3. 기존 데이터 비우기(필요 시)
4. `\copy`로 순서대로 import
5. row count/샘플 검증

## 6. Vercel 배포

### 6.1 필수 env (Production/Preview)

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`

저장 후 **Redeploy 필수**.

### 6.2 Neon Auth Trusted Domains

Neon Auth 도메인 허용 목록에 추가:

- `https://<project>.vercel.app`
- `https://<custom-domain>` (사용 시)
- Preview 테스트하면 Preview 도메인도 추가

등록 누락 시 `Invalid origin` 발생.

## 7. 배포 후 스모크 테스트

1. 비로그인 `/` 접속 -> `/auth/sign-in` 리다이렉트
2. `/auth/sign-up` 가입 (비밀번호 8자 이상)
3. 로그인 후 대시보드 진입
4. 거래 생성/삭제
5. 로그아웃 동작 확인

## 8. 자주 난 오류 즉시 대응

### 8.1 `NEON_AUTH_COOKIE_SECRET is not set`

- 원인: Vercel env 누락
- 해결: env 추가 + Redeploy

### 8.2 `Invalid origin`

- 원인: Trusted Domains 누락
- 해결: Neon Auth Domains에 현재 도메인 등록

### 8.3 `ERR_PNPM_OUTDATED_LOCKFILE`

- 원인: `package.json` vs `pnpm-lock.yaml` 불일치
- 해결:

```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update lockfile"
```

### 8.4 `Password too short`

- 원인: 8자 미만 비밀번호
- 해결: 8자 이상 사용

## 9. 운영 전 최종 체크리스트

- [ ] 로컬 `.env` 3개 설정 완료
- [ ] `pnpm run build` 성공
- [ ] 로그인 후 Neon 테이블 생성 확인
- [ ] (경로 B) 마이그레이션 후 row count 검증 완료
- [ ] Vercel env 3개 설정 완료
- [ ] Trusted Domains 등록 완료
- [ ] Redeploy 후 로그인/CRUD/로그아웃 확인
