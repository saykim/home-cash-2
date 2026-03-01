# SQLite to Neon Postgres Migration Guide

**전역 재사용 가능** 마이그레이션 가이드: SQLite 기반 프로젝트를 Neon Postgres로 전환할 때 사용.

---

## 목차

- [Part 1: 코드 마이그레이션](#part-1-코드-마이그레이션)
- [Part 2: 데이터 마이그레이션](#part-2-데이터-마이그레이션)
- [Part 3: 검증 및 배포](#part-3-검증-및-배포)
- [Part 4: Troubleshooting](#part-4-troubleshooting)

---

## Part 1: 코드 마이그레이션

### 1.1 패키지 교체

#### 제거할 패키지

```bash
pnpm remove better-sqlite3 @types/better-sqlite3
```

#### 추가할 패키지

```bash
pnpm add @neondatabase/serverless
pnpm add -D @types/pg ws
```

**`package.json` 정리 체크리스트:**

- [ ] `dependencies`에서 `better-sqlite3` 제거
- [ ] `dependencies`에 `@neondatabase/serverless` 추가
- [ ] `devDependencies`에 `@types/pg`, `ws` 추가
- [ ] `pnpm.onlyBuiltDependencies` 설정 제거 (있는 경우)

#### 최종 `package.json` 예시

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^1.0.2",
    "other-deps": "..."
  },
  "devDependencies": {
    "@types/pg": "^8.16.0",
    "ws": "^8.19.0"
  }
}
```

---

### 1.2 데이터베이스 연결 파일 변환

**기존 SQLite 방식 (`src/lib/db.ts`)**

```typescript
import Database from 'better-sqlite3';

const db = new Database('./data/myapp.db');

export function getDb() {
  return db;
}
```

**새로운 Neon Postgres 방식**

```typescript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

let initialized = false;

export async function getDb() {
  if (!initialized) {
    const client = await pool.connect();
    try {
      await initSchema(client);
      // await seedIfEmpty(client); // 자동 시딩이 필요한 경우만 활성화
      initialized = true;
    } finally {
      client.release();
    }
  }
  return pool;
}
```

**핵심 변경사항:**

| 항목 | SQLite | Neon Postgres |
|------|--------|---------------|
| 패키지 | `better-sqlite3` | `@neondatabase/serverless` |
| 연결 방식 | 파일 경로 | `DATABASE_URL` 환경 변수 |
| 동기/비동기 | 동기 (synchronous) | 비동기 (async/await) |
| Connection | 단일 객체 | Pool + Client |

---

### 1.3 API 변환 패턴

#### 패턴 1: SELECT 단일 row (`.get()` → `client.query()`)

**Before (SQLite)**

```typescript
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(userId);
```

**After (Neon Postgres)**

```typescript
const pool = await getDb();
const client = await pool.connect();

try {
  const result = await client.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  const user = result.rows[0]; // 첫 번째 row
} finally {
  client.release();
}
```

#### 패턴 2: SELECT 여러 rows (`.all()` → `client.query()`)

**Before (SQLite)**

```typescript
const stmt = db.prepare('SELECT * FROM posts WHERE author_id = ?');
const posts = stmt.all(authorId);
```

**After (Neon Postgres)**

```typescript
const pool = await getDb();
const client = await pool.connect();

try {
  const result = await client.query(
    'SELECT * FROM posts WHERE author_id = $1',
    [authorId]
  );
  const posts = result.rows; // 전체 rows
} finally {
  client.release();
}
```

#### 패턴 3: INSERT (`.run()` → `client.query()`)

**Before (SQLite)**

```typescript
const stmt = db.prepare(
  'INSERT INTO users (id, name, email) VALUES (?, ?, ?)'
);
const info = stmt.run(id, name, email);
console.log(`Inserted ${info.changes} rows`);
```

**After (Neon Postgres)**

```typescript
const pool = await getDb();
const client = await pool.connect();

try {
  const result = await client.query(
    'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)',
    [id, name, email]
  );
  console.log(`Inserted ${result.rowCount} rows`);
} finally {
  client.release();
}
```

#### 패턴 4: UPDATE / DELETE (`.run()` → `client.query()`)

**Before (SQLite)**

```typescript
const stmt = db.prepare('UPDATE users SET name = ? WHERE id = ?');
const info = stmt.run(newName, userId);
```

**After (Neon Postgres)**

```typescript
const pool = await getDb();
const client = await pool.connect();

try {
  const result = await client.query(
    'UPDATE users SET name = $1 WHERE id = $2',
    [newName, userId]
  );
  console.log(`Updated ${result.rowCount} rows`);
} finally {
  client.release();
}
```

---

### 1.4 파라미터 문법 변환

| SQLite | Neon Postgres | 비고 |
|--------|---------------|------|
| `?` | `$1, $2, $3` | 위치 기반 순서 유지 |
| `?` (첫 번째) | `$1` | |
| `?` (두 번째) | `$2` | |
| `?` (세 번째) | `$3` | |

**변환 예시:**

```typescript
// Before
'SELECT * FROM users WHERE email = ? AND status = ?'

// After
'SELECT * FROM users WHERE email = $1 AND status = $2'
```

---

### 1.5 반환 값 변환

| 작업 | SQLite | Neon Postgres |
|------|--------|---------------|
| 단일 row | `stmt.get()` | `result.rows[0]` |
| 여러 rows | `stmt.all()` | `result.rows` |
| 영향받은 row 수 | `info.changes` | `result.rowCount` |

---

### 1.6 Connection Pool 관리 패턴

**Next.js API Route 예시**

```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const pool = await getDb();
  const client = await pool.connect();

  try {
    const result = await client.query('SELECT * FROM users');
    return NextResponse.json(result.rows);
  } finally {
    client.release(); // 필수: connection 반환
  }
}
```

**핵심 원칙:**

1. `pool.connect()`로 client 획득
2. `try` 블록에서 query 실행
3. `finally` 블록에서 **반드시** `client.release()` 호출

---

### 1.7 타입 정의 업데이트

**기존 타입 (SQLite)**

```typescript
import Database from 'better-sqlite3';

export type DbRow = {
  id: string;
  name: string;
  created_at: number; // SQLite는 UNIX timestamp
};
```

**새로운 타입 (Neon Postgres)**

```typescript
export type DbRow = {
  id: string;
  name: string;
  created_at: string; // Postgres는 ISO 8601 문자열
};

// Query 결과 타입 예시
export type QueryResult<T> = {
  rows: T[];
  rowCount: number | null;
};
```

---

### 1.8 실전 예제: Next.js API Route 전체 변환

#### Before (SQLite)

```typescript
// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(params.id);

  if (!user) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const body = await request.json();

  const updateStmt = db.prepare(
    'UPDATE users SET name = ?, email = ? WHERE id = ?'
  );
  const info = updateStmt.run(body.name, body.email, params.id);

  if (info.changes === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const selectStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const updated = selectStmt.get(params.id);

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const info = stmt.run(params.id);

  if (info.changes === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

#### After (Neon Postgres)

```typescript
// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const pool = await getDb();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [params.id]
    );
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } finally {
    client.release();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const pool = await getDb();
  const client = await pool.connect();
  const body = await request.json();

  try {
    const updateResult = await client.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3',
      [body.name, body.email, params.id]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const selectResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [params.id]
    );
    const updated = selectResult.rows[0];

    return NextResponse.json(updated);
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const pool = await getDb();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'DELETE FROM users WHERE id = $1',
      [params.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}
```

**변경 사항 요약:**

1. ✅ `getDb()` → async/await
2. ✅ `pool.connect()` + `try/finally` + `client.release()`
3. ✅ `stmt.get()` → `client.query()` + `result.rows[0]`
4. ✅ `?` → `$1, $2, $3`
5. ✅ `info.changes` → `result.rowCount`
6. ✅ `export const dynamic = 'force-dynamic'` 추가 (Next.js 14+)

---

### 1.9 환경 변수 설정

**.env 파일 생성**

```env
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
NEON_AUTH_BASE_URL=https://your-project.neonauth.region.aws.neon.tech/database/auth
NEON_AUTH_COOKIE_SECRET=your-secret-key-here
```

**`.gitignore` 확인**

```gitignore
.env
.env*.local
```

---

### 1.10 코드 마이그레이션 체크리스트

- [ ] `package.json`에서 `better-sqlite3` 제거, `@neondatabase/serverless` 추가
- [ ] `src/lib/db.ts` 파일을 Pool 기반으로 변환
- [ ] 모든 API Route를 async/await 패턴으로 변환
- [ ] `.get()` → `result.rows[0]` 변환
- [ ] `.all()` → `result.rows` 변환
- [ ] `.run()` → `client.query()` 변환
- [ ] `?` → `$1, $2, $3` 파라미터 변환
- [ ] `info.changes` → `result.rowCount` 변환
- [ ] 모든 query에 `try/finally` + `client.release()` 추가
- [ ] `.env` 파일 생성 및 `DATABASE_URL` 설정
- [ ] TypeScript 타입 정의 업데이트 (`created_at` 등)
- [ ] `pnpm install` 실행
- [ ] `pnpm typecheck` 실행하여 에러 확인

---

## Part 2: 데이터 마이그레이션

### 2.1 사전 준비

#### 필수 도구

- SQLite 원본 파일 (예: `data/myapp.db`)
- Neon `DATABASE_URL`
- 로컬 CLI
  - `sqlite3`
  - `psql`

#### 안전 장치

- Neon 쪽 기존 데이터 백업/브랜치 생성
- import 전 대상 테이블 row count 기록

---

### 2.2 스키마 분석

**당신의 프로젝트 스키마 확인:**

```bash
sqlite3 data/myapp.db ".schema"
```

**외래키(FK) 관계 파악:**

예시:
- `users` (부모 테이블)
- `posts` (FK: `user_id` → `users.id`)
- `comments` (FK: `post_id` → `posts.id`)

**Import 순서:** 부모 테이블 → 자식 테이블 (FK 무결성 유지)

---

### 2.3 SQLite 데이터 Export

**일반 템플릿:**

```bash
mkdir -p migration_export

sqlite3 ./data/myapp.db <<'SQL'
.headers on
.mode csv
.once migration_export/table1.csv
SELECT id, name, email, created_at FROM table1;

.once migration_export/table2.csv
SELECT id, table1_id, content, created_at FROM table2;

.once migration_export/table3.csv
SELECT id, table2_id, text, created_at FROM table3;
SQL
```

**검증:**

```bash
ls -la migration_export
head -n 3 migration_export/table1.csv
```

**주의사항:**

- Boolean 컬럼: SQLite는 `0/1`, Postgres는 `false/true` (변환 필요할 수 있음)
- Timestamp 컬럼: SQLite는 UNIX timestamp, Postgres는 ISO 8601 문자열 (변환 필요할 수 있음)

---

### 2.4 Neon 스키마 준비

**방식 A (권장): 앱으로 자동 생성**

1. `.env`에 `DATABASE_URL`, Auth env 설정
2. `pnpm dev`
3. 로그인 후 앱 진입
4. 초기화 로직(`initSchema()`)이 실행되며 스키마 생성

**방식 B: SQL Editor에서 수동 생성**

`src/lib/schema.ts`의 DDL을 Neon SQL Editor에서 실행.

---

### 2.5 Neon 기존 데이터 정리 (필요 시)

마이그레이션 전 초기화:

```bash
psql "$DATABASE_URL" <<'SQL'
BEGIN;
DELETE FROM table3;  -- FK 순서 역순으로 삭제
DELETE FROM table2;
DELETE FROM table1;
COMMIT;
SQL
```

---

### 2.6 CSV Import (FK 순서 필수)

**순서:** 부모 테이블 → 자식 테이블

```bash
psql "$DATABASE_URL" -c "\\copy table1(id, name, email, created_at) FROM 'migration_export/table1.csv' WITH (FORMAT csv, HEADER true)"

psql "$DATABASE_URL" -c "\\copy table2(id, table1_id, content, created_at) FROM 'migration_export/table2.csv' WITH (FORMAT csv, HEADER true)"

psql "$DATABASE_URL" -c "\\copy table3(id, table2_id, text, created_at) FROM 'migration_export/table3.csv' WITH (FORMAT csv, HEADER true)"
```

**`created_at` 컬럼이 원본에 없으면:**

CSV export/import에서 `created_at`을 제외하면 Postgres `DEFAULT NOW()`가 적용됨.

---

### 2.7 검증 SQL

**Row count 확인:**

```sql
SELECT 'table1' AS table_name, COUNT(*) FROM table1
UNION ALL
SELECT 'table2', COUNT(*) FROM table2
UNION ALL
SELECT 'table3', COUNT(*) FROM table3;
```

**FK 무결성 점검:**

```sql
-- table2의 orphan rows 확인
SELECT COUNT(*) AS orphan_table2
FROM table2 t2
LEFT JOIN table1 t1 ON t1.id = t2.table1_id
WHERE t2.table1_id IS NOT NULL AND t1.id IS NULL;

-- table3의 orphan rows 확인
SELECT COUNT(*) AS orphan_table3
FROM table3 t3
LEFT JOIN table2 t2 ON t2.id = t3.table2_id
WHERE t3.table2_id IS NOT NULL AND t2.id IS NULL;
```

**정상 조건:**

- 모든 orphan count = 0

---

## Part 3: 검증 및 배포

### 3.1 로컬 검증

```bash
pnpm install
pnpm typecheck
pnpm run build
pnpm dev
```

**브라우저 확인:**

1. 로그인 (Neon Auth 사용하는 경우)
2. 대시보드에서 기존 데이터 노출 확인
3. 생성/수정/삭제 API 동작 확인

---

### 3.2 Vercel 배포

**환경 변수 설정 (Vercel Dashboard)**

- `DATABASE_URL` = `postgresql://...`
- `NEON_AUTH_BASE_URL` = `https://...`
- `NEON_AUTH_COOKIE_SECRET` = `...`

**Neon Auth Trusted Domains 등록**

- Production 도메인: `your-app.vercel.app`
- Preview 도메인: `*.vercel.app` (와일드카드)

**배포:**

```bash
git add .
git commit -m "feat: migrate from SQLite to Neon Postgres"
git push
```

Vercel이 자동으로 빌드 및 배포.

---

## Part 4: Troubleshooting

### 4.1 `Invalid origin` (Neon Auth)

**원인:**

- Neon Auth Trusted Domains에 도메인 미등록

**해결:**

1. Neon Console > Auth > Trusted Domains
2. Production + Preview 도메인 추가
3. Redeploy

---

### 4.2 `NEON_AUTH_COOKIE_SECRET is not set`

**원인:**

- Vercel 환경 변수 누락
- 저장 후 Redeploy 안 함

**해결:**

1. Vercel Dashboard > Settings > Environment Variables
2. `NEON_AUTH_COOKIE_SECRET` 추가
3. Redeploy

---

### 4.3 `ERR_PNPM_OUTDATED_LOCKFILE`

**원인:**

- lockfile 미동기화

**해결:**

```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update pnpm lockfile"
```

---

### 4.4 `CHECK constraint` 실패

**원인:**

- Enum 타입 컬럼에 허용되지 않은 값 존재

**해결:**

1. CSV export 후 값 검증
2. 허용값으로 변환 (예: `sed`, Python script)
3. 재import

---

### 4.5 TypeScript 에러: `Cannot find module '@neondatabase/serverless'`

**원인:**

- 패키지 설치 안 됨

**해결:**

```bash
pnpm install
```

---

### 4.6 Vercel: `No Output Directory named 'public' found`

**원인:**

- Next.js 프로젝트에 `public/` 디렉토리 없음

**해결:**

```bash
mkdir -p public
touch public/.gitkeep
git add public/.gitkeep
git commit -m "fix: add public directory"
git push
```

---

### 4.7 데이터가 비어있거나 시드 데이터가 계속 나타남

**원인:**

- `src/lib/db.ts`의 `seedIfEmpty()` 자동 실행

**해결:**

`src/lib/db.ts`에서 주석 처리:

```typescript
export async function getDb() {
  if (!initialized) {
    const client = await pool.connect();
    try {
      await initSchema(client);
      // await seedIfEmpty(client); // 주석 처리
      initialized = true;
    } finally {
      client.release();
    }
  }
  return pool;
}
```

---

### 4.8 롤백

**가장 안전:**

- Neon branch/backup에서 복구

**또는:**

- import 전 백업 CSV/덤프 재적용

---

## 부록: 빠른 참조 (Quick Reference)

### 코드 변환 요약표

| 작업 | SQLite | Neon Postgres |
|------|--------|---------------|
| 단일 row 조회 | `db.prepare('... ?').get(value)` | `await client.query('... $1', [value]); result.rows[0]` |
| 여러 rows 조회 | `db.prepare('... ?').all(value)` | `await client.query('... $1', [value]); result.rows` |
| INSERT/UPDATE | `db.prepare('...').run(...)` | `await client.query('...', [...])` |
| 영향받은 row 수 | `info.changes` | `result.rowCount` |
| 파라미터 | `?` | `$1, $2, $3` |

### 체크리스트

**코드 마이그레이션:**

- [ ] Package 교체 (`better-sqlite3` → `@neondatabase/serverless`)
- [ ] `src/lib/db.ts` Pool 기반으로 변환
- [ ] 모든 API를 async/await로 변환
- [ ] `.get()/.all()/.run()` → `client.query()` 변환
- [ ] `?` → `$1, $2, $3` 변환
- [ ] Connection pool 관리 (`try/finally` + `client.release()`)
- [ ] `.env` 파일 생성 및 `DATABASE_URL` 설정
- [ ] TypeScript 타입 정의 업데이트
- [ ] `pnpm install` + `pnpm typecheck` 실행

**데이터 마이그레이션:**

- [ ] FK 관계 파악
- [ ] CSV export (부모 → 자식 순서)
- [ ] Neon 스키마 준비
- [ ] 기존 데이터 정리 (필요 시)
- [ ] CSV import (부모 → 자식 순서)
- [ ] Row count 검증
- [ ] FK 무결성 검증

**배포:**

- [ ] 로컬 테스트 (`pnpm dev`)
- [ ] Vercel 환경 변수 설정
- [ ] Neon Auth Trusted Domains 등록
- [ ] Git push + Vercel 배포
- [ ] Production 동작 확인

---

**참고:**

- 빠른 전체 흐름 가이드는 별도 `neondb_login.md` 참조
- 이 문서는 재사용 가능한 **전역 skill**로 설계됨
