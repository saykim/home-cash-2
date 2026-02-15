import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { toPaymentMethod } from '@/lib/mappers';
import type { PaymentMethodRow } from '@/types';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const pool = await getDb();
  const client = await pool.connect();

  try {
    const existingRes = await client.query(
      'SELECT * FROM payment_methods WHERE id = $1',
      [params.id]
    );
    const existing = existingRes.rows[0] as PaymentMethodRow | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const name = body.name ?? existing.name;
    const type = body.type ?? existing.type;
    const billingDay = body.billingDay !== undefined ? body.billingDay : existing.billing_day;
    const performanceStartDay = body.performanceStartDay ?? existing.performance_start_day;

    await client.query(
      `UPDATE payment_methods SET name = $1, type = $2, billing_day = $3, performance_start_day = $4 WHERE id = $5`,
      [name, type, billingDay, performanceStartDay, params.id]
    );

    const updatedRes = await client.query(
      'SELECT * FROM payment_methods WHERE id = $1',
      [params.id]
    );
    const updated = updatedRes.rows[0] as PaymentMethodRow;
    return NextResponse.json(toPaymentMethod(updated));
  } finally {
    client.release();
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const pool = await getDb();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'DELETE FROM payment_methods WHERE id = $1',
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
