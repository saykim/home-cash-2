"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
  month: string;
}

interface Series {
  label: string;
  color: string;
  values: number[];
  kind: "income" | "expense";
}

interface BarSlot {
  key: string;
  x: string;
  y: string;
  width: string;
  height: string;
  color: string;
  // Added for tooltip
  value: number;
  label: string;
}

const methodPalette = [
  "#4f46e5",
  "#0284c7",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#9333ea",
  "#0f766e",
  "#ea580c",
  "#475569",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#6366f1",
];

const moneyFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

function accumulate(values: number[]): number[] {
  let running = 0;
  return values.map((value) => {
    running += value;
    return running;
  });
}

function TrendChart({
  title,
  months,
  series,
}: {
  title: string;
  months: string[];
  series: Series[];
}) {
  const [hoveredBar, setHoveredBar] = useState<BarSlot | null>(null);

  const incomeSeries = series.filter((item) => item.kind === "income");
  const expenseSeries = series.filter((item) => item.kind === "expense");
  const hasData = series.some((item) => item.values.some((value) => value > 0));
  const expenseTotalsByMonth = months.map((_, monthIndex) =>
    expenseSeries.reduce(
      (sum, item) => sum + (item.values[monthIndex] ?? 0),
      0,
    ),
  );
  const maxValue = Math.max(
    1,
    ...incomeSeries.flatMap((item) => item.values),
    ...expenseTotalsByMonth,
  );
  const safeMax = Math.max(maxValue, 1);
  const monthCount = months.length;
  const totalWidth = 100;
  const totalHeight = 56;
  const padLeft = 4;
  const padRight = 3;
  const padTop = 4;
  const padBottom = 7;
  const drawableWidth = totalWidth - padLeft - padRight;
  const drawableHeight = totalHeight - padTop - padBottom;
  const valueToY = (value: number) =>
    padTop + (drawableHeight - (value / safeMax) * drawableHeight);

  const bars: (BarSlot | null)[] =
    hasData && monthCount > 0
      ? (() => {
          const monthCellWidth = drawableWidth / monthCount;
          const groupWidth = Math.max(0.6, monthCellWidth * 0.72);
          const barWidth = Math.max(0.6, Math.min(2.8, groupWidth * 0.42));
          const barGap = Math.max(0, barWidth * 0.18);
          const hasBothSeries =
            incomeSeries.length > 0 && expenseSeries.length > 0;
          const centerShift = hasBothSeries ? (barWidth + barGap) / 2 : 0;
          const centerXForMonth = (monthIndex: number) =>
            monthCount === 1
              ? padLeft + drawableWidth / 2
              : padLeft + (monthIndex / (monthCount - 1)) * drawableWidth;

          const incomeBars = incomeSeries.flatMap((item) => {
            return item.values
              .map((value, monthIndex) => {
                if (value <= 0) {
                  return null;
                }

                const centerX = centerXForMonth(monthIndex);
                const x = hasBothSeries
                  ? centerX - centerShift - barWidth
                  : centerX - barWidth / 2;
                const barTop = valueToY(value);
                const barHeight = valueToY(0) - barTop;

                return {
                  key: `${item.label}-${monthIndex}`,
                  x: x.toFixed(2),
                  y: barTop.toFixed(2),
                  width: barWidth.toFixed(2),
                  height: barHeight.toFixed(2),
                  color: item.color,
                  value,
                  label: item.label,
                };
              })
              .filter((bar): bar is BarSlot => bar !== null);
          });

          const stackedExpenseBars = months.flatMap((_, monthIndex) => {
            const centerX = centerXForMonth(monthIndex);
            const baseX = hasBothSeries
              ? centerX + centerShift
              : centerX - barWidth / 2;
            const x = hasBothSeries ? baseX : centerX - barWidth / 2;

            let cumulativeTop = 0;

            return expenseSeries.flatMap((item) => {
              const current = item.values[monthIndex] ?? 0;
              if (current <= 0) {
                return [];
              }

              const segmentStart = cumulativeTop;
              const segmentEnd = cumulativeTop + current;
              cumulativeTop = segmentEnd;

              const yTop = valueToY(segmentEnd);
              const yBase = valueToY(segmentStart);
              const height = yBase - yTop;

              return [
                {
                  key: `${item.label}-${monthIndex}-stack`,
                  x: x.toFixed(2),
                  y: yTop.toFixed(2),
                  width: barWidth.toFixed(2),
                  height: height.toFixed(2),
                  color: item.color,
                  value: current,
                  label: item.label,
                },
              ];
            });
          });

          return [...incomeBars, ...stackedExpenseBars];
        })()
      : [];
  const visibleBars = bars.filter((bar): bar is BarSlot => bar !== null);
  const startMonth = months[0] ?? "";
  const midMonth = months[Math.max(Math.floor((monthCount - 1) / 2), 0)] ?? "";
  const endMonth = months[monthCount - 1] ?? "";

  return (
    <article className="surface-soft rounded-xl p-4">
      <h3 className="text-sm font-semibold text-primary mb-3">{title}</h3>
      {hasData ? (
        <>
          <div className="surface-card rounded-lg p-2 relative">
            <svg
              viewBox="0 0 100 56"
              role="img"
              aria-label={title}
              className="w-full h-40"
            >
              {[0, 1, 2, 3].map((index) => {
                const y = padTop + (index * drawableHeight) / 3;
                return (
                  <line
                    key={index}
                    x1="4"
                    y1={y}
                    x2="97"
                    y2={y}
                    stroke="color-mix(in oklab, var(--border) 85%, transparent)"
                    strokeWidth="0.4"
                  />
                );
              })}
              {visibleBars.map((bar) => (
                <rect
                  key={bar.key}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill={bar.color}
                  opacity={hoveredBar?.key === bar.key ? "1" : "0.86"}
                  stroke={
                    hoveredBar?.key === bar.key ? "var(--foreground)" : "none"
                  }
                  strokeWidth={hoveredBar?.key === bar.key ? "0.3" : "0"}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredBar(bar)}
                  onMouseLeave={() => setHoveredBar(null)}
                />
              ))}

              {/* Tooltip Overlay in SVG */}
              {hoveredBar && (
                <g pointerEvents="none">
                  <rect
                    x={Math.min(Math.max(parseFloat(hoveredBar.x) - 15, 2), 70)}
                    y={Math.max(parseFloat(hoveredBar.y) - 12, 2)}
                    width="30"
                    height="10"
                    rx="1"
                    fill="var(--surface-strong)"
                    stroke="var(--border)"
                    strokeWidth="0.2"
                    filter="drop-shadow(0 1px 2px rgb(0 0 0 / 0.2))"
                  />
                  <text
                    x={Math.min(Math.max(parseFloat(hoveredBar.x), 17), 85)}
                    y={Math.max(parseFloat(hoveredBar.y) - 8, 5)}
                    fontSize="3"
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontWeight="bold"
                  >
                    {moneyFormatter.format(hoveredBar.value)}원
                  </text>
                  <text
                    x={Math.min(Math.max(parseFloat(hoveredBar.x), 17), 85)}
                    y={Math.max(parseFloat(hoveredBar.y) - 4, 9)}
                    fontSize="2.5"
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                  >
                    {hoveredBar.label}
                  </text>
                </g>
              )}
            </svg>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted px-1">
            <span>{startMonth}</span>
            <span>{midMonth}</span>
            <span>{endMonth}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
            {series.map((item) => {
              const finalValue = item.values[item.values.length - 1] ?? 0;
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-md surface-card px-2 py-1.5"
                >
                  <span className="inline-flex items-center gap-2 text-secondary min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="font-semibold text-primary tabular-nums">
                    {moneyFormatter.format(finalValue)}원
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="surface-card rounded-lg p-6 text-sm text-muted text-center">
          표시할 누적 데이터가 없습니다.
        </div>
      )}
    </article>
  );
}

export default function MonthlyCumulativeTrends({
  transactions,
  month,
}: Props) {
  const { combinedSeries, monthLabels } = useMemo(() => {
    const incomeByMonth: Record<string, number> = {};
    const expenseByMonthByMethod: Record<string, Record<string, number>> = {};

    transactions.forEach((tx) => {
      const monthKey = tx.transactionDate.slice(0, 7);
      if (!/^(\d{4})-(\d{2})$/.test(monthKey)) {
        return;
      }

      if (tx.amount > 0) {
        incomeByMonth[monthKey] = (incomeByMonth[monthKey] ?? 0) + tx.amount;
        return;
      }

      if (tx.amount < 0) {
        const paymentMethod = tx.paymentMethodName?.trim() || "현금/기타";
        if (!expenseByMonthByMethod[paymentMethod]) {
          expenseByMonthByMethod[paymentMethod] = {};
        }
        expenseByMonthByMethod[paymentMethod][monthKey] =
          (expenseByMonthByMethod[paymentMethod][monthKey] ?? 0) +
          Math.abs(tx.amount);
      }
    });

    const monthLabels = Array.from(
      new Set([
        ...Object.keys(incomeByMonth),
        ...Object.values(expenseByMonthByMethod).flatMap((valuesByMonth) =>
          Object.keys(valuesByMonth),
        ),
      ]),
    ).sort();

    const incomeValues = monthLabels.map(
      (monthKey) => incomeByMonth[monthKey] ?? 0,
    );
    const expenseSeries: Series[] = Object.entries(expenseByMonthByMethod)
      .map(
        ([label, valuesByMonth], index): Series => ({
          label,
          color: methodPalette[index % methodPalette.length],
          values: accumulate(
            monthLabels.map((monthKey) => valuesByMonth[monthKey] ?? 0),
          ),
          kind: "expense",
        }),
      )
      .sort(
        (a, b) =>
          (b.values[b.values.length - 1] ?? 0) -
          (a.values[a.values.length - 1] ?? 0),
      );

    const incomeSeries: Series[] = [
      {
        label: "수입 누적",
        color: "var(--success)",
        values: accumulate(incomeValues),
        kind: "income",
      },
    ];

    return {
      combinedSeries: [...incomeSeries, ...expenseSeries],
      monthLabels,
    };
  }, [transactions]);

  const chartRange =
    monthLabels.length > 0
      ? `${monthLabels[0]} ~ ${monthLabels[monthLabels.length - 1]}`
      : month;

  return (
    <section
      className="surface-card rounded-2xl p-6 animate-slide-up"
      aria-label="월별 누적 추이 그래프"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <h2 className="text-lg font-bold text-primary">월별 누적 변화 추이</h2>
        <p className="text-xs text-muted">{chartRange} (월 단위)</p>
      </div>
      <TrendChart
        title="수입/지출 누적 추이 (동시 비교)"
        series={combinedSeries}
        months={monthLabels}
      />
    </section>
  );
}
