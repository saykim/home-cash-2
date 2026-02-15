'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { PaymentMethod, CreateTransactionDTO } from '@/types';

interface Props {
  paymentMethods: PaymentMethod[];
  onSubmit: (dto: CreateTransactionDTO) => Promise<void>;
}

const CATEGORIES = ['생활', '고정', '외식', '교통', '통신', '쇼핑', '의료', '교육', '급여', '수입', '기타'];

export default function TransactionForm({ paymentMethods, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    transactionDate: today,
    amount: '',
    isExpense: true,
    category: '생활',
    memo: '',
    paymentMethodId: paymentMethods[0]?.id ?? '',
    excludeFromBilling: false,
    excludeFromPerformance: false,
  });

  const resetForm = () => {
    setForm({
      transactionDate: today,
      amount: '',
      isExpense: true,
      category: '생활',
      memo: '',
      paymentMethodId: paymentMethods[0]?.id ?? '',
      excludeFromBilling: false,
      excludeFromPerformance: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.transactionDate) return;

    setSubmitting(true);
    const rawAmount = parseInt(form.amount, 10);
    const amount = form.isExpense ? -Math.abs(rawAmount) : Math.abs(rawAmount);

    await onSubmit({
      transactionDate: form.transactionDate,
      amount,
      category: form.category,
      memo: form.memo || null,
      paymentMethodId: form.paymentMethodId || null,
      excludeFromBilling: form.excludeFromBilling,
      excludeFromPerformance: form.excludeFromPerformance,
    });
    setSubmitting(false);
    resetForm();
    setOpen(false);
  };

      if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="accent-chip hover:brightness-95 text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg"
      >
        <Plus size={16} aria-hidden="true" /> 내역 입력
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="surface-strong rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-slide-up"
      >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">내역 입력</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted hover:text-primary"
          aria-label="내역 입력 창 닫기"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="flex gap-2" role="radiogroup" aria-label="거래 유형 선택">
        <button
          type="button"
          role="radio"
          aria-checked={form.isExpense}
          onClick={() => setForm(f => ({ ...f, isExpense: true }))}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            form.isExpense ? 'danger-chip' : 'surface-soft text-secondary'
          }`}
          >
            지출
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!form.isExpense}
          onClick={() => setForm(f => ({ ...f, isExpense: false }))}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            !form.isExpense ? 'accent-chip' : 'surface-soft text-secondary'
          }`}
          >
            수입
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="transaction-date">
              날짜
            </label>
            <input
              type="date"
              id="transaction-date"
              name="transactionDate"
              autoComplete="off"
              value={form.transactionDate}
              onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))}
              className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="transaction-amount">
              금액
            </label>
            <input
              type="number"
              id="transaction-amount"
              name="amount"
              autoComplete="off"
              inputMode="numeric"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0…"
              className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="transaction-category">
              분류
            </label>
            <select
              id="transaction-category"
              name="category"
              autoComplete="off"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="transaction-payment-method">
              결제 수단
            </label>
            <select
              id="transaction-payment-method"
              name="paymentMethodId"
              autoComplete="off"
              value={form.paymentMethodId}
              onChange={e => setForm(f => ({ ...f, paymentMethodId: e.target.value }))}
              className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">선택 안 함</option>
              {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
            </select>
          </div>
        </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1" htmlFor="transaction-memo">
              메모
            </label>
            <input
              id="transaction-memo"
              name="memo"
              autoComplete="off"
              type="text"
              value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              placeholder="예: 이마트 장보기…"
              className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              checked={form.excludeFromBilling}
              onChange={e => setForm(f => ({ ...f, excludeFromBilling: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            청구 제외
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              checked={form.excludeFromPerformance}
              onChange={e => setForm(f => ({ ...f, excludeFromPerformance: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            실적 제외
          </label>
        </div>

          <button
            type="submit"
            name="submitTransaction"
            disabled={submitting || !form.amount}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '저장 중…' : '저장'}
          </button>
        </form>
      </div>
  );
}
