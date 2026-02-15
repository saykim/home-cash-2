import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getDb } from "@/lib/db";

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
