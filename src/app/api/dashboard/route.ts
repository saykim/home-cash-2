import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { toBenefitTier } from "@/lib/mappers";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAuth } from "@/lib/auth/server";
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
  exclude_from_billing: number;
}

const DEFAULT_PERFORMANCE_START_DAY = 1;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function getCurrentUserId(): Promise<string | null> {
  const auth = getAuth();
  if (!auth) return null;
  const { data: session, error } = await auth.getSession();
  if (error || !session?.user?.id) return null;
  return session.user.id;
}

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

const clampDay = (
  day: number | null | undefined,
  fallback = DEFAULT_PERFORMANCE_START_DAY,
) => {
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

const getPerformanceWindow = (
  year: number,
  month: number,
  performanceStartDay: number,
) => {
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

/** 실적 기간 종료일 기준으로 해당 기간의 결제가 어느 월에 이루어지는지 계산 */
const getBillingMonthKey = (
  perfWindowEnd: string,
  billingDay: number,
): string => {
  const [endYear, endMonth, endDay] = perfWindowEnd.split("-").map(Number);
  let billingYear = endYear;
  let billingMonth = endMonth;
  if (endDay >= billingDay) {
    billingMonth += 1;
    if (billingMonth > 12) {
      billingMonth = 1;
      billingYear += 1;
    }
  }
  return `${billingYear}-${String(billingMonth).padStart(2, "0")}`;
};

export async function GET(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const monthParam = searchParams.get("month");
  const month =
    monthParam && isValidMonthKey(monthParam) ? monthParam : toMonthKey(now);
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

    // ── 이월잔액 ──
    const userId = await getCurrentUserId();
    let enableCarryOver = true;
    if (userId) {
      const settingsRes = await client.query(
        "SELECT enable_carry_over FROM user_dashboard_layouts WHERE user_id = $1",
        [userId],
      );
      if (settingsRes.rows[0]?.enable_carry_over === 0) {
        enableCarryOver = false;
      }
    }

    let carryOver = 0;
    if (enableCarryOver) {
      const coRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as carry_over
         FROM transactions
         WHERE transaction_date < $1
           AND exclude_from_billing = 0`,
        [`${month}-01`],
      );
      carryOver = Number(coRes.rows[0].carry_over) || 0;
    }

    const cashflow: CashflowSummary = {
      month: cashflowRow.month,
      income: Number(cashflowRow.income) || 0,
      expense: Number(cashflowRow.expense) || 0,
      balance: Number(cashflowRow.balance) || 0,
      carryOver,
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
    const previousMonthRange = getMonthRange(
      previousMonth.year,
      previousMonth.month,
    );
    const monthRange = getMonthRange(year, monthNumber);
    const next = getNextMonth(year, monthNumber);
    const nextMonthRange = getMonthRange(next.year, next.month);
    // 결제 창 계산을 위해 2개월 전까지 쿼리 범위 확장
    const twoMonthsAgo = getPreviousMonth(
      previousMonth.year,
      previousMonth.month,
    );
    const twoMonthsAgoRange = getMonthRange(
      twoMonthsAgo.year,
      twoMonthsAgo.month,
    );
    const transactionRes = await client.query(
      `
      SELECT
        id,
        payment_method_id,
        transaction_date,
        amount,
        category,
        memo,
        exclude_from_performance,
        exclude_from_billing
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

    const transactionsByPaymentMethod = new Map<
      string,
      PerformanceTransactionRow[]
    >();
    for (const tx of transactionRows) {
      if (!tx.payment_method_id) {
        continue;
      }
      const list = transactionsByPaymentMethod.get(tx.payment_method_id) ?? [];
      list.push(tx);
      transactionsByPaymentMethod.set(tx.payment_method_id, list);
    }

    const todayDay = now.getDate();
    const isCurrentMonth = toMonthKey(now) === month;

    const cardPerformances: CardPerformance[] = methodRows.map((methodRow) => {
      const startDay = clampDay(methodRow.performance_start_day);
      const performanceWindow =
        methodRow.type === "CREDIT"
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

      // ── 이전 실적: 결제일 전이면 포함 ──
      let previousPerformance: CardPerformance["previousPerformance"];
      if (
        isCurrentMonth &&
        methodRow.type === "CREDIT" &&
        methodRow.billing_day &&
        todayDay < methodRow.billing_day
      ) {
        const prevWindow = getPerformanceWindow(
          previousMonth.year,
          previousMonth.month,
          startDay,
        );
        const prevTxs = candidateTransactions
          .filter(
            (tx) =>
              tx.transaction_date >= prevWindow.start &&
              tx.transaction_date <= prevWindow.end &&
              tx.exclude_from_performance !== 1,
          )
          .map((tx) => ({
            id: tx.id,
            transactionDate: tx.transaction_date,
            amount: Math.abs(Number(tx.amount) || 0),
            category: tx.category,
            memo: tx.memo,
          }));
        const prevAmount = prevTxs.reduce((s, tx) => s + tx.amount, 0);
        const prevTiers = allTierRows
          .filter((tier) => tier.payment_method_id === methodRow.id)
          .map((tier) => ({
            ...toBenefitTier(tier),
            achieved: prevAmount >= tier.threshold_amount,
          }));
        previousPerformance = {
          periodStart: prevWindow.start,
          periodEnd: prevWindow.end,
          amount: prevAmount,
          transactions: prevTxs,
          tiers: prevTiers,
        };
      }

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
        previousPerformance,
      };
    });

    // ── billing 집계: 실적기간의 결제 예정월을 정확히 계산 ──
    let currentMonthBilling = 0;
    let nextMonthBilling = 0;
    const nextMonthKey = `${next.year}-${String(next.month).padStart(2, "0")}`;

    for (const methodRow of methodRows) {
      if (methodRow.type !== "CREDIT" || !methodRow.billing_day) continue;
      const startDay = clampDay(methodRow.performance_start_day);
      const bd = clampDay(methodRow.billing_day);
      const txs = transactionsByPaymentMethod.get(methodRow.id) ?? [];

      const windows = [
        getPerformanceWindow(previousMonth.year, previousMonth.month, startDay),
        getPerformanceWindow(year, monthNumber, startDay),
        getPerformanceWindow(next.year, next.month, startDay),
      ];

      for (const window of windows) {
        const billingMonth = getBillingMonthKey(window.end, bd);
        const windowTotal = txs
          .filter(
            (tx) =>
              tx.transaction_date >= window.start &&
              tx.transaction_date <= window.end &&
              tx.exclude_from_billing !== 1,
          )
          .reduce((s, tx) => s + Math.abs(Number(tx.amount) || 0), 0);

        if (billingMonth === month) {
          currentMonthBilling += windowTotal;
        } else if (billingMonth === nextMonthKey) {
          nextMonthBilling += windowTotal;
        }
      }
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
