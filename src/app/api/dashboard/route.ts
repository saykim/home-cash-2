import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { toBenefitTier } from "@/lib/mappers";
import type { CashflowSummary, CardPerformance, BenefitTierRow } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month =
    searchParams.get("month") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const pool = await getDb();
  const client = await pool.connect();

  try {
    const cashflowRes = await client.query(
      `
      SELECT
        $1::text as month,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as expense,
        COALESCE(SUM(amount), 0) as balance
      FROM transactions
      WHERE transaction_date LIKE $1 || '%'
        AND exclude_from_billing = 0
    `,
      [month],
    );

    const cashflowRow = cashflowRes.rows[0];

    const cashflow: CashflowSummary = {
      month: cashflowRow.month,
      income: parseInt(cashflowRow.income),
      expense: parseInt(cashflowRow.expense),
      balance: parseInt(cashflowRow.balance),
    };

    const perfRes = await client.query(
      `
      SELECT
        pm.id as payment_method_id,
        pm.name as payment_method_name,
        pm.type as payment_method_type,
        pm.billing_day,
        COALESCE(SUM(CASE
          WHEN t.amount < 0 AND (pm.type != 'CREDIT' OR t.exclude_from_performance = 0)
          THEN ABS(t.amount)
          ELSE 0
        END), 0) as current_performance
      FROM payment_methods pm
      LEFT JOIN transactions t ON t.payment_method_id = pm.id
        AND t.transaction_date LIKE $1 || '%'
      WHERE pm.is_active = 1
      GROUP BY pm.id, pm.name, pm.type, pm.billing_day
      ORDER BY pm.created_at ASC
    `,
      [month],
    );

    const perfRows = perfRes.rows;

    const tiersRes = await client.query(
      "SELECT * FROM benefit_tiers ORDER BY sort_order",
    );
    const allTierRows = tiersRes.rows as BenefitTierRow[];

    const cardPerformances: CardPerformance[] = perfRows.map((row) => {
      const currentPerformance = parseInt(row.current_performance);
      const tiers = allTierRows
        .filter((t) => t.payment_method_id === row.payment_method_id)
        .map((t) => ({
          ...toBenefitTier(t),
          achieved: currentPerformance >= t.threshold_amount,
        }));

      const nextTier = tiers.find((t) => !t.achieved);
      const nextTierRemaining = nextTier
        ? nextTier.thresholdAmount - currentPerformance
        : null;

      return {
        paymentMethodId: row.payment_method_id,
        cardName: row.payment_method_name,
        paymentMethodType: row.payment_method_type,
        billingDay: row.billing_day,
        currentPerformance,
        tiers,
        nextTierRemaining,
      };
    });

    return NextResponse.json({ cashflow, cardPerformances });
  } finally {
    client.release();
  }
}
