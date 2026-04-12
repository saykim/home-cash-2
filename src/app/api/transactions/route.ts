import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { toTransaction } from "@/lib/mappers";
import type { TransactionRow } from "@/types";
import { v4 as uuid } from "uuid";

/** 거래일이 어느 청구월(YYYY-MM)에 속하는지 계산 */
function calcBillingMonthKey(
  transactionDate: string,
  startDay: number,
  billingDay: number,
): string {
  const [txYear, txMonth, txDay] = transactionDate.split('-').map(Number);

  let windowEndYear = txYear;
  let windowEndMonth = txMonth;
  let windowEndDay: number;

  if (startDay <= 1) {
    windowEndDay = new Date(txYear, txMonth, 0).getDate();
  } else {
    if (txDay >= startDay) {
      const nextMonthDate = new Date(txYear, txMonth, 1);
      windowEndYear = nextMonthDate.getFullYear();
      windowEndMonth = nextMonthDate.getMonth() + 1;
    }
    const daysInWindowEndMonth = new Date(windowEndYear, windowEndMonth, 0).getDate();
    windowEndDay = Math.min(startDay - 1, daysInWindowEndMonth);
  }

  const daysInWinEndMonth = new Date(windowEndYear, windowEndMonth, 0).getDate();
  const clampedBillingDay = Math.min(billingDay, daysInWinEndMonth);
  let billingYear = windowEndYear;
  let billingMonth = windowEndMonth;
  if (windowEndDay >= clampedBillingDay) {
    const nextBillingMonthDate = new Date(windowEndYear, windowEndMonth, 1);
    billingYear = nextBillingMonthDate.getFullYear();
    billingMonth = nextBillingMonthDate.getMonth() + 1;
  }

  return `${billingYear}-${String(billingMonth).padStart(2, '0')}`;
}

/** 특정 월에서 offset개월 전의 특정 일자를 YYYY-MM-DD 형식으로 반환 (일수 클램핑 포함) */
function getOffsetMonthDateKey(month: string, day: number, offset: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 - offset, 1);
  const targetYear = d.getFullYear();
  const targetMonth = d.getMonth() + 1;
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const clampedDay = Math.min(day, daysInMonth);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
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
  const summaryScope = searchParams.get("summaryScope") ?? "all";
  const paymentMethodsJson = searchParams.get("paymentMethodsJson");

  // billingMode 시 신용카드 정보 파싱
  type CreditMethodInfo = {
    id: string;
    performanceStartDay: number;
    billingDay: number | null;
  };
  let creditMethods: CreditMethodInfo[] = [];
  if (billingMode && paymentMethodsJson) {
    try {
      const parsed = JSON.parse(paymentMethodsJson) as unknown;
      if (Array.isArray(parsed)) {
        creditMethods = (parsed as CreditMethodInfo[]).filter(
            (item) =>
              typeof item.id === 'string' &&
              typeof item.performanceStartDay === 'number'
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
      const isBillingScope = summaryScope === 'billingCurrent' || summaryScope === 'billingNext';

      if (isBillingScope) {
        // 결제 기준 필터: 대시보드와 동일하게 2개월 전부터 조회해야
        // billingCurrent/billingNext에 해당하는 거래를 빠짐없이 포함
        const [y, m] = month.split('-').map(Number);
        const dateStart = getOffsetMonthDateKey(month, 1, 2);
        const targetMonthOffset = summaryScope === 'billingNext' ? 1 : 0;
        const endDate = new Date(y, m - 1 + targetMonthOffset + 1, 0);
        const dateEnd = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        where.push(`t.transaction_date >= $${paramIndex++}`);
        params.push(dateStart);
        where.push(`t.transaction_date <= $${paramIndex++}`);
        params.push(dateEnd);
      } else if (billingMode && creditMethods.some((pm) => pm.performanceStartDay > 1)) {
        const minStartDay = Math.min(...creditMethods.map((pm) => pm.performanceStartDay));
        const dateStart = getOffsetMonthDateKey(month, minStartDay, 1);
        const [y, m] = month.split('-').map(Number);
        const endDate = new Date(y, m, 0);
        const dateEnd = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
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
      if (!pm || typeof pm.billingDay !== 'number') {
        return toTransaction(row);
      }
      const billingMonthKey = calcBillingMonthKey(
        row.transaction_date,
        pm.performanceStartDay,
        pm.billingDay,
      );
      return toTransaction({ ...row, billing_month_key: billingMonthKey });
    });

    const resolvedMonth = month ?? '';
    const [currentYear, currentMonthNum] = resolvedMonth.split('-').map(Number);
    const nextMonthDate = new Date(currentYear, currentMonthNum, 1);
    const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const creditMethodIds = new Set(creditMethods.map((m) => m.id));

    const filteredRows = mappedRows.filter((row) => {
      if (summaryScope === 'income') {
        return row.amount > 0;
      }
      if (summaryScope === 'expense') {
        return row.amount < 0;
      }
      if (summaryScope === 'billingCurrent') {
        return (
          row.amount < 0 &&
          !row.excludeFromBilling &&
          !!row.paymentMethodId &&
          creditMethodIds.has(row.paymentMethodId) &&
          row.billingMonthKey === resolvedMonth
        );
      }
      if (summaryScope === 'billingNext') {
        return (
          row.amount < 0 &&
          !row.excludeFromBilling &&
          !!row.paymentMethodId &&
          creditMethodIds.has(row.paymentMethodId) &&
          row.billingMonthKey === nextMonthKey
        );
      }
      return true;
    });

    return NextResponse.json(filteredRows);
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
