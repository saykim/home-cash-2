import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getDb } from "@/lib/db";
import { toTransaction } from "@/lib/mappers";
import type { TransactionRow } from "@/types";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const pool = await getDb();
  const client = await pool.connect();

  try {
    const result = await client.query(
      "DELETE FROM transactions WHERE id = $1",
      [params.id],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as {
    paymentMethodId?: string | null;
    transactionDate?: string;
    amount?: number;
    category?: string | null;
    memo?: string | null;
    isInstallment?: boolean;
    installmentMonths?: number;
    excludeFromBilling?: boolean;
    excludeFromPerformance?: boolean;
  };

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

  try {
    const result = await client.query(
      `
      UPDATE transactions
      SET payment_method_id = $1,
          transaction_date = $2,
          amount = $3,
          category = $4,
          memo = $5,
          is_installment = $6,
          installment_months = $7,
          exclude_from_billing = $8,
          exclude_from_performance = $9
      WHERE id = $10
    `,
      [
        paymentMethodId ?? null,
        transactionDate,
        amount,
        category ?? null,
        memo ?? null,
        isInstallment ? 1 : 0,
        installmentMonths ?? 1,
        excludeFromBilling ? 1 : 0,
        excludeFromPerformance ? 1 : 0,
        params.id,
      ],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const fetchResult = await client.query(
      `
      SELECT t.*, pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.id = $1
    `,
      [params.id],
    );

    if (fetchResult.rowCount === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const row = fetchResult.rows[0] as TransactionRow & {
      payment_method_name?: string;
    };
    return NextResponse.json(toTransaction(row));
  } finally {
    client.release();
  }
}
