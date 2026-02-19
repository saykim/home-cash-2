'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { CardPerformance } from '@/types';

interface Props {
  cards: CardPerformance[];
}

const formatAmount = (amount: number) => `${amount.toLocaleString()}원`;

export default function CardPerformanceGauge({ cards }: Props) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  if (cards.length === 0) return null;

  const toggleCardDetails = (paymentMethodId: string) => {
    setExpandedCardId((prev) => (prev === paymentMethodId ? null : paymentMethodId));
  };

  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-bold text-primary px-1">결제 수단 실적/사용 현황</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => {
          const hasTiers = card.tiers.length > 0;
          const maxThreshold = hasTiers
            ? card.tiers[card.tiers.length - 1].thresholdAmount
            : Math.max(card.currentPerformance, 1);
          const percentage = Math.min((card.currentPerformance / maxThreshold) * 100, 100);
          const nextTier = card.tiers.find((tier) => !tier.achieved);
          const isExpanded = expandedCardId === card.paymentMethodId;

          return (
            <div key={card.paymentMethodId} className="surface-card rounded-xl p-5 relative overflow-hidden min-h-[212px] flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-primary flex items-center gap-2">
                    <CreditCard size={18} className="text-indigo-500" />
                    {card.cardName}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    {card.paymentMethodType === 'CREDIT' && card.billingDay
                      ? `결제일: 매월 ${card.billingDay}일`
                      : card.paymentMethodType === 'CASH'
                        ? '유형: 현금'
                        : card.paymentMethodType === 'CHECK'
                          ? '유형: 체크카드'
                          : '유형: 계좌'}
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    실적 산정 시작일: 매월 {card.performanceStartDay}일
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-bold text-primary">
                    {formatAmount(card.currentPerformance)}
                  </span>
                  <span className="text-xs text-secondary">
                    {hasTiers ? '실적 인정 금액' : '사용 금액'}
                  </span>
                </div>
              </div>

              <div className="relative h-4 rounded-full mb-4" style={{ backgroundColor: 'var(--bg-soft)' }}>
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-1000"
                  style={{ width: `${percentage}%` }}
                />
                {card.tiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 h-full w-0.5 bg-white/60 z-10"
                    style={{ left: `${(tier.thresholdAmount / maxThreshold) * 100}%` }}
                  />
                ))}
              </div>

              <div className="mt-auto space-y-2">
                <div className="flex justify-between items-center text-sm surface-soft p-3 rounded-lg">
                  {hasTiers ? (
                    nextTier ? (
                      <>
                        <span className="text-secondary">
                          다음 혜택: <span className="font-semibold text-indigo-700">{nextTier.benefitDesc}</span>
                        </span>
                        <span className="text-xs font-medium surface-strong px-2 py-1 rounded text-secondary">
                          {(card.nextTierRemaining ?? 0).toLocaleString()}원 더 쓰면 달성 🔥
                        </span>
                      </>
                    ) : (
                      <span className="text-green-600 font-medium flex items-center gap-1 w-full justify-center">
                        <CheckCircle size={16} /> 모든 혜택 달성 완료!
                      </span>
                    )
                  ) : (
                    <span className="text-secondary font-medium w-full text-center">
                      이번 달 사용 내역 기반 합계
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleCardDetails(card.paymentMethodId)}
                  className="w-full rounded-lg border px-3 py-2 text-xs text-secondary hover:text-primary flex items-center justify-center gap-1"
                >
                  {isExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                  {isExpanded
                    ? '상세 내역 숨기기'
                    : hasTiers
                      ? '실적 합계 상세 보기'
                      : '이번달 사용내역 기반 합계'}
                </button>

                {isExpanded && (
                  <div className="surface-soft rounded-lg p-3 space-y-2">
                    <p className="text-[11px] text-muted">
                      산정 기간: {card.performancePeriodStart} ~ {card.performancePeriodEnd}
                    </p>
                    {card.usageTransactions.length === 0 ? (
                      <p className="text-xs text-muted py-1">해당 기간에 반영된 사용 내역이 없습니다.</p>
                    ) : (
                      <ul className="space-y-2 max-h-44 overflow-y-auto pr-1">
                        {card.usageTransactions.map((transaction) => (
                          <li
                            key={transaction.id}
                            className="rounded-md bg-[color:var(--bg)]/70 px-2 py-1.5 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted">
                                {transaction.transactionDate} · {transaction.category ?? '미분류'}
                              </p>
                              <p className="text-xs text-primary truncate">
                                {transaction.memo && transaction.memo.trim().length > 0
                                  ? transaction.memo
                                  : '메모 없음'}
                              </p>
                            </div>
                            <span className="text-xs font-semibold whitespace-nowrap text-primary">
                              {formatAmount(transaction.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
