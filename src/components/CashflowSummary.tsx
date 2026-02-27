'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, X, BookOpen, Calendar, CreditCard, BarChart3, Settings, ListChecks } from 'lucide-react';
import type { CashflowSummary as CashflowData } from '@/types';

interface Props {
  summary: CashflowData;
}

const GUIDE_SECTIONS = [
  {
    icon: <BarChart3 size={20} className="text-indigo-500" />,
    title: '대시보드',
    color: 'border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20',
    headColor: 'text-indigo-700',
    items: [
      '< 연도 월 > 버튼으로 과거/미래 월 탐색',
      '수입 · 지출 · 잔액을 한눈에 파악',
      '잔액 기준 저축 가능액 자동 계산',
    ],
  },
  {
    icon: <CreditCard size={20} className="text-violet-500" />,
    title: '결제 수단 실적/사용 현황',
    color: 'border-violet-200 bg-violet-50 dark:bg-violet-950/20',
    headColor: 'text-violet-700',
    items: [
      '카드별 실적 · 다음 혜택 달성까지 남은 금액 확인',
      '산정기간(예: 1/1~1/31)과 결제 예정일(예: 2/14) 표시',
      '카드 클릭 → 실적 기간 내 거래 상세 목록',
    ],
  },
  {
    icon: <ListChecks size={20} className="text-emerald-500" />,
    title: '최근 내역 요약',
    color: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20',
    headColor: 'text-emerald-700',
    items: [
      '사용일 · 결제 예정일 동시 표시',
      '수입 / 지출 / 이번 달 결제 / 다음 달 결제 예정 한눈에 집계',
      '분류 · 결제수단 · 실적 포함여부 필터',
      '+ 내역 입력으로 지출/수입 직접 등록',
    ],
  },
  {
    icon: <Calendar size={20} className="text-amber-500" />,
    title: '내역 입력 옵션',
    color: 'border-amber-200 bg-amber-50 dark:bg-amber-950/20',
    headColor: 'text-amber-700',
    items: [
      '청구 제외: 취소/환불 등 실제 결제 안 되는 거래',
      '실적 제외: 관리비·보험료 등 카드사 실적 미인정 항목',
    ],
  },
  {
    icon: <Settings size={20} className="text-slate-500" />,
    title: '설정 (기준정보)',
    color: 'border-slate-200 bg-slate-50 dark:bg-slate-800/30',
    headColor: 'text-slate-700',
    items: [
      '결제 수단 추가 · 이름 · 결제일 · 실적 산정 시작일 관리',
      '혜택 구간 설정 (예: 30만원 달성 시 캐시백 1%)',
      '산정 시작일에 따라 실적 기간 자동 계산',
    ],
  },
];

export default function CashflowSummary({ summary }: Props) {
  const [showGuide, setShowGuide] = useState(false);
  const isDeficit = summary.balance < 0;
  const savingsAmount = Math.floor(summary.balance / 10000);

  return (
    <>
      <section className="surface-card rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            {summary.month} Cashflow
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--border)' }}>
          <div className="pb-4 md:pb-0">
            <span className="flex items-center justify-center gap-2 text-secondary text-sm mb-1">
              <TrendingUp size={16} className="text-blue-500" /> 수입
            </span>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">
              {summary.income.toLocaleString()}
            </p>
          </div>
          <div className="py-4 md:py-0">
            <span className="flex items-center justify-center gap-2 text-secondary text-sm mb-1">
              <TrendingDown size={16} className="text-red-500" /> 지출
            </span>
            <p className="text-xl sm:text-2xl font-bold text-red-600">
              {summary.expense.toLocaleString()}
            </p>
          </div>
          <div className="pt-4 md:pt-0">
            <span className="flex items-center justify-center gap-2 text-secondary text-sm mb-1">
              <Wallet size={16} className={isDeficit ? 'text-red-500' : 'text-green-500'} /> 잔액
            </span>
            <p className={`text-xl sm:text-2xl font-bold ${isDeficit ? 'text-red-500' : 'text-green-600'}`}>
              {summary.balance > 0 ? '+' : ''}{summary.balance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 알림 행 + 가이드 버튼 */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className={`flex-1 p-3 rounded-xl flex items-start gap-3 text-sm ${isDeficit ? 'danger-chip' : 'accent-chip'
            }`}>
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>
              {isDeficit
                ? '주의: 지출이 수입을 초과했습니다. 비상금을 확인하세요.'
                : `안정적입니다. 이대로라면 이번 달 ${savingsAmount}만원 저축 가능합니다.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="self-end sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold surface-soft text-secondary hover:text-primary hover:shadow-sm transition-all border"
            style={{ borderColor: 'var(--border)' }}
            aria-label="기능 가이드 열기"
          >
            <BookOpen size={14} />
            사용 가이드
          </button>
        </div>
      </section>

      {/* 기능 가이드 모달 */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowGuide(false)}
        >
          <div
            className="surface-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 surface-card flex items-center justify-between px-4 sm:px-6 py-4 border-b z-10" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-lg font-bold text-primary">🏠 우리집 가계부 사용 가이드</h2>
                <p className="text-xs text-muted mt-0.5">급여로 카드 결제가 충분한지 한눈에 파악하는 스마트 가계부</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-muted hover:text-primary p-1.5 rounded-lg hover:bg-[color:var(--bg-soft)]"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="p-4 sm:p-6 space-y-4">
              {GUIDE_SECTIONS.map(section => (
                <div
                  key={section.title}
                  className={`rounded-xl border p-4 ${section.color}`}
                >
                  <h3 className={`flex items-center gap-2 font-bold text-sm mb-3 ${section.headColor}`}>
                    {section.icon}
                    {section.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {section.items.map(item => (
                      <li key={item} className="flex items-start gap-2 text-xs text-secondary">
                        <span className="mt-0.5 shrink-0 w-1 h-1 rounded-full bg-current opacity-50 mt-1.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* 핵심 플로우 */}
              <div className="rounded-xl border border-dashed p-4" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-bold text-muted uppercase tracking-wide mb-3">💡 핵심 활용 흐름</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {[
                    '① 설정에서 카드 등록',
                    '결제일 · 실적 시작일 입력',
                    '② 매일 지출/수입 입력',
                    '③ 대시보드에서 이번 달\n결제 총액 확인',
                    '④ 다음 달 결제 예정 ≤ 급여\n→ 안심!',
                  ].map((step, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg surface-soft text-secondary text-center whitespace-pre-line leading-tight"
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
