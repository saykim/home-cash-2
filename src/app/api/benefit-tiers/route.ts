import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { toBenefitTier } from '@/lib/mappers';
import type { BenefitTierRow } from '@/types';
import { v4 as uuid } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const paymentMethodId = searchParams.get('paymentMethodId');

  const pool = await getDb();
  const client = await pool.connect();

  try {
    let result;
    if (paymentMethodId) {
      result = await client.query(
        'SELECT * FROM benefit_tiers WHERE payment_method_id = $1 ORDER BY sort_order',
        [paymentMethodId]
      );
    } else {
      result = await client.query(
        'SELECT * FROM benefit_tiers ORDER BY sort_order'
      );
    }
    const rows = result.rows as BenefitTierRow[];
    return NextResponse.json(rows.map(toBenefitTier));
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
  const { paymentMethodId, thresholdAmount, benefitDesc, sortOrder } = body;

  if (!paymentMethodId || thresholdAmount === undefined || !benefitDesc) {
    return NextResponse.json({ error: 'paymentMethodId, thresholdAmount, benefitDesc required' }, { status: 400 });
  }

  const pool = await getDb();
  const client = await pool.connect();
  const id = uuid();

  try {
    await client.query(
      `INSERT INTO benefit_tiers (id, payment_method_id, threshold_amount, benefit_desc, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, paymentMethodId, thresholdAmount, benefitDesc, sortOrder ?? 0]
    );

    const result = await client.query(
      'SELECT * FROM benefit_tiers WHERE id = $1',
      [id]
    );
    const row = result.rows[0] as BenefitTierRow;
    return NextResponse.json(toBenefitTier(row), { status: 201 });
  } finally {
    client.release();
  }
}
