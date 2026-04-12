'use client';

import { Download, Pencil, Trash2, X } from 'lucide-react';
import TransactionForm from '@/components/TransactionForm';
import type { Transaction, PaymentMethod } from '@/types';
import type { CreateTransactionDTO, UpdateTransactionDTO } from '@/types';
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';

const sanitizeAmountInput = (value: string) =>
  value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');

const formatAmountDisplay = (value: string) =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export interface TransactionFilters {
  search: string;
  category: string;
  paymentMethodId: string;
  performance: 'all' | 'included' | 'excluded';
  summaryScope: 'all' | 'income' | 'expense' | 'billingCurrent' | 'billingNext';
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
  monthlyTotals?: {
    income: number;
    expense: number;
  };
  onChangeFilters: (filters: TransactionFilters) => void;
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onCreateTransaction?: (dto: CreateTransactionDTO) => Promise<void>;
  onUpdateTransaction?: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
}

export default function TransactionTable({
  transactions,
  filters,
  paymentMethods,
  categories,
  currentMonth,
  billingSummary,
  monthlyTotals,
  onChangeFilters,
  isLoading = false,
  onDelete,
  onCreateTransaction,
  onUpdateTransaction,
}: Props) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    transactionDate: '',
    amount: '',
    isExpense: true,
    category: '',
    memo: '',
    paymentMethodId: '',
    excludeFromBilling: false,
    excludeFromPerformance: false,
  });

  const setFilter = <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => {
    onChangeFilters({ ...filters, [key]: value });
  };

  const categoryOptions = useMemo(() => {
    const existing = categories.filter((category) => Boolean(category));
    if (editingTransaction?.category && !existing.includes(editingTransaction.category)) {
      return [editingTransaction.category, ...existing];
    }
    if (existing.length === 0) {
      return ['기타'];
    }
    return existing;
  }, [categories, editingTransaction?.category]);

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditForm({
      transactionDate: tx.transactionDate,
      amount: String(Math.abs(tx.amount)),
      isExpense: tx.amount < 0,
      category: tx.category ?? '기타',
      memo: tx.memo ?? '',
      paymentMethodId: tx.paymentMethodId ?? '',
      excludeFromBilling: tx.excludeFromBilling,
      excludeFromPerformance: tx.excludeFromPerformance,
    });
  };

  const closeEditModal = () => {
    if (editSubmitting) {
      return;
    }
    setEditingTransaction(null);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !onUpdateTransaction || !editForm.amount || !editForm.transactionDate) {
      return;
    }
    setEditSubmitting(true);
    const rawAmount = parseInt(editForm.amount, 10);
    const signedAmount = editForm.isExpense ? -Math.abs(rawAmount) : Math.abs(rawAmount);

    await onUpdateTransaction(editingTransaction.id, {
      transactionDate: editForm.transactionDate,
      amount: signedAmount,
      category: editForm.category || null,
      memo: editForm.memo || null,
      paymentMethodId: editForm.paymentMethodId || null,
      excludeFromBilling: editForm.excludeFromBilling,
      excludeFromPerformance: editForm.excludeFromPerformance,
      isInstallment: false,
      installmentMonths: 1,
    });

    setEditSubmitting(false);
    setEditingTransaction(null);
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

  /* 결제일 레이블 (개별 row M/D 표시용) — 서버 getBillingMonthKey 로직과 동일 */
  const getBillingLabel = (tx: Transaction): string | null => {
    if (!tx.paymentMethodId) return null;
    const pm = paymentMethods.find(p => p.id === tx.paymentMethodId);
    if (!pm || pm.type !== 'CREDIT' || !pm.billingDay) return null;

    const [yStr, mStr, dStr] = tx.transactionDate.split('-');
    const txYear = Number(yStr);
    const txMonth = Number(mStr);
    const txDay = Number(dStr);
    const startDay = pm.performanceStartDay || 1;

    let winEndYear: number;
    let winEndMonth: number;
    let winEndDay: number;

    if (startDay === 1) {
      winEndYear = txYear;
      winEndMonth = txMonth;
      winEndDay = new Date(txYear, txMonth, 0).getDate();
    } else if (txDay >= startDay) {
      winEndMonth = txMonth + 1;
      winEndYear = txYear;
      if (winEndMonth > 12) { winEndMonth = 1; winEndYear += 1; }
      winEndDay = Math.min(startDay - 1, new Date(winEndYear, winEndMonth, 0).getDate());
    } else {
      winEndYear = txYear;
      winEndMonth = txMonth;
      winEndDay = Math.min(startDay - 1, new Date(txYear, txMonth, 0).getDate());
    }

    const daysInWinEndMonth = new Date(winEndYear, winEndMonth, 0).getDate();
    const clampedBillingDay = Math.min(pm.billingDay, daysInWinEndMonth);
    let bYear = winEndYear;
    let bMonth = winEndMonth;
    if (winEndDay >= clampedBillingDay) {
      bMonth += 1;
      if (bMonth > 12) { bMonth = 1; bYear += 1; }
    }

    const daysInBillingMonth = new Date(bYear, bMonth, 0).getDate();
    const safeDay = Math.min(pm.billingDay, daysInBillingMonth);
    return `결제 ${bMonth}/${safeDay}`;
  };

  /* 통계 값: 수입/지출은 현재 거래 기준, 결제는 서버 집계 */
  const [, cmMonthStr] = currentMonth.split('-');
  const cmMonth = Number(cmMonthStr);
  const nextMonthNum = cmMonth === 12 ? 1 : cmMonth + 1;
  const currentMonthLabel = `${cmMonth}월`;
  const nextMonthLabel = `${nextMonthNum}월`;

  const income = monthlyTotals?.income ?? 0;
  const expense = monthlyTotals?.expense ?? 0;

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

  const toggleSummaryScope = (
    nextScope: TransactionFilters['summaryScope'],
  ) => {
    const resolvedScope = filters.summaryScope === nextScope ? 'all' : nextScope;
    onChangeFilters({ ...filters, summaryScope: resolvedScope });
  };

  return (
    <section className="surface-card p-6" aria-label="거래 내역 검색 및 목록">
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
        <button
          type="button"
          onClick={() => toggleSummaryScope('income')}
          aria-pressed={filters.summaryScope === 'income'}
          className={`text-left px-3 py-2.5 rounded-xl transition-all ${filters.summaryScope === 'income' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/25' : 'surface-soft hover:bg-blue-50/70 dark:hover:bg-blue-950/20'}`}
        >
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">{currentMonthLabel} 수입</p>
          <p className="text-xs sm:text-sm font-bold text-blue-600 tabular-nums truncate">+{moneyFormatter.format(income)}원</p>
        </button>
        <button
          type="button"
          onClick={() => toggleSummaryScope('expense')}
          aria-pressed={filters.summaryScope === 'expense'}
          className={`text-left px-3 py-2.5 rounded-xl transition-all ${filters.summaryScope === 'expense' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/25' : 'surface-soft hover:bg-red-50/70 dark:hover:bg-red-950/20'}`}
        >
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">{currentMonthLabel} 지출</p>
          <p className="text-xs sm:text-sm font-bold text-primary tabular-nums truncate">-{moneyFormatter.format(expense)}원</p>
        </button>
        <button
          type="button"
          onClick={() => toggleSummaryScope('billingCurrent')}
          aria-pressed={filters.summaryScope === 'billingCurrent'}
          className={`text-left rounded-xl px-3 py-2.5 border transition-all ${filters.summaryScope === 'billingCurrent' ? 'ring-2 ring-amber-500 bg-amber-100 dark:bg-amber-950/30' : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/30'}`}
        >
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">{billingSummary?.currentMonthLabel ?? `${currentMonthLabel} 결제`}</p>
          <p className="text-xs sm:text-sm font-bold text-amber-700 tabular-nums truncate">{moneyFormatter.format(billingSummary?.currentMonth ?? 0)}원</p>
        </button>
        <button
          type="button"
          onClick={() => toggleSummaryScope('billingNext')}
          aria-pressed={filters.summaryScope === 'billingNext'}
          className={`text-left rounded-xl px-3 py-2.5 border transition-all ${filters.summaryScope === 'billingNext' ? 'ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-950/30' : 'border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/30'}`}
        >
          <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">{billingSummary?.nextMonthLabel ?? `${nextMonthLabel} 결제 예정`}</p>
          <p className="text-xs sm:text-sm font-bold text-indigo-700 tabular-nums truncate">{moneyFormatter.format(billingSummary?.nextMonth ?? 0)}원</p>
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
                {onUpdateTransaction ? (
                  <button
                    type="button"
                    aria-label={`거래 수정: ${tx.memo || tx.category || tx.transactionDate}`}
                    onClick={() => openEditModal(tx)}
                    className="text-muted hover:text-indigo-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                ) : null}
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

            <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
              <span
                className={tx.excludeFromBilling
                  ? 'text-[10px] px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/35 dark:text-red-300 font-semibold'
                  : 'text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-300 font-semibold'}
              >
                {tx.excludeFromBilling ? '청구제외' : '청구포함'}
              </span>
              <span
                className={tx.excludeFromPerformance
                  ? 'text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300 font-semibold'
                  : 'text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300 font-semibold'}
              >
                {tx.excludeFromPerformance ? '실적제외' : '실적포함'}
              </span>
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
              <th scope="col" className="px-2 sm:px-4 py-3 text-center">상태</th>
              <th scope="col" className="px-2 sm:px-4 py-3 w-24"><span className="sr-only">액션</span></th>
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
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className={tx.excludeFromBilling
                        ? 'text-[10px] px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/35 dark:text-red-300 font-semibold'
                        : 'text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-300 font-semibold'}
                    >
                      {tx.excludeFromBilling ? '청구제외' : '청구포함'}
                    </span>
                    <span
                      className={tx.excludeFromPerformance
                        ? 'text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300 font-semibold'
                        : 'text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300 font-semibold'}
                    >
                      {tx.excludeFromPerformance ? '실적제외' : '실적포함'}
                    </span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    {onUpdateTransaction && (
                      <button
                        type="button"
                        aria-label={`거래 수정: ${tx.memo || tx.category || tx.transactionDate}`}
                        onClick={() => openEditModal(tx)}
                        className="p-1.5 rounded-md text-[color:var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <Pencil size={13} aria-hidden="true" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        aria-label={`거래 삭제: ${tx.memo || tx.category || tx.transactionDate}`}
                        onClick={() => onDelete(tx.id)}
                        className="p-1.5 rounded-md text-[color:var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--danger)]"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
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

      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40">
          <form
            onSubmit={handleEditSubmit}
            className="surface-strong shadow-xl w-full max-w-md p-4 sm:p-6 space-y-4 max-h-[85dvh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-primary">내역 수정</h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-muted hover:text-primary"
                aria-label="내역 수정 창 닫기"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="flex gap-2" role="radiogroup" aria-label="거래 유형 선택">
              <button
                type="button"
                role="radio"
                aria-checked={editForm.isExpense}
                onClick={() => setEditForm((prev) => ({ ...prev, isExpense: true }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  editForm.isExpense ? 'danger-chip' : 'surface-soft text-secondary'
                }`}
              >
                지출
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!editForm.isExpense}
                onClick={() => setEditForm((prev) => ({ ...prev, isExpense: false }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !editForm.isExpense ? 'accent-chip' : 'surface-soft text-secondary'
                }`}
              >
                수입
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="edit-transaction-date">
                  날짜
                </label>
                <input
                  type="date"
                  id="edit-transaction-date"
                  value={editForm.transactionDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, transactionDate: e.target.value }))}
                  className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="edit-transaction-amount">
                  금액
                </label>
                <input
                  type="text"
                  id="edit-transaction-amount"
                  inputMode="numeric"
                  value={formatAmountDisplay(editForm.amount)}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      amount: sanitizeAmountInput(e.target.value),
                    }))
                  }
                  className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="edit-transaction-category">
                  분류
                </label>
                <select
                  id="edit-transaction-category"
                  value={editForm.category}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="edit-transaction-payment-method">
                  결제 수단
                </label>
                <select
                  id="edit-transaction-payment-method"
                  value={editForm.paymentMethodId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, paymentMethodId: e.target.value }))}
                  className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">선택 안 함</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="edit-transaction-memo">
                메모
              </label>
              <input
                id="edit-transaction-memo"
                type="text"
                value={editForm.memo}
                onChange={(e) => setEditForm((prev) => ({ ...prev, memo: e.target.value }))}
                className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={editForm.excludeFromBilling}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, excludeFromBilling: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                청구 제외
              </label>
              <label className="flex items-center gap-2 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={editForm.excludeFromPerformance}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, excludeFromPerformance: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                실적 제외
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="flex-1 surface-soft py-2.5 rounded-lg text-sm font-medium text-secondary"
                disabled={editSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={editSubmitting || !editForm.amount}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editSubmitting ? '저장 중…' : '수정 저장'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
