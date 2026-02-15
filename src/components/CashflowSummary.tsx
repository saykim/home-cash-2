'use client';

import { TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react';
import type { CashflowSummary as CashflowData } from '@/types';

interface Props {
  summary: CashflowData;
}

export default function CashflowSummary({ summary }: Props) {
  const isDeficit = summary.balance < 0;
  const savingsAmount = Math.floor(summary.balance / 10000);

  return (
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
          <p className="text-2xl font-bold text-blue-600">
            {summary.income.toLocaleString()}
          </p>
        </div>
        <div className="py-4 md:py-0">
          <span className="flex items-center justify-center gap-2 text-secondary text-sm mb-1">
            <TrendingDown size={16} className="text-red-500" /> 지출
          </span>
          <p className="text-2xl font-bold text-red-600">
            {summary.expense.toLocaleString()}
          </p>
        </div>
        <div className="pt-4 md:pt-0">
          <span className="flex items-center justify-center gap-2 text-secondary text-sm mb-1">
            <Wallet size={16} className={isDeficit ? 'text-red-500' : 'text-green-500'} /> 잔액
          </span>
          <p className={`text-2xl font-bold ${isDeficit ? 'text-red-500' : 'text-green-600'}`}>
            {summary.balance > 0 ? '+' : ''}{summary.balance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className={`mt-6 p-3 rounded-xl flex items-start gap-3 text-sm ${
        isDeficit ? 'danger-chip' : 'accent-chip'
      }`}>
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <p>
          {isDeficit
            ? '주의: 지출이 수입을 초과했습니다. 비상금을 확인하세요.'
            : `안정적입니다. 이대로라면 이번 달 ${savingsAmount}만원 저축 가능합니다.`}
        </p>
      </div>
    </section>
  );
}
