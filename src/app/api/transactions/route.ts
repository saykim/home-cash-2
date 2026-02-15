import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { toTransaction } from "@/lib/mappers";
import type { TransactionRow } from "@/types";
import { v4 as uuid } from "uuid";

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

  const pool = await getDb();
  const client = await pool.connect();

  try {
    const where: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (month) {
      where.push(`t.transaction_date LIKE $${paramIndex++} || '%'`);
      params.push(month);
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
    return NextResponse.json(rows.map(toTransaction));
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
