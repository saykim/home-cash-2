import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { toTransaction } from "@/lib/mappers";
import type { TransactionRow } from "@/types";
import { v4 as uuid } from "uuid";

/** 거래일이 어느 청구월(YYYY-MM)에 속하는지 계산 */
function calcBillingMonthKey(transactionDate: string, startDay: number): string {
  const txDay = parseInt(transactionDate.slice(8, 10), 10);
  const txYearMonth = transactionDate.slice(0, 7); // YYYY-MM

  if (startDay <= 1) return txYearMonth;

  // startDay=15인 경우: 거래일 >= 15 → 다음 달 청구, 거래일 < 15 → 이번 달 청구
  if (txDay >= startDay) {
    const [y, m] = txYearMonth.split('-').map(Number);
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    return `${nextY}-${String(nextM).padStart(2, '0')}`;
  }
  return txYearMonth;
}

/** 전월의 특정 일자를 YYYY-MM-DD 형식으로 반환 */
function getPrevMonthDateKey(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number);
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  return `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const search = searchParams.get("search")?.trim() ?? "";
  const category = searchParams.get("category");
  const paymentMethodId = searchParams.get("paymentMethodId");
  const performance = searchParams.get("performance") ?? "all";
  const billingMode = searchParams.get("billingMode") === "true";
  const paymentMethodsJson = searchParams.get("paymentMethodsJson");

  // billingMode 시 신용카드 정보 파싱
  type CreditMethodInfo = { id: string; performanceStartDay: number };
  let creditMethods: CreditMethodInfo[] = [];
  if (billingMode && paymentMethodsJson) {
    try {
      const parsed = JSON.parse(paymentMethodsJson) as unknown;
      if (Array.isArray(parsed)) {
        creditMethods = (parsed as CreditMethodInfo[]).filter(
          (item) => typeof item.id === 'string' && typeof item.performanceStartDay === 'number'
        );
      }
    } catch {
      // 파싱 실패 시 creditMethods는 빈 배열
    }
  }

  const pool = await getDb();
  const client = await pool.connect();

  try {
    const where: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (month) {
      if (billingMode && creditMethods.some((pm) => pm.performanceStartDay > 1)) {
        // 청구 기준: 전월 startDay일부터 당월 말일까지 범위 확장
        const minStartDay = Math.min(...creditMethods.map((pm) => pm.performanceStartDay));
        const dateStart = getPrevMonthDateKey(month, minStartDay);
        const [y, m] = month.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate(); // 당월 말일
        const dateEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
        where.push(`t.transaction_date >= $${paramIndex++}`);
        params.push(dateStart);
        where.push(`t.transaction_date <= $${paramIndex++}`);
        params.push(dateEnd);
      } else {
        where.push(`t.transaction_date LIKE $${paramIndex++} || '%'`);
        params.push(month);
      }
    }

    if (search) {
      where.push(
        `(COALESCE(t.memo, '') LIKE $${paramIndex} OR COALESCE(t.category, '') LIKE $${paramIndex} OR COALESCE(pm.name, '') LIKE $${paramIndex})`,
      );
      const keyword = `%${search}%`;
      params.push(keyword);
      paramIndex++;
    }

    if (category && category !== "all") {
      where.push(`t.category = $${paramIndex++}`);
      params.push(category);
    }

    if (paymentMethodId && paymentMethodId !== "all") {
      where.push(`t.payment_method_id = $${paramIndex++}`);
      params.push(paymentMethodId);
    }

    if (performance === "included") {
      where.push("t.exclude_from_performance = 0");
    } else if (performance === "excluded") {
      where.push("t.exclude_from_performance = 1");
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `
      SELECT t.*, pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      ${whereClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT $${paramIndex}
    `;
    params.push(limit);

    const result = await client.query(sql, params);
    const rows = result.rows as (TransactionRow & {
      payment_method_name?: string;
    })[];

    const mappedRows = rows.map((row) => {
      if (!billingMode) return toTransaction(row);
      const pm = creditMethods.find((m) => m.id === row.payment_method_id);
      const billingMonthKey = pm
        ? calcBillingMonthKey(row.transaction_date, pm.performanceStartDay)
        : row.transaction_date.slice(0, 7);
      return toTransaction({ ...row, billing_month_key: billingMonthKey });
    });

    return NextResponse.json(mappedRows);
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const body = await request.json();
  const {
    paymentMethodId,
    transactionDate,
    amount,
    category,
    memo,
    isInstallment,
    installmentMonths,
    excludeFromBilling,
    excludeFromPerformance,
  } = body;

  if (!transactionDate || amount === undefined) {
    return NextResponse.json(
      { error: "transactionDate and amount required" },
      { status: 400 },
    );
  }

  const pool = await getDb();
  const client = await pool.connect();
  const id = uuid();

  try {
    await client.query(
      `
      INSERT INTO transactions (id, payment_method_id, transaction_date, amount, category, memo,
        is_installment, installment_months, exclude_from_billing, exclude_from_performance)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
      [
        id,
        paymentMethodId ?? null,
        transactionDate,
        amount,
        category ?? null,
        memo ?? null,
        isInstallment ? 1 : 0,
        installmentMonths ?? 1,
        excludeFromBilling ? 1 : 0,
        excludeFromPerformance ? 1 : 0,
      ],
    );

    const res = await client.query(
      `
      SELECT t.*, pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.id = $1
    `,
      [id],
    );

    const row = res.rows[0] as TransactionRow & {
      payment_method_name?: string;
    };
    return NextResponse.json(toTransaction(row), { status: 201 });
  } finally {
    client.release();
  }
}
