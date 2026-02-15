import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { toBenefitTier } from '@/lib/mappers';
import type { BenefitTierRow } from '@/types';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const pool = await getDb();
  const client = await pool.connect();

  try {
    const existingRes = await client.query(
      'SELECT * FROM benefit_tiers WHERE id = $1',
      [params.id]
    );
    const existing = existingRes.rows[0] as BenefitTierRow | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const thresholdAmount = body.thresholdAmount ?? existing.threshold_amount;
    const benefitDesc = body.benefitDesc ?? existing.benefit_desc;
    const sortOrder = body.sortOrder ?? existing.sort_order;

    await client.query(
      'UPDATE benefit_tiers SET threshold_amount = $1, benefit_desc = $2, sort_order = $3 WHERE id = $4',
      [thresholdAmount, benefitDesc, sortOrder, params.id]
    );

    const updatedRes = await client.query(
      'SELECT * FROM benefit_tiers WHERE id = $1',
      [params.id]
    );
    const updated = updatedRes.rows[0] as BenefitTierRow;
    return NextResponse.json(toBenefitTier(updated));
  } finally {
    client.release();
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const pool = await getDb();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'DELETE FROM benefit_tiers WHERE id = $1',
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
