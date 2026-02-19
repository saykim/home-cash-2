import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { toPaymentMethod, toBenefitTier } from "@/lib/mappers";
import { requireAuth } from "@/lib/auth/require-auth";
import type { PaymentMethodRow, BenefitTierRow } from "@/types";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const pool = await getDb();
  const client = await pool.connect();

  try {
    const methodsRes = await client.query(
      "SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY created_at",
    );
    const rows = methodsRes.rows as PaymentMethodRow[];
    const methods = rows.map(toPaymentMethod);

    const tiersRes = await client.query(
      "SELECT * FROM benefit_tiers ORDER BY sort_order",
    );
    const tierRows = tiersRes.rows as BenefitTierRow[];
    const tiers = tierRows.map(toBenefitTier);

    const result = methods.map((m) => ({
      ...m,
      benefitTiers: tiers.filter((t) => t.paymentMethodId === m.id),
    }));

    return NextResponse.json(result);
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
  const { name, type, billingDay, performanceStartDay, color } = body;

  if (!name || !type) {
    return NextResponse.json(
      { error: "name and type are required" },
      { status: 400 },
    );
  }

  const pool = await getDb();
  const client = await pool.connect();
  const id = uuid();

  try {
    await client.query(
      `
      INSERT INTO payment_methods (id, name, type, billing_day, performance_start_day, color)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [id, name, type, billingDay ?? null, performanceStartDay ?? 1, color ?? null],
    );

    const res = await client.query(
      "SELECT * FROM payment_methods WHERE id = $1",
      [id],
    );
    const row = res.rows[0] as PaymentMethodRow;

    return NextResponse.json(
      { ...toPaymentMethod(row), benefitTiers: [] },
      { status: 201 },
    );
  } finally {
    client.release();
  }
}
