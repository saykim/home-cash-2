import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
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
