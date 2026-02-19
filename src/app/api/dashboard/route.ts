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

const getNextMonth = (year: number, month: number) =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

const getMonthRange = (year: number, month: number) => {
  const daysInMonth = getDaysInMonth(year, month);
  return {
    start: toDateKey(year, month, 1),
    end: toDateKey(year, month, daysInMonth),
  };
};

const getPerformanceWindow = (year: number, month: number, performanceStartDay: number) => {
  const safeStartDay = clampDay(performanceStartDay);

  // startDay=1: 당월 1일 ~ 당월 말일
  if (safeStartDay === 1) {
    const daysInMonth = getDaysInMonth(year, month);
    return {
      start: toDateKey(year, month, 1),
      end: toDateKey(year, month, daysInMonth),
      startDay: 1,
    };
  }

  // startDay>1: 전월 startDay일 ~ 당월 (startDay-1)일
  const previousMonth = getPreviousMonth(year, month);
  const startDayClamped = Math.min(
    safeStartDay,
    getDaysInMonth(previousMonth.year, previousMonth.month),
  );
  const endDay = Math.min(safeStartDay - 1, getDaysInMonth(year, month));

  return {
    start: toDateKey(previousMonth.year, previousMonth.month, startDayClamped),
    end: toDateKey(year, month, endDay),
    startDay: safeStartDay,
  };
};

/**
 * billingDay 기준 결제 창 계산.
 * "M월 결제" = 전월 billingDay일 ~ 당월 (billingDay-1)일 사용분
 * billingDay=1: 전월 1일 ~ 전월 말일 사용분
 * billingDay=14: 전월 14일 ~ 당월 13일 사용분
 */
const getBillingWindow = (year: number, month: number, billingDay: number) => {
  const safeBillingDay = clampDay(billingDay);

  if (safeBillingDay === 1) {
    // 전월 1일 ~ 전월 말일
    const prev = getPreviousMonth(year, month);
    const daysInPrev = getDaysInMonth(prev.year, prev.month);
    return {
      start: toDateKey(prev.year, prev.month, 1),
      end: toDateKey(prev.year, prev.month, daysInPrev),
    };
  }

  // 전월 billingDay일 ~ 당월 (billingDay-1)일
  const prev = getPreviousMonth(year, month);
  const startDayClamped = Math.min(safeBillingDay, getDaysInMonth(prev.year, prev.month));
  const endDay = Math.min(safeBillingDay - 1, getDaysInMonth(year, month));

  return {
    start: toDateKey(prev.year, prev.month, startDayClamped),
    end: toDateKey(year, month, endDay),
  };
};

/* resolvePerformanceMonth 제거됨: 조회 month를 직접 사용 */

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
    const next = getNextMonth(year, monthNumber);
    const nextMonthRange = getMonthRange(next.year, next.month);
    // 결제 창 계산을 위해 2개월 전까지 쿼리 범위 확장
    const twoMonthsAgo = getPreviousMonth(previousMonth.year, previousMonth.month);
    const twoMonthsAgoRange = getMonthRange(twoMonthsAgo.year, twoMonthsAgo.month);
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
      [twoMonthsAgoRange.start, nextMonthRange.end],
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
        ? getPerformanceWindow(year, monthNumber, startDay)
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

    // ── billing 집계 (billingDay 기준 결제 창 별) ──
    const creditMethods = methodRows.filter(m => m.type === 'CREDIT' && m.billing_day);

    let currentMonthBilling = 0;
    let nextMonthBilling = 0;

    for (const method of creditMethods) {
      const bd = clampDay(method.billing_day);
      const txs = transactionsByPaymentMethod.get(method.id) ?? [];

      // 당월 결제 창
      const cmWindow = getBillingWindow(year, monthNumber, bd);
      currentMonthBilling += txs
        .filter(tx => tx.transaction_date >= cmWindow.start && tx.transaction_date <= cmWindow.end)
        .reduce((s, tx) => s + Math.abs(Number(tx.amount) || 0), 0);

      // 익월 결제 창
      const nmWindow = getBillingWindow(next.year, next.month, bd);
      nextMonthBilling += txs
        .filter(tx => tx.transaction_date >= nmWindow.start && tx.transaction_date <= nmWindow.end)
        .reduce((s, tx) => s + Math.abs(Number(tx.amount) || 0), 0);
    }

    const billingSummary = {
      currentMonth: currentMonthBilling,
      nextMonth: nextMonthBilling,
      currentMonthLabel: `${monthNumber}월 결제`,
      nextMonthLabel: `${next.month}월 결제 예정`,
    };

    return NextResponse.json({ cashflow, cardPerformances, billingSummary });
  } finally {
    client.release();
  }
}
