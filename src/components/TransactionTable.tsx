'use client';

import { Download, Trash2 } from 'lucide-react';
import TransactionForm from '@/components/TransactionForm';
import type { Transaction, PaymentMethod } from '@/types';
import type { CreateTransactionDTO } from '@/types';
import type { KeyboardEvent } from 'react';

export interface TransactionFilters {
  search: string;
  category: string;
  paymentMethodId: string;
  performance: 'all' | 'included' | 'excluded';
}

interface BillingSummary {
  currentMonth: number;
  nextMonth: number;
  currentMonthLabel: string;
  nextMonthLabel: string;
}

interface Props {
  transactions: Transaction[];
  filters: TransactionFilters;
  paymentMethods: PaymentMethod[];
  categories: string[];
  currentMonth: string;  // 'YYYY-MM'
  billingSummary: BillingSummary | null;
  onChangeFilters: (filters: TransactionFilters) => void;
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onCreateTransaction?: (dto: CreateTransactionDTO) => Promise<void>;
}

export default function TransactionTable({
  transactions,
  filters,
  paymentMethods,
  categories,
  currentMonth,
  billingSummary,
  onChangeFilters,
  isLoading = false,
  onDelete,
  onCreateTransaction,
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
  const exportFileName = `transactions-${currentMonth}-export.csv`;

  /* 결제일 레이블 (개별 row M/D 표시용) */
  const getBillingLabel = (tx: Transaction): string | null => {
    if (!tx.paymentMethodId) return null;
    const pm = paymentMethods.find(p => p.id === tx.paymentMethodId);
    if (!pm || pm.type !== 'CREDIT' || !pm.billingDay) return null;
    const [yStr, mStr, dStr] = tx.transactionDate.split('-');
    const txDay = Number(dStr);
    let bYear = Number(yStr);
    let bMonth = Number(mStr);
    if (txDay >= pm.billingDay) {
      bMonth += 1;
      if (bMonth > 12) { bMonth = 1; bYear += 1; }
    }
    const daysInMonth = new Date(bYear, bMonth, 0).getDate();
    const safeDay = Math.min(pm.billingDay, daysInMonth);
    return `결제 ${bMonth}/${safeDay}`;
  };

  /* 통계 값: 수입/지출은 현재 거래 기준, 결제는 서버 집계 */
  const [, cmMonthStr] = currentMonth.split('-');
  const cmMonth = Number(cmMonthStr);
  const nextMonthNum = cmMonth === 12 ? 1 : cmMonth + 1;
  const currentMonthLabel = `${cmMonth}월`;
  const nextMonthLabel = `${nextMonthNum}월`;

  const income = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const expense = transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);

  const formatMoney = (value: number, withSign = false) => {
    const amount = moneyFormatter.format(value);
    const signValue = withSign && value > 0 ? `+${amount}` : amount;
    return `${signValue}원`;
  };

  const escapeCsv = (value: string | number | null | undefined) => {
    const normalized = value ?? '';
    const text = String(normalized);

    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  };

  const handleExportTransactions = () => {
    if (transactions.length === 0) {
      return;
    }

    const headers = ['거래일', '구분', '내역', '결제수단', '금액', '실적반영', '청구제외'];
    const rows = transactions.map((tx) => [
      tx.transactionDate,
      tx.category ?? '',
      tx.memo ?? '',
      tx.paymentMethodName ?? '',
      tx.amount,
      tx.excludeFromPerformance ? '제외' : '포함',
      tx.excludeFromBilling ? '예' : '아니오',
    ]);

    const csvBody = [headers, ...rows]
      .map(row => row.map(value => escapeCsv(value)).join(','))
      .join('\r\n');
    const csvContent = `\uFEFF${csvBody}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = exportFileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
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
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted">검색/필터는 현재 월 데이터 기준</div>
          <button
            type="button"
            onClick={handleExportTransactions}
            disabled={rowCount === 0}
            className="group inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-secondary backdrop-blur-md transition-all duration-200 hover:text-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
            style={{
              background: 'color-mix(in oklab, var(--surface) 80%, transparent)',
              borderColor: 'color-mix(in oklab, var(--border) 88%, transparent)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in oklab, var(--surface) 96%, transparent)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'color-mix(in oklab, var(--border) 110%, transparent)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in oklab, var(--surface) 80%, transparent)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'color-mix(in oklab, var(--border) 88%, transparent)';
            }}
            aria-label="현재 필터 적용 내역 CSV 내보내기"
            title={rowCount === 0 ? '내보낼 데이터가 없습니다.' : '현재 필터 적용 결과를 CSV로 내보내기'}
          >
            <Download size={14} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-y-0.5" />
            Export
          </button>
        </div>
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

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          id={performanceId}
          className="flex items-center gap-2 text-xs"
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
        {onCreateTransaction ? (
          <TransactionForm
            paymentMethods={paymentMethods}
            onSubmit={onCreateTransaction}
          />
        ) : null}
      </div>

      {/* ── 통계 카드 4개 ── */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl px-3 py-2.5 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">{currentMonthLabel} 수입</p>
          <p className="text-xs sm:text-sm font-bold text-blue-600 tabular-nums truncate">+{moneyFormatter.format(income)}원</p>
        </div>
        <div className="rounded-xl px-3 py-2.5 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">{currentMonthLabel} 지출</p>
          <p className="text-xs sm:text-sm font-bold text-primary tabular-nums truncate">-{moneyFormatter.format(expense)}원</p>
        </div>
        <div className="rounded-xl px-3 py-2.5 border border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">{billingSummary?.currentMonthLabel ?? `${currentMonthLabel} 결제`}</p>
          <p className="text-xs sm:text-sm font-bold text-amber-700 tabular-nums truncate">{moneyFormatter.format(billingSummary?.currentMonth ?? 0)}원</p>
        </div>
        <div className="rounded-xl px-3 py-2.5 border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20">
          <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">{billingSummary?.nextMonthLabel ?? `${nextMonthLabel} 결제 예정`}</p>
          <p className="text-xs sm:text-sm font-bold text-indigo-700 tabular-nums truncate">{moneyFormatter.format(billingSummary?.nextMonth ?? 0)}원</p>
        </div>
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

      <div className="md:hidden space-y-2">
        {transactions.map(tx => (
          <article
            key={tx.id}
            className="rounded-xl border p-3 surface-card"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted">{tx.transactionDate}</p>
                {tx.amount < 0 && (() => {
                  const label = getBillingLabel(tx);
                  return label ? (
                    <p className="text-[10px] text-indigo-500 font-medium mt-0.5">{label}</p>
                  ) : null;
                })()}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onDelete ? (
                  <button
                    type="button"
                    aria-label={`거래 삭제: ${tx.memo || tx.category || tx.transactionDate}`}
                    onClick={() => onDelete(tx.id)}
                    className="text-muted hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--danger)]"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.amount > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' : 'surface-soft text-secondary'}`}>
                {tx.category ?? '-'}
              </span>
              <span className={`text-sm font-bold tabular-nums whitespace-nowrap ${tx.amount > 0 ? 'text-blue-600' : 'text-primary'}`}>
                {formatMoney(tx.amount, true)}
              </span>
            </div>

            <div className="mt-2 min-w-0">
              <p className="text-sm font-medium text-primary truncate">{tx.memo ?? '-'}</p>
              {tx.paymentMethodName ? (
                <p className="text-xs text-muted truncate">{tx.paymentMethodName}</p>
              ) : null}
            </div>

            <div className="mt-2 text-xs">
              {tx.excludeFromPerformance ? (
                <span className="text-muted line-through">실적 제외</span>
              ) : (
                <span className="text-green-600">실적 포함</span>
              )}
            </div>
          </article>
        ))}
        {transactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted text-sm border rounded-xl" style={{ borderColor: 'var(--border)' }}>
            등록된 내역이 없습니다.
          </div>
        ) : null}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left text-secondary">
          <caption className="sr-only">거래 내역표. 총 {rowCount}건</caption>
          <thead className="text-xs uppercase surface-soft">
            <tr>
              <th scope="col" className="px-2 sm:px-4 py-3">사용일</th>
              <th scope="col" className="px-2 sm:px-4 py-3">구분</th>
              <th scope="col" className="px-2 sm:px-4 py-3">내역</th>
              <th scope="col" className="px-2 sm:px-4 py-3 text-right">금액</th>
              <th scope="col" className="px-2 sm:px-4 py-3 text-center">실적</th>
              <th scope="col" className="px-2 sm:px-4 py-3 text-center w-10">삭제</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="table-row-hover border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                  <span>{tx.transactionDate}</span>
                  {tx.amount < 0 && (() => {
                    const label = getBillingLabel(tx);
                    return label ? (
                      <span className="block text-[10px] text-indigo-500 font-medium mt-0.5">{label}</span>
                    ) : null;
                  })()}
                </td>
                <td className="px-2 sm:px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.amount > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' : 'surface-soft text-secondary'
                    }`}>
                    {tx.category ?? '-'}
                  </span>
                </td>
                <td className="px-2 sm:px-4 py-3 font-medium text-primary max-w-[8rem] overflow-hidden">
                  <div className="truncate">{tx.memo ?? '-'}</div>
                  {tx.paymentMethodName && (
                    <span className="block text-xs text-muted font-normal truncate">{tx.paymentMethodName}</span>
                  )}
                </td>
                <td className={`px-2 sm:px-4 py-3 text-right font-bold whitespace-nowrap ${tx.amount > 0 ? 'text-blue-600' : 'text-primary'
                  }`}>
                  <span className="tabular-nums">{formatMoney(tx.amount, true)}</span>
                </td>
                <td className="px-2 sm:px-4 py-3 text-center">
                  {tx.excludeFromPerformance ? (
                    <span className="text-xs text-muted line-through">제외</span>
                  ) : (
                    <span className="text-xs text-green-600">포함</span>
                  )}
                </td>
                <td className="px-2 sm:px-4 py-3 text-center">
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
