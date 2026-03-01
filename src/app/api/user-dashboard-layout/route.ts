import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type DashboardSection =
  | "card-performance"
  | "monthly-trends"
  | "recent-transactions";

const DEFAULT_SECTION_ORDER: DashboardSection[] = [
  "card-performance",
  "monthly-trends",
  "recent-transactions",
];

const isDashboardSection = (value: string): value is DashboardSection =>
  value === "card-performance" ||
  value === "monthly-trends" ||
  value === "recent-transactions";

const normalizeSectionOrder = (input: unknown): DashboardSection[] => {
  if (!Array.isArray(input)) {
    return [...DEFAULT_SECTION_ORDER];
  }

  const deduped = Array.from(
    new Set(
      input.filter(
        (value): value is DashboardSection =>
          typeof value === "string" && isDashboardSection(value),
      ),
    ),
  );

  const missing = DEFAULT_SECTION_ORDER.filter(
    (value) => !deduped.includes(value),
  );
  return [...deduped, ...missing];
};

async function getCurrentUserId(): Promise<string | null> {
  const auth = getAuth();
  if (!auth) {
    return null;
  }

  const { data: session, error } = await auth.getSession();
  if (error || !session?.user?.id) {
    return null;
  }

  return session.user.id;
}

async function withAuth() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      status: 401 as const,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { status: 200 as const, userId };
}

export async function GET() {
  const authCheck = await withAuth();
  if (authCheck.status !== 200) {
    return authCheck.response;
  }

  const { userId } = authCheck;
  const pool = await getDb();
  const client = await pool.connect();

  try {
    const res = await client.query(
      "SELECT section_order, enable_carry_over FROM user_dashboard_layouts WHERE user_id = $1",
      [userId],
    );

    const row = res.rows[0];
    const sectionOrder = row?.section_order
      ? normalizeSectionOrder(row.section_order)
      : [...DEFAULT_SECTION_ORDER];
    const enableCarryOver = row?.enable_carry_over !== 0;

    return NextResponse.json({ sectionOrder, enableCarryOver });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const authCheck = await withAuth();
  if (authCheck.status !== 200) {
    return authCheck.response;
  }

  const { userId } = authCheck;
  const body = await request.json().catch(() => null);
  const sectionOrder = normalizeSectionOrder(body?.sectionOrder);

  if (
    !Array.isArray(body?.sectionOrder) ||
    sectionOrder.length !== DEFAULT_SECTION_ORDER.length
  ) {
    return NextResponse.json(
      { error: "sectionOrder must contain all sections exactly once" },
      { status: 400 },
    );
  }

  const isComplete = DEFAULT_SECTION_ORDER.every((section) =>
    sectionOrder.includes(section),
  );
  const isOnlyKnownSections = sectionOrder.every((section) =>
    isDashboardSection(section),
  );

  if (
    !isComplete ||
    !isOnlyKnownSections ||
    new Set(sectionOrder).size !== sectionOrder.length
  ) {
    return NextResponse.json(
      { error: "sectionOrder must contain all sections without duplicates" },
      { status: 400 },
    );
  }

  const pool = await getDb();
  const client = await pool.connect();

  try {
    // enableCarryOver 가 요청에 포함되면 함께 업데이트
    const enableCarryOverRaw = body?.enableCarryOver;
    const enableCarryOver = enableCarryOverRaw === false ? 0 : 1;

    await client.query(
      `INSERT INTO user_dashboard_layouts (user_id, section_order, enable_carry_over, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET section_order = EXCLUDED.section_order,
             enable_carry_over = EXCLUDED.enable_carry_over,
             updated_at = NOW()`,
      [userId, sectionOrder, enableCarryOver],
    );

    return NextResponse.json({
      sectionOrder,
      enableCarryOver: enableCarryOver === 1,
    });
  } finally {
    client.release();
  }
}
