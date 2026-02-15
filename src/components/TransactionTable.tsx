'use client';

import { Trash2 } from 'lucide-react';
import type { Transaction, PaymentMethod } from '@/types';
import type { KeyboardEvent } from 'react';

export interface TransactionFilters {
  search: string;
  category: string;
  paymentMethodId: string;
  performance: 'all' | 'included' | 'excluded';
}

interface Props {
  transactions: Transaction[];
  filters: TransactionFilters;
  paymentMethods: PaymentMethod[];
  categories: string[];
  onChangeFilters: (filters: TransactionFilters) => void;
  isLoading?: boolean;
  onDelete?: (id: string) => void;
}

export default function TransactionTable({
  transactions,
  filters,
  paymentMethods,
  categories,
  onChangeFilters,
  isLoading = false,
  onDelete,
}: Props) {
  const setFilter = <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => {
    onChangeFilters({ ...filters, [key]: value });
  };

  const searchId = 'transaction-search-filter';
  const categoryId = 'transaction-category-filter';
  const paymentMethodId = 'transaction-payment-filter';
  const performanceId = 'transaction-performance-filter';
  const performanceOptions: TransactionFilters['performance'][] = ['all', 'included', 'excluded'];
  const moneyFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
  const rowCount = transactions.length;
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const formatMoney = (value: number, withSign = false) => {
    const amount = moneyFormatter.format(value);
    const signValue = withSign && value > 0 ? `+${amount}` : amount;
    return `${signValue}원`;
  };

  const movePerformanceFocus = (next: TransactionFilters['performance'], e: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = performanceOptions.indexOf(next);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % performanceOptions.length;
      const nextValue = performanceOptions[nextIndex];
      setFilter('performance', nextValue);
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + performanceOptions.length) % performanceOptions.length;
      const nextValue = performanceOptions[prevIndex];
      setFilter('performance', nextValue);
    }

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setFilter('performance', next);
    }
  };

  return (
    <section className="surface-card rounded-2xl p-6" aria-label="거래 내역 검색 및 목록">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-primary">최근 내역 요약</h2>
        <div className="text-xs text-muted">검색/필터는 현재 월 데이터 기준</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4" role="search">
        <label className="sr-only" htmlFor={searchId}>내역 검색</label>
        <input
          id={searchId}
          type="text"
          name="search"
          autoComplete="off"
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          placeholder="메모/분류/결제수단 검색…"
          className="md:col-span-2 w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />

        <label className="sr-only" htmlFor={categoryId}>분류 필터</label>
        <select
          id={categoryId}
          name="category"
          autoComplete="off"
          value={filters.category}
          onChange={e => setFilter('category', e.target.value)}
          className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="all">전체 분류</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
            ))}
          </select>

        <label className="sr-only" htmlFor={paymentMethodId}>결제수단 필터</label>
        <select
          id={paymentMethodId}
          name="paymentMethodId"
          autoComplete="off"
          value={filters.paymentMethodId}
          onChange={e => setFilter('paymentMethodId', e.target.value)}
          className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="all">전체 결제수단</option>
          {paymentMethods.map(pm => (
            <option key={pm.id} value={pm.id}>{pm.name}</option>
          ))}
        </select>
      </div>

      <div
        id={performanceId}
        className="mb-4 flex items-center gap-2 text-xs"
        role="radiogroup"
        aria-label="실적 반영 여부 필터"
      >
        <button
          type="button"
          role="radio"
          aria-checked={filters.performance === 'all'}
          tabIndex={filters.performance === 'all' ? 0 : -1}
          onClick={() => setFilter('performance', 'all')}
          onKeyDown={e => movePerformanceFocus('all', e)}
          className={`px-2.5 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 ${filters.performance === 'all' ? 'accent-chip' : 'surface-soft text-secondary'}`}
          aria-label="실적 전체"
        >
          실적 전체
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={filters.performance === 'included'}
          tabIndex={filters.performance === 'included' ? 0 : -1}
          onClick={() => setFilter('performance', 'included')}
          onKeyDown={e => movePerformanceFocus('included', e)}
          className={`px-2.5 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 ${filters.performance === 'included' ? 'accent-chip' : 'surface-soft text-secondary'}`}
          aria-label="실적 포함만"
        >
          실적 포함만
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={filters.performance === 'excluded'}
          tabIndex={filters.performance === 'excluded' ? 0 : -1}
          onClick={() => setFilter('performance', 'excluded')}
          onKeyDown={e => movePerformanceFocus('excluded', e)}
          className={`px-2.5 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 ${filters.performance === 'excluded' ? 'danger-chip' : 'surface-soft text-secondary'}`}
          aria-label="실적 제외만"
        >
          실적 제외만
        </button>
      </div>

      <div className="mb-4 flex items-start sm:items-center justify-between gap-2 rounded-lg surface-soft px-3 py-2 text-xs text-muted">
        <div>
          <p className="text-sm text-primary font-medium">
            필터 적용 내역
          </p>
            <p aria-live="polite" className="tabular-nums">
              총 <span className="font-semibold text-primary">{moneyFormatter.format(rowCount)}건</span> · 합계 {isLoading ? '갱신 중…' : formatMoney(totalAmount)}
            </p>
        </div>
        {isLoading ? (
            <span className="inline-flex items-center gap-2 text-xs text-secondary">
              <span className="h-3.5 w-3.5 border-2 border-[color:var(--accent)]/55 border-t-transparent rounded-full animate-spin" />
              목록 갱신 중
            </span>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-secondary">
          <caption className="sr-only">거래 내역표. 총 {rowCount}건</caption>
          <thead className="text-xs uppercase surface-soft">
            <tr>
              <th scope="col" className="px-4 py-3">날짜</th>
              <th scope="col" className="px-4 py-3">구분</th>
              <th scope="col" className="px-4 py-3">내역</th>
              <th scope="col" className="px-4 py-3 text-right">금액</th>
              <th scope="col" className="px-4 py-3 text-center">실적</th>
              <th scope="col" className="px-4 py-3 text-center w-10">삭제</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="table-row-hover border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 whitespace-nowrap">{tx.transactionDate}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tx.amount > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' : 'surface-soft text-secondary'
                  }`}>
                    {tx.category ?? '-'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-primary">
                  {tx.memo ?? '-'}
                  {tx.paymentMethodName && (
                    <span className="block text-xs text-muted font-normal">{tx.paymentMethodName}</span>
                  )}
                </td>
                <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                  tx.amount > 0 ? 'text-blue-600' : 'text-primary'
                }`}>
                  <span className="tabular-nums">{formatMoney(tx.amount, true)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {tx.excludeFromPerformance ? (
                    <span className="text-xs text-muted line-through">제외</span>
                  ) : (
                    <span className="text-xs text-green-600">포함</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                {onDelete && (
                  <button
                    type="button"
                    aria-label={`거래 삭제: ${tx.memo || tx.category || tx.transactionDate}`}
                  onClick={() => onDelete(tx.id)}
                  className="text-muted hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--danger)]"
                >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  등록된 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
