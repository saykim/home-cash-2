'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { CardPerformance } from '@/types';

interface Props {
  cards: CardPerformance[];
}

const fmt = (n: number) => n.toLocaleString();

export default function CardPerformanceGauge({ cards }: Props) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  if (cards.length === 0) return null;

  const toggleCard = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const expandedCard = cards.find((c) => c.paymentMethodId === expandedCardId);

  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-bold text-primary px-1">결제 수단 실적/사용 현황</h2>

      {/* ── 카드 그리드 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => {
          const hasTiers = card.tiers.length > 0;
          const maxThreshold = hasTiers
            ? card.tiers[card.tiers.length - 1].thresholdAmount
            : Math.max(card.currentPerformance, 1);
          const percentage = Math.min((card.currentPerformance / maxThreshold) * 100, 100);
          const nextTier = card.tiers.find((t) => !t.achieved);
          const achievedTiers = card.tiers.filter((t) => t.achieved);
          const isExpanded = expandedCardId === card.paymentMethodId;

          /* 부가 정보 */
          const infoParts: string[] = [];
          if (card.paymentMethodType === 'CREDIT' && card.billingDay) {
            infoParts.push(`결제 ${card.billingDay}일`);
          } else if (card.paymentMethodType === 'CHECK') {
            infoParts.push('체크');
          } else if (card.paymentMethodType === 'CASH') {
            infoParts.push('현금');
          } else if (card.paymentMethodType === 'ACCOUNT') {
            infoParts.push('계좌');
          }
          if (card.paymentMethodType === 'CREDIT') {
            infoParts.push(`산정 ${card.performanceStartDay}일`);
          }

          return (
            <div
              key={card.paymentMethodId}
              className={`surface-card rounded-xl p-4 flex flex-col gap-2.5 cursor-pointer transition-shadow ${isExpanded ? 'ring-2 ring-indigo-400' : 'hover:shadow-md'
                }`}
              onClick={() => toggleCard(card.paymentMethodId)}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCard(card.paymentMethodId); }}
            >
              {/* 1행: 카드명 + 부가정보 */}
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-primary flex items-center gap-1.5 truncate min-w-0">
                  <CreditCard size={14} className="text-indigo-500 shrink-0" />
                  <span className="truncate">{card.cardName}</span>
                </h3>
                <span className="text-[10px] text-muted whitespace-nowrap shrink-0">{infoParts.join(' · ')}</span>
              </div>

              {/* 2행: 금액 */}
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-[22px] font-bold text-primary tabular-nums leading-none">
                  {fmt(card.currentPerformance)}
                </span>
                <span className="text-[11px] text-muted">{hasTiers ? '원 실적' : '원 사용'}</span>
              </div>

              {/* 프로그레스 바 */}
              {hasTiers && (
                <div className="relative h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-soft)' }}>
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  />
                  {card.tiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 h-full w-px bg-white/50"
                      style={{ left: `${(tier.thresholdAmount / maxThreshold) * 100}%` }}
                    />
                  ))}
                </div>
              )}

              {/* 혜택 영역 */}
              <div className="space-y-1 mt-auto">
                {achievedTiers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {achievedTiers.map((tier) => (
                      <span key={tier.id} className="inline-flex items-center gap-0.5 text-[10px] text-green-700 bg-green-50 rounded-full px-1.5 py-px leading-snug">
                        <CheckCircle size={9} /> {tier.benefitDesc || '달성'}
                      </span>
                    ))}
                  </div>
                )}

                {hasTiers ? (
                  nextTier ? (
                    <div className="surface-soft rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1">
                      <span className="text-[11px] text-secondary truncate min-w-0">
                        다음: <strong className="text-indigo-700">{nextTier.benefitDesc}</strong>
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
                    이번 달 사용 합계
                  </p>
                )}
              </div>

              {/* 카드 하단 토글 힌트 */}
              <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted pt-0.5">
                {isExpanded
                  ? <><ChevronUp size={10} /> 상세 닫기</>
                  : <><ChevronDown size={10} /> 상세 보기</>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 상세 내역: 카드 그리드 아래 풀폭 ── */}
      {expandedCard && (
        <div className="surface-card rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <CreditCard size={16} className="text-indigo-500 shrink-0" />
              <h3 className="text-sm font-bold text-primary truncate">{expandedCard.cardName}</h3>
              <span className="text-[10px] text-muted whitespace-nowrap">
                {expandedCard.performancePeriodStart} ~ {expandedCard.performancePeriodEnd}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExpandedCardId(null)}
              className="text-muted hover:text-primary p-1"
              aria-label="상세 닫기"
            >
              <X size={16} />
            </button>
          </div>

          {expandedCard.usageTransactions.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">해당 기간에 사용 내역이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-muted border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="pb-1.5 font-medium">날짜</th>
                    <th className="pb-1.5 font-medium">분류</th>
                    <th className="pb-1.5 font-medium">메모</th>
                    <th className="pb-1.5 font-medium text-right">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {expandedCard.usageTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="text-[11px] border-b last:border-b-0"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="py-1.5 text-muted whitespace-nowrap pr-3">{tx.transactionDate}</td>
                      <td className="py-1.5 text-secondary whitespace-nowrap pr-3">{tx.category ?? '미분류'}</td>
                      <td className="py-1.5 text-primary truncate max-w-[200px]">{tx.memo?.trim() || '-'}</td>
                      <td className="py-1.5 text-primary font-semibold text-right tabular-nums whitespace-nowrap">
                        {fmt(tx.amount)}원
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-xs font-bold border-t" style={{ borderColor: 'var(--border)' }}>
                    <td colSpan={3} className="py-2 text-secondary">합계</td>
                    <td className="py-2 text-primary text-right tabular-nums">
                      {fmt(expandedCard.usageTransactions.reduce((s, t) => s + t.amount, 0))}원
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
