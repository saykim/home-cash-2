'use client';

import { useState } from 'react';
import {
  CreditCard, Landmark, Plus, Save, Trash2, ChevronRight, Settings, X,
} from 'lucide-react';
import type { PaymentMethod, BenefitTier, PaymentMethodType } from '@/types';

interface PaymentMethodWithTiers extends PaymentMethod {
  benefitTiers: BenefitTier[];
}

interface Props {
  paymentMethods: PaymentMethodWithTiers[];
  onRefresh: () => void;
}

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  CREDIT: '신용카드',
  CHECK: '체크카드',
  ACCOUNT: '입출금 통장',
  CASH: '현금',
};

export default function SettingsView({ paymentMethods, onRefresh }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    paymentMethods[0]?.id ?? null
  );
  const [showAddForm, setShowAddForm] = useState(false);

  const selected = paymentMethods.find(pm => pm.id === selectedId);

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in">
      <div className="w-full md:w-1/3 space-y-4">
        <div className="surface-card rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-primary">결제 수단 관리</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1"
              aria-label="새 결제 수단 추가"
            >
              <Plus size={14} aria-hidden="true" /> 추가
            </button>
          </div>
          <div className="space-y-2">
            {paymentMethods.map(pm => (
               <button
                key={pm.id}
                onClick={() => { setSelectedId(pm.id); setShowAddForm(false); }}
                aria-label={`${pm.name} 선택`}
                aria-pressed={selectedId === pm.id}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                  selectedId === pm.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'surface-soft text-secondary hover:brightness-95'
                }`}
              >
                <div className="flex items-center gap-3">
                  {pm.type === 'CREDIT' || pm.type === 'CHECK'
                    ? <CreditCard size={18} aria-hidden="true" />
                    : <Landmark size={18} aria-hidden="true" />}
                  <span className="font-medium text-sm">{pm.name}</span>
                </div>
                {selectedId === pm.id && <ChevronRight size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>

        <div className="accent-chip p-4 rounded-xl text-xs leading-relaxed">
          💡 <strong>Tip:</strong> 여기서 설정한 &apos;실적 기준일&apos;과 &apos;혜택 구간&apos;은 대시보드 게이지에 즉시 반영됩니다.
        </div>
      </div>

      <div className="w-full md:w-2/3">
        {showAddForm ? (
          <AddPaymentMethodForm
            onCreated={() => { setShowAddForm(false); onRefresh(); }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : selected ? (
          <EditPaymentMethodForm
            key={selected.id}
            method={selected}
            onUpdated={onRefresh}
            onDeleted={() => { setSelectedId(null); onRefresh(); }}
          />
        ) : (
           <div className="h-full flex flex-col items-center justify-center text-muted surface-card rounded-xl p-10 min-h-[300px]">
            <Settings size={48} aria-hidden="true" className="mb-4 opacity-20" />
            <p>왼쪽 목록에서 관리할 결제 수단을 선택하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddPaymentMethodForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethodType>('CREDIT');
  const [billingDay, setBillingDay] = useState('14');
  const [performanceStartDay, setPerformanceStartDay] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await fetch('/api/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type,
        billingDay: type === 'CREDIT' ? parseInt(billingDay, 10) : null,
        performanceStartDay,
      }),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="surface-card rounded-xl p-6 space-y-6">
      <div className="flex justify-between items-start border-b pb-4" style={{ borderColor: 'var(--border)' }}>
        <h3 id="add-payment-title" className="text-lg font-bold text-primary">새 결제 수단 추가</h3>
        <button
          onClick={onCancel}
          className="text-muted hover:text-primary"
          aria-label="새 결제 수단 추가 창 닫기"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-labelledby="add-payment-title">
        <div>
          <label htmlFor="add-payment-name" className="block text-xs font-semibold text-secondary mb-1">이름 (별칭)</label>
          <input
            id="add-payment-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="예: 신한카드"
            autoComplete="off"
            className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="add-payment-type" className="block text-xs font-semibold text-secondary mb-1">유형</label>
          <select
            id="add-payment-type"
            value={type}
            onChange={e => setType(e.target.value as PaymentMethodType)}
            className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {type === 'CREDIT' && (
          <>
            <div>
              <label htmlFor="add-payment-billing-day" className="block text-xs font-semibold text-secondary mb-1">결제일</label>
              <div className="relative">
                <input
                  id="add-payment-billing-day"
                  type="number"
                  value={billingDay}
                  onChange={e => setBillingDay(e.target.value)}
                  min="1"
                  max="31"
                  className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-2 text-muted text-sm">일</span>
              </div>
            </div>
            <div>
              <label htmlFor="add-payment-performance-start" className="block text-xs font-semibold text-secondary mb-1">실적 산정 기준</label>
              <select
                id="add-payment-performance-start"
                value={performanceStartDay}
                onChange={e => setPerformanceStartDay(parseInt(e.target.value, 10))}
                className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={1}>전월 1일 ~ 전월 말일</option>
              </select>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
      >
        <Save size={16} aria-hidden="true" /> {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}

function EditPaymentMethodForm({
  method,
  onUpdated,
  onDeleted,
}: {
  method: PaymentMethodWithTiers;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(method.name);
  const [type, setType] = useState<PaymentMethodType>(method.type);
  const [billingDay, setBillingDay] = useState(String(method.billingDay ?? ''));
  const [performanceStartDay, setPerformanceStartDay] = useState(method.performanceStartDay);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState(method.benefitTiers);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/payment-methods/${method.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type,
        billingDay: type === 'CREDIT' ? parseInt(billingDay, 10) || null : null,
        performanceStartDay,
      }),
    });
    setSaving(false);
    onUpdated();
  };

  const handleDelete = async () => {
    if (!confirm(`'${method.name}'을(를) 삭제하시겠습니까?`)) return;
    await fetch(`/api/payment-methods/${method.id}`, { method: 'DELETE' });
    onDeleted();
  };

  const handleAddTier = async () => {
    const maxOrder = tiers.length > 0 ? Math.max(...tiers.map(t => t.sortOrder)) : 0;
    const res = await fetch('/api/benefit-tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethodId: method.id,
        thresholdAmount: 0,
        benefitDesc: '',
        sortOrder: maxOrder + 1,
      }),
    });
    const newTier = await res.json() as BenefitTier;
    setTiers(prev => [...prev, newTier]);
  };

  const handleUpdateTier = async (tierId: string, field: 'thresholdAmount' | 'benefitDesc', value: string) => {
    setTiers(prev =>
      prev.map(t =>
        t.id === tierId
          ? { ...t, [field]: field === 'thresholdAmount' ? parseInt(value, 10) || 0 : value }
          : t
      )
    );
  };

  const handleSaveTier = async (tier: BenefitTier) => {
    await fetch(`/api/benefit-tiers/${tier.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thresholdAmount: tier.thresholdAmount,
        benefitDesc: tier.benefitDesc,
        sortOrder: tier.sortOrder,
      }),
    });
  };

  const handleDeleteTier = async (tierId: string) => {
    await fetch(`/api/benefit-tiers/${tierId}`, { method: 'DELETE' });
    setTiers(prev => prev.filter(t => t.id !== tierId));
  };

  return (
    <div className="surface-card rounded-xl p-6 space-y-6">
      <div className="flex justify-between items-start border-b pb-4" style={{ borderColor: 'var(--border)' }}>
         <div>
           <h3 id="edit-payment-title" className="text-lg font-bold text-primary">{method.name} 수정</h3>
           <p className="text-xs text-secondary">ID: {method.id.slice(0, 8)}...</p>
         </div>
         <div className="flex gap-2">
           <button
             onClick={handleDelete}
             className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
             aria-label={`${method.name} 삭제`}
             title="삭제"
           >
             <Trash2 size={18} aria-hidden="true" />
           </button>
           <button
             onClick={handleSave}
             disabled={saving}
             aria-label="결제 수단 수정 저장"
             className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
           >
             <Save size={16} aria-hidden="true" /> {saving ? '저장 중...' : '저장'}
           </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-labelledby="edit-payment-title">
        <div>
          <label htmlFor="edit-payment-name" className="block text-xs font-semibold text-secondary mb-1">이름 (별칭)</label>
          <input
            id="edit-payment-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="edit-payment-type" className="block text-xs font-semibold text-secondary mb-1">유형</label>
          <select
            id="edit-payment-type"
            value={type}
            onChange={e => setType(e.target.value as PaymentMethodType)}
            className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {type === 'CREDIT' && (
          <>
            <div>
              <label htmlFor="edit-payment-billing-day" className="block text-xs font-semibold text-secondary mb-1">
                결제일 <span className="text-xs font-normal text-muted">(자금 흐름용)</span>
              </label>
              <div className="relative">
                <input
                  id="edit-payment-billing-day"
                  type="number"
                  value={billingDay}
                  onChange={e => setBillingDay(e.target.value)}
                  min="1"
                  max="31"
                  className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-2 text-muted text-sm">일</span>
              </div>
            </div>
            <div>
              <label htmlFor="edit-payment-performance-start" className="block text-xs font-semibold text-secondary mb-1">
                실적 산정 기준 <span className="text-xs font-normal text-muted">(혜택 계산용)</span>
              </label>
              <select
                id="edit-payment-performance-start"
                value={performanceStartDay}
                onChange={e => setPerformanceStartDay(parseInt(e.target.value, 10))}
                className="w-full border rounded-lg p-2 text-sm bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={1}>전월 1일 ~ 전월 말일</option>
              </select>
            </div>
          </>
        )}
      </div>

      {type === 'CREDIT' && (
        <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
              🎁 혜택 구간 설정
            </h4>
            <button
              aria-label="혜택 구간 추가"
              onClick={handleAddTier}
              className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"
            >
              <Plus size={14} aria-hidden="true" /> 구간 추가
            </button>
          </div>

          <div className="space-y-3 surface-soft p-4 rounded-lg">
            {tiers.length === 0 ? (
              <div className="text-center text-muted text-xs py-4">등록된 혜택 구간이 없습니다.</div>
            ) : (
              tiers.map((tier, idx) => (
                <div key={tier.id} className="flex gap-2 items-center">
                  <div className="w-8 text-xs text-muted font-medium text-center">Lv.{idx + 1}</div>
                  <div className="flex-1 relative">
                    <input
                      id={`edit-tier-threshold-${tier.id}`}
                      aria-label={`${idx + 1}단계 실적 기준 금액`}
                      type="number"
                      value={tier.thresholdAmount}
                      onChange={e => handleUpdateTier(tier.id, 'thresholdAmount', e.target.value)}
                      onBlur={() => handleSaveTier(tier)}
                      className="w-full border rounded p-1.5 text-sm pl-2 bg-transparent text-primary"
                      placeholder="기준 실적"
                    />
                    <span className="absolute right-2 top-1.5 text-xs text-muted">원 이상</span>
                  </div>
                  <div className="flex-[2]">
                    <input
                      id={`edit-tier-desc-${tier.id}`}
                      aria-label={`${idx + 1}단계 혜택 설명`}
                      type="text"
                      value={tier.benefitDesc}
                      onChange={e => handleUpdateTier(tier.id, 'benefitDesc', e.target.value)}
                      onBlur={() => handleSaveTier(tier)}
                      className="w-full border rounded p-1.5 text-sm bg-transparent text-primary"
                      placeholder="혜택 내용 (예: 통신비 할인)"
                    />
                  </div>
                  <button
                    aria-label={`혜택 구간 ${idx + 1} 삭제`}
                    onClick={() => handleDeleteTier(tier.id)}
                    className="text-muted hover:text-red-500 p-1"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
