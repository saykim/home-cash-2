"use client";

import { useState } from "react";
import {
  CreditCard,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  CreditCard as BillingIcon,
} from "lucide-react";
import type { CardPerformance } from "@/types";

interface Props {
  cards: CardPerformance[];
}

const fmt = (n: number) => n.toLocaleString();

/* 날짜 문자열(YYYY-MM-DD)을 M/D 형식으로 */
const toShortDate = (dateStr: string) => {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
};

/**
 * 결제 예정일 계산.
 * 실적 기간 종료일 기준으로, billingDay가 종료일의 일(day)보다 크면 같은 달,
 * 아니면 다음 달 billingDay.
 * 예: 기간 종료 2/13, billingDay=14 → 2/14 (동월)
 * 예: 기간 종료 2/28, billingDay=14 → 3/14 (다음 달)
 */
const getExpectedBillingDate = (
  performancePeriodEnd: string,
  billingDay: number,
): string => {
  const [endYear, endMonth, endDay] = performancePeriodEnd
    .split("-")
    .map(Number);

  const daysInEndMonth = new Date(endYear, endMonth, 0).getDate();
  const clampedBillingDay = Math.min(billingDay, daysInEndMonth);

  let billingYear = endYear;
  let billingMonth = endMonth;

  if (endDay >= clampedBillingDay) {
    billingMonth += 1;
    if (billingMonth > 12) {
      billingMonth = 1;
      billingYear += 1;
    }
  }
  const daysInBillingMonth = new Date(billingYear, billingMonth, 0).getDate();
  const safeDay = Math.min(billingDay, daysInBillingMonth);
  return `${billingMonth}/${safeDay}`;
};

export default function CardPerformanceGauge({ cards }: Props) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  if (cards.length === 0) return null;

  const toggleCard = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const expandedCard = cards.find((c) => c.paymentMethodId === expandedCardId);

  return (
    <section className="grid gap-4">
      {/* ── 카드 그리드 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => {
          const hasTiers = card.tiers.length > 0;
          const maxThreshold = hasTiers
            ? card.tiers[card.tiers.length - 1].thresholdAmount
            : Math.max(card.currentPerformance, 1);
          const percentage = Math.min(
            (card.currentPerformance / maxThreshold) * 100,
            100,
          );
          const nextTier = card.tiers.find((t) => !t.achieved);
          const achievedTiers = card.tiers.filter((t) => t.achieved);
          const isExpanded = expandedCardId === card.paymentMethodId;
          const isCredit = card.paymentMethodType === "CREDIT";

          /* 결제 예정일 계산 (신용카드만) */
          const expectedBillingDate =
            isCredit && card.billingDay
              ? getExpectedBillingDate(
                  card.performancePeriodEnd,
                  card.billingDay,
                )
              : null;

          /* 산정기간 표시 */
          const periodLabel = `${toShortDate(card.performancePeriodStart)} ~ ${toShortDate(card.performancePeriodEnd)}`;

          return (
            <div
              key={card.paymentMethodId}
              className={`surface-card p-4 flex flex-col gap-2.5 cursor-pointer transition-shadow ${
                isExpanded ? "ring-2 ring-indigo-400" : "hover:shadow-md"
              }`}
              onClick={() => toggleCard(card.paymentMethodId)}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  toggleCard(card.paymentMethodId);
              }}
            >
              {/* 1행: 카드명 */}
              <div className="flex items-center gap-1.5 min-w-0">
                <CreditCard size={14} className="text-indigo-500 shrink-0" />
                <h3 className="text-[13px] font-bold text-primary truncate min-w-0">
                  {card.cardName}
                </h3>
              </div>

              {/* 2행: 산정기간 + 결제 예정일 — 핵심 정보 */}
              {isCredit && (
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span
                    className="flex items-center gap-0.5 text-muted whitespace-nowrap"
                    title="실적 산정 기간"
                  >
                    <Calendar size={9} className="shrink-0" />
                    {periodLabel}
                  </span>
                  {expectedBillingDate && (
                    <span
                      className="flex items-center gap-0.5 font-semibold text-indigo-600 whitespace-nowrap"
                      title="결제 예정일"
                    >
                      <BillingIcon size={9} className="shrink-0" />
                      {expectedBillingDate} 결제
                    </span>
                  )}
                </div>
              )}

              {/* 이전 실적 (결제 대기 중) */}
              {card.previousPerformance && (
                <div className="rounded-lg px-2.5 py-2 text-[11px] border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <BillingIcon size={10} />
                      이전 실적 · 결제 대기
                    </span>
                    <span className="text-amber-800 dark:text-amber-300 font-bold tabular-nums">
                      {fmt(card.previousPerformance.amount)}원
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-amber-600 dark:text-amber-500">
                    <span>
                      {toShortDate(card.previousPerformance.periodStart)} ~{" "}
                      {toShortDate(card.previousPerformance.periodEnd)}
                    </span>
                    {card.billingDay && (
                      <span className="font-medium">
                        {getExpectedBillingDate(
                          card.previousPerformance.periodEnd,
                          card.billingDay,
                        )}{" "}
                        결제 예정
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 3행: 금액 */}
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-[22px] font-bold text-primary tabular-nums leading-none">
                  {fmt(card.currentPerformance)}
                </span>
                <span className="text-[11px] text-muted">
                  {hasTiers ? "원 실적" : "원 사용"}
                </span>
              </div>

              {/* 프로그레스 바 */}
              {hasTiers && (
                <div
                  className="relative h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--bg-soft)" }}
                >
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  />
                  {card.tiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 h-full w-px bg-white/50"
                      style={{
                        left: `${(tier.thresholdAmount / maxThreshold) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* 혜택 영역 */}
              <div className="space-y-1 mt-auto">
                {achievedTiers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {achievedTiers.map((tier) => (
                      <span
                        key={tier.id}
                        className="inline-flex items-center gap-0.5 text-[10px] text-green-700 bg-green-50 rounded-full px-1.5 py-px leading-snug"
                      >
                        <CheckCircle size={9} /> {tier.benefitDesc || "달성"}
                      </span>
                    ))}
                  </div>
                )}

                {hasTiers ? (
                  nextTier ? (
                    <div className="surface-soft rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1">
                      <span className="text-[11px] text-secondary truncate min-w-0">
                        다음:{" "}
                        <strong className="text-indigo-700">
                          {nextTier.benefitDesc}
                        </strong>
                      </span>
                      <span className="text-[10px] font-semibold whitespace-nowrap text-indigo-600 shrink-0">
                        {fmt(card.nextTierRemaining ?? 0)}원 🔥
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] font-medium text-green-600 flex items-center justify-center gap-1 surface-soft rounded-lg px-2.5 py-1.5">
                      <CheckCircle size={12} /> 모든 혜택 달성!
                    </p>
                  )
                ) : (
                  <p className="text-[10px] text-muted text-center surface-soft rounded-lg px-2.5 py-1">
                    {isCredit ? "이번 달 실적 합계" : "이번 달 사용 합계"}
                  </p>
                )}
              </div>

              {/* 카드 하단 토글 힌트 */}
              <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted pt-0.5">
                {isExpanded ? (
                  <>
                    <ChevronUp size={10} /> 상세 닫기
                  </>
                ) : (
                  <>
                    <ChevronDown size={10} /> 상세 보기
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 상세 내역: 카드 그리드 아래 풀폭 ── */}
      {expandedCard &&
        (() => {
          const prev = expandedCard.previousPerformance;
          const renderTable = (
            txs: typeof expandedCard.usageTransactions,
            label: string,
            periodStart: string,
            periodEnd: string,
            billingLabel?: string,
            accentColor?: "amber" | "indigo",
          ) => {
            const color = accentColor ?? "indigo";
            return (
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-bold ${color === "amber" ? "text-amber-700 dark:text-amber-400" : "text-primary"}`}
                    >
                      {label}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 whitespace-nowrap ${
                        color === "amber"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400"
                      }`}
                    >
                      <Calendar size={9} />
                      {periodStart} ~ {periodEnd}
                    </span>
                    {billingLabel && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {billingLabel}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums ${color === "amber" ? "text-amber-700 dark:text-amber-300" : "text-primary"}`}
                  >
                    {fmt(txs.reduce((s, t) => s + t.amount, 0))}원
                  </span>
                </div>
                {txs.length === 0 ? (
                  <p className="text-xs text-muted py-3 text-center">
                    사용 내역이 없습니다.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr
                          className="text-[10px] text-muted border-b"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <th className="pb-1.5 font-medium hidden sm:table-cell">
                            날짜
                          </th>
                          <th className="pb-1.5 font-medium">분류</th>
                          <th className="pb-1.5 font-medium">메모</th>
                          <th className="pb-1.5 font-medium text-right">
                            금액
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {txs.map((tx) => (
                          <tr
                            key={tx.id}
                            className="text-[11px] border-b last:border-b-0"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <td className="py-1.5 text-muted whitespace-nowrap pr-3 hidden sm:table-cell">
                              {tx.transactionDate}
                            </td>
                            <td className="py-1.5 text-secondary whitespace-nowrap pr-3">
                              {tx.category ?? "미분류"}
                            </td>
                            <td className="py-1.5 text-primary truncate max-w-[120px] sm:max-w-[200px]">
                              <span className="block text-[10px] text-muted sm:hidden mb-0.5">
                                {tx.transactionDate}
                              </span>
                              {tx.memo?.trim() || "-"}
                            </td>
                            <td className="py-1.5 text-primary font-semibold text-right tabular-nums whitespace-nowrap">
                              {fmt(tx.amount)}원
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          };

          const prevBillingLabel =
            prev && expandedCard.billingDay
              ? `${getExpectedBillingDate(prev.periodEnd, expandedCard.billingDay)} 결제 예정`
              : undefined;

          return (
            <div className="surface-card p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CreditCard size={15} className="text-indigo-500 shrink-0" />
                  <h3 className="text-sm font-bold text-primary truncate">
                    {expandedCard.cardName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedCardId(null)}
                  className="text-muted hover:text-primary p-1 shrink-0"
                  aria-label="상세 닫기"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5">
                {/* 이전 실적 (결제 대기) */}
                {prev && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 p-3 bg-amber-50/30 dark:bg-amber-950/10">
                    {renderTable(
                      prev.transactions,
                      "이전 실적 · 결제 대기",
                      prev.periodStart,
                      prev.periodEnd,
                      prevBillingLabel,
                      "amber",
                    )}
                  </div>
                )}

                {/* 당월 실적 */}
                {renderTable(
                  expandedCard.usageTransactions,
                  prev ? "당월 실적 · 진행 중" : "실적 상세",
                  expandedCard.performancePeriodStart,
                  expandedCard.performancePeriodEnd,
                  expandedCard.paymentMethodType === "CREDIT" &&
                    expandedCard.billingDay
                    ? `${getExpectedBillingDate(expandedCard.performancePeriodEnd, expandedCard.billingDay)} 결제 예정`
                    : undefined,
                )}
              </div>
            </div>
          );
        })()}
    </section>
  );
}
