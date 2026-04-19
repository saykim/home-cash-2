"use client";

import { useMemo } from "react";
import type { Transaction, PaymentMethod } from "@/types";

interface Props {
  transactions: Transaction[];
  month: string;
  paymentMethods: PaymentMethod[];
}

const categoryColors: Record<string, string> = {
  '생활': '#4f46e5',
  '고정': '#0284c7',
  '외식': '#d97706',
  '교통': '#16a34a',
  '통신': '#9333ea',
  '쇼핑': '#dc2626',
  '의료': '#0f766e',
  '교육': '#ea580c',
  '급여': '#3b82f6',
  '수입': '#10b981',
  '카드대금': '#6366f1',
  '기타': '#475569',
};

const defaultPalette = ['#4f46e5', '#0284c7', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0f766e', '#ea580c'];

const moneyFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

const getPreviousMonthCardLabel = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const previousMonthDate = new Date(year, monthNumber - 2, 1);
  return `${previousMonthDate.getMonth() + 1}월 카드 대금`;
};

export default function CategorySpendingBreakdown({ transactions, month }: Props) {
  const { categories, totalExpense, totalIncome, paymentMethodBreakdown } = useMemo(() => {
    const expenseMap = new Map<string, { total: number; count: number }>();
    const incomeMap = new Map<string, { total: number; count: number }>();
    const pmMap = new Map<string, { total: number; count: number }>();

    transactions.forEach((tx) => {
      if (tx.amount < 0) {
        const cat = tx.category ?? "기타";
        const existing = expenseMap.get(cat) ?? { total: 0, count: 0 };
        expenseMap.set(cat, { total: existing.total + Math.abs(tx.amount), count: existing.count + 1 });

        const pmName = tx.paymentMethodName ?? "현금/기타";
        const pmExisting = pmMap.get(pmName) ?? { total: 0, count: 0 };
        pmMap.set(pmName, { total: pmExisting.total + Math.abs(tx.amount), count: pmExisting.count + 1 });
      } else if (tx.amount > 0) {
        const cat = tx.category ?? "기타";
        const existing = incomeMap.get(cat) ?? { total: 0, count: 0 };
        incomeMap.set(cat, { total: existing.total + tx.amount, count: existing.count + 1 });
      }
    });

    const categories = Array.from(expenseMap.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => b.total - a.total);

    const totalExpense = categories.reduce((sum, c) => sum + c.total, 0);
    const totalIncome = Array.from(incomeMap.values()).reduce((sum, d) => sum + d.total, 0);

    const paymentMethodBreakdown = Array.from(pmMap.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => b.total - a.total);

    return { categories, totalExpense, totalIncome, paymentMethodBreakdown };
  }, [transactions]);

  const [yearStr, monthStr] = month.split("-");
  const displayLabel = `${yearStr}년 ${Number(monthStr)}월`;
  const cardPaymentLabel = getPreviousMonthCardLabel(month);

  if (categories.length === 0 && totalIncome === 0) {
    return (
      <section className="surface-card p-6" aria-label="카테고리별 지출 분석">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-primary">카테고리별 지출 분석</h2>
          <p className="text-xs text-muted">{displayLabel}</p>
        </div>
        <div className="surface-card p-6 text-sm text-muted text-center">
          표시할 데이터가 없습니다.
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card p-6" aria-label="카테고리별 지출 분석">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <h2 className="text-lg font-bold text-primary">카테고리별 지출 분석</h2>
        <p className="text-xs text-muted">{displayLabel}</p>
      </div>

      <div className="space-y-6">
        {/* 지출 카테고리 */}
        {categories.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-secondary">지출 내역</h3>
              <span className="text-sm font-bold text-primary tabular-nums">
                {moneyFormatter.format(totalExpense)}원
              </span>
            </div>
            <div className="space-y-2">
              {categories.map((cat, idx) => {
                const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0;
                const color = categoryColors[cat.label] ?? defaultPalette[idx % defaultPalette.length];
                const categoryLabel =
                  cat.label === "카드대금" ? cardPaymentLabel : cat.label;
                return (
                  <div key={cat.label} className="surface-soft p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-primary truncate">{categoryLabel}</span>
                        <span className="text-[10px] text-muted shrink-0">{cat.count}건</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-secondary tabular-nums">{pct.toFixed(1)}%</span>
                        <span className="text-sm font-bold text-primary tabular-nums">{moneyFormatter.format(cat.total)}원</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-soft)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 결제 수단별 */}
        {paymentMethodBreakdown.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-secondary mb-3">결제 수단별</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {paymentMethodBreakdown.map((pm) => (
                <div key={pm.label} className="surface-soft p-3">
                  <p className="text-xs font-medium text-primary truncate mb-1">{pm.label}</p>
                  <p className="text-sm font-bold text-primary tabular-nums">{moneyFormatter.format(pm.total)}원</p>
                  <p className="text-[10px] text-muted">{pm.count}건</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 수입 요약 */}
        {totalIncome > 0 && (
          <div className="surface-soft p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors['수입'] ?? '#10b981' }} />
              <span className="text-sm font-medium text-primary">수입 합계</span>
            </div>
            <span className="text-lg font-bold text-green-600 tabular-nums">
              +{moneyFormatter.format(totalIncome)}원
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
