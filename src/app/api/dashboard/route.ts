import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { toBenefitTier } from "@/lib/mappers";
import { requireAuth } from "@/lib/auth/require-auth";
import type {
  CashflowSummary,
  CardPerformance,
  BenefitTierRow,
  PaymentMethodType,
} from "@/types";

export const dynamic = "force-dynamic";

interface PaymentMethodPerformanceRow {
  id: string;
  name: string;
  type: PaymentMethodType;
  billing_day: number | null;
  performance_start_day: number | null;
}

interface PerformanceTransactionRow {
  id: string;
  payment_method_id: string | null;
  transaction_date: string;
  amount: number;
  category: string | null;
  memo: string | null;
  exclude_from_performance: number;
}

const DEFAULT_PERFORMANCE_START_DAY = 1;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const isValidMonthKey = (value: string) => {
  if (!MONTH_PATTERN.test(value)) {
    return false;
  }
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
};

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const parseMonthKey = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return { year, month };
};

const getDaysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const clampDay = (day: number | null | undefined, fallback = DEFAULT_PERFORMANCE_START_DAY) => {
  const parsed = Number(day);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.round(parsed), 1), 31);
};

const getPreviousMonth = (year: number, month: number) =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

const getMonthRange = (year: number, month: number) => {
  const daysInMonth = getDaysInMonth(year, month);
  return {
    start: toDateKey(year, month, 1),
    end: toDateKey(year, month, daysInMonth),
  };
};

const getPerformanceWindow = (year: number, month: number, performanceStartDay: number) => {
  const previousMonth = getPreviousMonth(year, month);
  const safeStartDay = clampDay(performanceStartDay);
  const previousMonthDay = Math.min(
    safeStartDay,
    getDaysInMonth(previousMonth.year, previousMonth.month),
  );
  const currentAnchorDay = Math.min(safeStartDay, getDaysInMonth(year, month));
  const currentAnchorDate = new Date(
    Date.UTC(year, month - 1, currentAnchorDay),
  );
  const endDate = new Date(currentAnchorDate.getTime() - ONE_DAY_MS);

  return {
    start: toDateKey(previousMonth.year, previousMonth.month, previousMonthDay),
    end: endDate.toISOString().slice(0, 10),
    startDay: safeStartDay,
  };
};

/**
 * 오늘 날짜와 카드 실적 시작일을 비교하여 getPerformanceWindow()에 넘길 기준 월을 결정.
 * - 오늘이 startDay 미만: 이번 달 실적 기간이 아직 시작 전 → 현재 월 기준
 * - 오늘이 startDay 이상: 이번 달 새 실적 기간이 시작됨 → 다음 달 기준
 */
const resolvePerformanceMonth = (
  today: Date,
  performanceStartDay: number,
): { year: number; month: number } => {
  const todayDay = today.getDate();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  if (todayDay < performanceStartDay) {
    return { year: todayYear, month: todayMonth };
  }
  if (todayMonth === 12) {
    return { year: todayYear + 1, month: 1 };
  }
  return { year: todayYear, month: todayMonth + 1 };
};

export async function GET(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const monthParam = searchParams.get("month");
  const month = monthParam && isValidMonthKey(monthParam)
    ? monthParam
    : toMonthKey(now);
  const { year, month: monthNumber } = parseMonthKey(month);

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
      income: Number(cashflowRow.income) || 0,
      expense: Number(cashflowRow.expense) || 0,
      balance: Number(cashflowRow.balance) || 0,
    };

    const methodsRes = await client.query(
      `
      SELECT id, name, type, billing_day, performance_start_day
      FROM payment_methods
      WHERE is_active = 1
      ORDER BY created_at ASC
    `,
    );
    const methodRows = methodsRes.rows as PaymentMethodPerformanceRow[];

    const tiersRes = await client.query(
      "SELECT * FROM benefit_tiers ORDER BY sort_order",
    );
    const allTierRows = tiersRes.rows as BenefitTierRow[];

    const previousMonth = getPreviousMonth(year, monthNumber);
    const previousMonthRange = getMonthRange(previousMonth.year, previousMonth.month);
    const monthRange = getMonthRange(year, monthNumber);
    const nextMonthYear = monthNumber === 12 ? year + 1 : year;
    const nextMonthNum = monthNumber === 12 ? 1 : monthNumber + 1;
    const nextMonthRange = getMonthRange(nextMonthYear, nextMonthNum);
    const transactionRes = await client.query(
      `
      SELECT
        id,
        payment_method_id,
        transaction_date,
        amount,
        category,
        memo,
        exclude_from_performance
      FROM transactions
      WHERE payment_method_id IS NOT NULL
        AND amount < 0
        AND transaction_date >= $1
        AND transaction_date <= $2
      ORDER BY transaction_date DESC, created_at DESC
    `,
      [previousMonthRange.start, nextMonthRange.end],
    );
    const transactionRows = transactionRes.rows as PerformanceTransactionRow[];

    const transactionsByPaymentMethod = new Map<string, PerformanceTransactionRow[]>();
    for (const tx of transactionRows) {
      if (!tx.payment_method_id) {
        continue;
      }
      const list = transactionsByPaymentMethod.get(tx.payment_method_id) ?? [];
      list.push(tx);
      transactionsByPaymentMethod.set(tx.payment_method_id, list);
    }

    const cardPerformances: CardPerformance[] = methodRows.map((methodRow) => {
      const startDay = clampDay(methodRow.performance_start_day);
      const performanceWindow = methodRow.type === "CREDIT"
        ? (() => {
            const perfMonth = resolvePerformanceMonth(now, startDay);
            return getPerformanceWindow(perfMonth.year, perfMonth.month, startDay);
          })()
        : {
          start: monthRange.start,
          end: monthRange.end,
          startDay: DEFAULT_PERFORMANCE_START_DAY,
        };

      const candidateTransactions =
        transactionsByPaymentMethod.get(methodRow.id) ?? [];
      const usageTransactions = candidateTransactions
        .filter((tx) => {
          if (
            tx.transaction_date < performanceWindow.start ||
            tx.transaction_date > performanceWindow.end
          ) {
            return false;
          }
          if (
            methodRow.type === "CREDIT" &&
            tx.exclude_from_performance === 1
          ) {
            return false;
          }
          return true;
        })
        .map((tx) => ({
          id: tx.id,
          transactionDate: tx.transaction_date,
          amount: Math.abs(Number(tx.amount) || 0),
          category: tx.category,
          memo: tx.memo,
        }));

      const currentPerformance = usageTransactions.reduce(
        (sum, tx) => sum + tx.amount,
        0,
      );
      const tiers = allTierRows
        .filter((tier) => tier.payment_method_id === methodRow.id)
        .map((tier) => ({
          ...toBenefitTier(tier),
          achieved: currentPerformance >= tier.threshold_amount,
        }));

      const nextTier = tiers.find((tier) => !tier.achieved);
      const nextTierRemaining = nextTier
        ? nextTier.thresholdAmount - currentPerformance
        : null;

      return {
        paymentMethodId: methodRow.id,
        cardName: methodRow.name,
        paymentMethodType: methodRow.type,
        billingDay: methodRow.billing_day,
        performanceStartDay: performanceWindow.startDay,
        performancePeriodStart: performanceWindow.start,
        performancePeriodEnd: performanceWindow.end,
        currentPerformance,
        usageTransactions,
        tiers,
        nextTierRemaining,
      };
    });

    return NextResponse.json({ cashflow, cardPerformances });
  } finally {
    client.release();
  }
}
