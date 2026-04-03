"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Landmark,
  Plus,
  Save,
  Trash2,
  ChevronRight,
  Settings,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { PaymentMethod, BenefitTier, PaymentMethodType } from "@/types";

interface PaymentMethodWithTiers extends PaymentMethod {
  benefitTiers: BenefitTier[];
}

interface Props {
  paymentMethods: PaymentMethodWithTiers[];
  onRefresh: () => void;
  enableCarryOver: boolean;
  onToggleCarryOver: (value: boolean) => void;
}

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  CREDIT: "신용카드",
  CHECK: "체크카드",
  ACCOUNT: "입출금 통장",
  CASH: "현금",
};

const DEFAULT_BILLING_DAY = 14;
const DEFAULT_PERFORMANCE_START_DAY = 1;

const clampDay = (value: number) =>
  Math.min(Math.max(Math.round(value), 1), 31);

const toDayNumber = (
  value: number | string | null | undefined,
  fallback: number,
) => {
  const parsed =
    typeof value === "string" ? parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed)) return clampDay(fallback);
  return clampDay(parsed);
};

const getSuggestedPerformanceStartDay = (
  billingDay: number | string | null | undefined,
) => {
  const day = toDayNumber(billingDay, DEFAULT_BILLING_DAY);
  return day >= 14 ? day - 13 : day + 18;
};

const formatPerformanceRangeLabel = (startDay: number) => {
  const day = toDayNumber(startDay, DEFAULT_PERFORMANCE_START_DAY);
  if (day === 1) {
    return "당월 1일 ~ 당월 말일";
  }
  return `전월 ${day}일 ~ 당월 ${day - 1}일`;
};

const normalizeThresholdAmount = (value: string | number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

/* ─── 공통 컴포넌트 ─────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">
      {children}
    </p>
  );
}

function InputBase({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border rounded-lg px-3 py-2 text-sm bg-transparent text-primary
        focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow
        placeholder:text-muted ${className}`}
      style={{ borderColor: "var(--border)" }}
    />
  );
}

function SelectBase({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full border rounded-lg px-3 py-2 text-sm bg-transparent text-primary
        focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow ${className}`}
      style={{ borderColor: "var(--border)" }}
    />
  );
}

/* 일(day) 스테퍼 입력 */
function DayInput({
  id,
  value,
  onChange,
  min = 1,
  max = 31,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const step = (dir: 1 | -1) => onChange(clampDay(value + dir));
  return (
    <div
      className="flex items-center border rounded-lg overflow-hidden"
      style={{ borderColor: "var(--border)" }}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        className="px-3 py-3 text-muted hover:text-primary hover:bg-[color:var(--bg-soft)] transition-colors"
        aria-label={`${id} 감소`}
      >
        <ChevronDown size={14} />
      </button>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clampDay(Number(e.target.value) || min))}
        className="flex-1 text-center text-sm font-semibold text-primary bg-transparent border-none outline-none w-10 py-2 tabular-nums"
        style={{ MozAppearance: "textfield" } as React.CSSProperties}
      />
      <button
        type="button"
        onClick={() => step(1)}
        className="px-3 py-3 text-muted hover:text-primary hover:bg-[color:var(--bg-soft)] transition-colors"
        aria-label={`${id} 증가`}
      >
        <ChevronUp size={14} />
      </button>
    </div>
  );
}

/* ─── ColorPicker ──────────────────────────────────── */

const PRESET_COLORS = [
  "#4f46e5",
  "#0284c7",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#9333ea",
  "#0f766e",
  "#ea580c",
  "#475569",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#6366f1",
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (c: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: preset,
              borderColor:
                value === preset ? "var(--foreground)" : "transparent",
            }}
            aria-label={`색상 ${preset} 선택`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value ?? "#4f46e5"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border"
          style={{ borderColor: "var(--border)" }}
          aria-label="직접 색상 선택"
        />
        <span className="text-xs font-mono text-secondary">
          {value ?? "자동"}
        </span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] text-muted hover:text-primary"
          >
            초기화
          </button>
        ) : (
          <span className="text-[11px] text-muted italic">
            팔레트 자동 할당
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── 메인 SettingsView ─────────────────────────────── */

export default function SettingsView({
  paymentMethods,
  onRefresh,
  enableCarryOver,
  onToggleCarryOver,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    paymentMethods[0]?.id ?? null,
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [carryOverSaving, setCarryOverSaving] = useState(false);

  useEffect(() => {
    if (showAddForm) return;
    if (!selectedId && paymentMethods[0]?.id) {
      setSelectedId(paymentMethods[0].id);
      return;
    }
    if (selectedId && !paymentMethods.some((pm) => pm.id === selectedId)) {
      setSelectedId(paymentMethods[0]?.id ?? null);
    }
  }, [paymentMethods, selectedId, showAddForm]);

  const selected = paymentMethods.find((pm) => pm.id === selectedId);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── 일반 설정 ── */}
      <div className="surface-card p-4">
        <h2 className="text-sm font-bold text-primary mb-3">일반 설정</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary font-medium">이월잔액 표시</p>
            <p className="text-[11px] text-muted mt-0.5">
              이전 달까지의 누적 잔액을 수입에 포함
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enableCarryOver}
            disabled={carryOverSaving}
            onClick={async () => {
              setCarryOverSaving(true);
              onToggleCarryOver(!enableCarryOver);
              setCarryOverSaving(false);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${
              enableCarryOver ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                enableCarryOver ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── 결제수단 설정 ── */}
      <div className="flex flex-col md:flex-row gap-5">
        {/* ── 좌: 결제 수단 목록 ── */}
        <div className="w-full md:w-72 shrink-0 space-y-3">
          <div className="surface-card overflow-hidden">
            <div
              className="flex justify-between items-center px-4 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-sm font-bold text-primary">결제 수단</h2>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full transition-colors"
                aria-label="새 결제 수단 추가"
              >
                <Plus size={12} /> 추가
              </button>
            </div>
            <div className="p-2 space-y-0.5">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(pm.id);
                    setShowAddForm(false);
                  }}
                  aria-label={`${pm.name} 선택`}
                  aria-pressed={selectedId === pm.id}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all text-sm ${
                    selectedId === pm.id && !showAddForm
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-secondary hover:bg-[color:var(--bg-soft)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {pm.type === "CREDIT" || pm.type === "CHECK" ? (
                      <CreditCard size={15} aria-hidden="true" />
                    ) : (
                      <Landmark size={15} aria-hidden="true" />
                    )}
                    <span className="font-medium truncate max-w-[140px]">
                      {pm.name}
                    </span>
                  </div>
                  {selectedId === pm.id && !showAddForm && (
                    <ChevronRight size={14} aria-hidden="true" />
                  )}
                </button>
              ))}
              {paymentMethods.length === 0 && (
                <p className="text-xs text-muted text-center py-6">
                  결제 수단이 없습니다.
                </p>
              )}
            </div>
          </div>
          <div
            className="rounded-xl px-3.5 py-3 text-[11px] text-secondary leading-relaxed border border-dashed"
            style={{ borderColor: "var(--border)" }}
          >
            💡 실적 기준일과 혜택 구간은 대시보드에 즉시 반영됩니다.
          </div>
        </div>

        {/* ── 우: 편집 영역 ── */}
        <div className="flex-1 min-w-0">
          {showAddForm ? (
            <AddPaymentMethodForm
              onCreated={() => {
                setShowAddForm(false);
                onRefresh();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : selected ? (
            <EditPaymentMethodForm
              key={selected.id}
              method={selected}
              onUpdated={onRefresh}
              onDeleted={() => {
                setSelectedId(null);
                onRefresh();
              }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted surface-card p-10 min-h-[300px]">
              <Settings
                size={40}
                aria-hidden="true"
                className="mb-3 opacity-20"
              />
              <p className="text-sm">결제 수단을 선택하거나 추가하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 새 결제 수단 추가 폼 ─────────────────────────── */

function AddPaymentMethodForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PaymentMethodType>("CREDIT");
  const [billingDay, setBillingDay] = useState(DEFAULT_BILLING_DAY);
  const [performanceStartDay, setPerformanceStartDay] = useState(
    getSuggestedPerformanceStartDay(DEFAULT_BILLING_DAY),
  );
  const [isManual, setIsManual] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const suggested = getSuggestedPerformanceStartDay(billingDay);

  const handleTypeChange = (nextType: PaymentMethodType) => {
    setType(nextType);
    if (nextType !== "CREDIT") {
      setIsManual(false);
      setPerformanceStartDay(DEFAULT_PERFORMANCE_START_DAY);
    } else if (!isManual) {
      setPerformanceStartDay(suggested);
    }
  };

  const handleBillingDayChange = (v: number) => {
    setBillingDay(v);
    if (!isManual) setPerformanceStartDay(getSuggestedPerformanceStartDay(v));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        billingDay: type === "CREDIT" ? billingDay : null,
        performanceStartDay:
          type === "CREDIT"
            ? performanceStartDay
            : DEFAULT_PERFORMANCE_START_DAY,
        color,
      }),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="surface-card rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex justify-between items-center px-5 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-bold text-primary">새 결제 수단 추가</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted hover:text-primary p-1"
          aria-label="닫기"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* 이름 + 유형 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>이름 (별칭)</FieldLabel>
            <InputBase
              id="add-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 신한카드"
              autoComplete="off"
            />
          </div>
          <div>
            <FieldLabel>유형</FieldLabel>
            <SelectBase
              id="add-type"
              value={type}
              onChange={(e) =>
                handleTypeChange(e.target.value as PaymentMethodType)
              }
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </SelectBase>
          </div>
        </div>

        {/* 신용카드 전용 날짜 */}
        {type === "CREDIT" && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-t border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <FieldLabel>결제일</FieldLabel>
              <DayInput
                id="add-billing-day"
                value={billingDay}
                onChange={handleBillingDayChange}
              />
              <p className="text-[10px] text-muted mt-1 pl-1">
                카드 대금 납부일
              </p>
            </div>
            <div>
              <FieldLabel>실적 산정 시작일</FieldLabel>
              <DayInput
                id="add-perf-start"
                value={performanceStartDay}
                onChange={(v) => {
                  setIsManual(true);
                  setPerformanceStartDay(v);
                }}
              />
              <div className="flex items-center justify-between mt-1 pl-1 gap-1">
                <p className="text-[10px] text-muted whitespace-nowrap">
                  {formatPerformanceRangeLabel(performanceStartDay)}
                </p>
                {isManual && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManual(false);
                      setPerformanceStartDay(suggested);
                    }}
                    className="text-[10px] text-indigo-500 hover:text-indigo-700 whitespace-nowrap"
                  >
                    추천({suggested}일)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 그래프 색상 */}
        <div className="py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <FieldLabel>그래프 색상</FieldLabel>
          <ColorPicker value={color} onChange={setColor} />
          <p className="text-[10px] text-muted mt-1.5">
            월별 누적 추이 그래프에서 이 결제 수단의 색상으로 표시됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-40 transition-colors"
        >
          <Save size={15} aria-hidden="true" />
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

/* ─── 결제 수단 수정 폼 ─────────────────────────────── */

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
  const [billingDay, setBillingDay] = useState(
    toDayNumber(method.billingDay, DEFAULT_BILLING_DAY),
  );
  const [performanceStartDay, setPerformanceStartDay] = useState(
    toDayNumber(
      method.performanceStartDay,
      getSuggestedPerformanceStartDay(method.billingDay ?? DEFAULT_BILLING_DAY),
    ),
  );
  const [isManual, setIsManual] = useState(false);
  const [color, setColor] = useState<string | null>(method.color ?? null);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState(method.benefitTiers);

  useEffect(() => {
    setName(method.name);
    setType(method.type);
    setBillingDay(toDayNumber(method.billingDay, DEFAULT_BILLING_DAY));
    setPerformanceStartDay(
      toDayNumber(
        method.performanceStartDay,
        getSuggestedPerformanceStartDay(
          method.billingDay ?? DEFAULT_BILLING_DAY,
        ),
      ),
    );
    setIsManual(false);
    setColor(method.color ?? null);
    setTiers(method.benefitTiers);
  }, [method]);

  const suggested = getSuggestedPerformanceStartDay(billingDay);

  const handleTypeChange = (nextType: PaymentMethodType) => {
    setType(nextType);
    if (nextType !== "CREDIT") {
      setIsManual(false);
      setPerformanceStartDay(DEFAULT_PERFORMANCE_START_DAY);
    } else if (!isManual) setPerformanceStartDay(suggested);
  };

  const handleBillingDayChange = (v: number) => {
    setBillingDay(v);
    if (!isManual) setPerformanceStartDay(getSuggestedPerformanceStartDay(v));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/payment-methods/${method.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        billingDay: type === "CREDIT" ? billingDay : null,
        performanceStartDay:
          type === "CREDIT"
            ? performanceStartDay
            : DEFAULT_PERFORMANCE_START_DAY,
        color,
      }),
    });
    setSaving(false);
    onUpdated();
  };

  const handleDelete = async () => {
    if (!confirm(`'${method.name}'을(를) 삭제하시겠습니까?`)) return;
    await fetch(`/api/payment-methods/${method.id}`, { method: "DELETE" });
    onDeleted();
  };

  /* 혜택 구간 */
  const handleAddTier = async () => {
    const maxOrder =
      tiers.length > 0 ? Math.max(...tiers.map((t) => t.sortOrder)) : 0;
    const res = await fetch("/api/benefit-tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethodId: method.id,
        thresholdAmount: 0,
        benefitDesc: "",
        sortOrder: maxOrder + 1,
      }),
    });
    if (!res.ok) return;
    const newTier = (await res.json()) as BenefitTier;
    setTiers((prev) => [...prev, newTier]);
  };

  const handleUpdateTier = (
    tierId: string,
    field: "thresholdAmount" | "benefitDesc",
    value: string,
  ) => {
    setTiers((prev) =>
      prev.map((t) => {
        if (t.id !== tierId) return t;
        if (field === "thresholdAmount") {
          const parsed = value === "" ? 0 : Number(value);
          return {
            ...t,
            thresholdAmount: Number.isFinite(parsed)
              ? parsed
              : t.thresholdAmount,
          };
        }
        return { ...t, benefitDesc: value };
      }),
    );
  };

  const handleSaveTier = async (
    tierId: string,
    patch: Partial<
      Pick<BenefitTier, "thresholdAmount" | "benefitDesc" | "sortOrder">
    > = {},
  ) => {
    const currentTier = tiers.find((t) => t.id === tierId);
    if (!currentTier) return;
    const merged: BenefitTier = { ...currentTier, ...patch };
    setTiers((prev) => prev.map((t) => (t.id === tierId ? merged : t)));
    await fetch(`/api/benefit-tiers/${tierId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thresholdAmount: merged.thresholdAmount,
        benefitDesc: merged.benefitDesc,
        sortOrder: merged.sortOrder,
      }),
    });
  };

  const handleDeleteTier = async (tierId: string) => {
    await fetch(`/api/benefit-tiers/${tierId}`, { method: "DELETE" });
    setTiers((prev) => prev.filter((t) => t.id !== tierId));
  };

  return (
    <div className="surface-card rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex justify-between items-center px-5 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <h3 className="text-sm font-bold text-primary">{method.name}</h3>
          <p className="text-[10px] text-muted mt-0.5">{TYPE_LABELS[type]}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label={`${method.name} 삭제`}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-xs font-semibold disabled:opacity-40 transition-colors"
          >
            <Save size={14} aria-hidden="true" /> {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* 이름 + 유형 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>이름 (별칭)</FieldLabel>
            <InputBase
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>유형</FieldLabel>
            <SelectBase
              id="edit-type"
              value={type}
              onChange={(e) =>
                handleTypeChange(e.target.value as PaymentMethodType)
              }
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </SelectBase>
          </div>
        </div>

        {/* 신용카드 전용: 결제일 + 산정일 */}
        {type === "CREDIT" && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-t border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <FieldLabel>결제일</FieldLabel>
              <DayInput
                id="edit-billing-day"
                value={billingDay}
                onChange={handleBillingDayChange}
              />
              <p className="text-[10px] text-muted mt-1 pl-1">
                카드 대금 납부일
              </p>
            </div>
            <div>
              <FieldLabel>실적 산정 시작일</FieldLabel>
              <DayInput
                id="edit-perf-start"
                value={performanceStartDay}
                onChange={(v) => {
                  setIsManual(true);
                  setPerformanceStartDay(v);
                }}
              />
              <div className="flex items-center justify-between mt-1 pl-1 gap-1">
                <p className="text-[10px] text-muted whitespace-nowrap truncate">
                  {formatPerformanceRangeLabel(performanceStartDay)}
                </p>
                {isManual && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManual(false);
                      setPerformanceStartDay(suggested);
                    }}
                    className="text-[10px] text-indigo-500 hover:text-indigo-700 whitespace-nowrap shrink-0"
                  >
                    추천({suggested}일)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 그래프 색상 */}
        <div className="py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <FieldLabel>그래프 색상</FieldLabel>
          <ColorPicker value={color} onChange={setColor} />
          <p className="text-[10px] text-muted mt-1.5">
            월별 누적 추이 그래프에서 이 결제 수단의 색상으로 표시됩니다.
          </p>
        </div>

        {/* 혜택 구간 (신용카드만) */}
        {type === "CREDIT" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                🎁 혜택 구간
              </h4>
              <button
                type="button"
                onClick={handleAddTier}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
              >
                <Plus size={12} /> 구간 추가
              </button>
            </div>

            <div className="space-y-2">
              {tiers.length === 0 ? (
                <div
                  className="rounded-lg border border-dashed text-center text-xs text-muted py-6"
                  style={{ borderColor: "var(--border)" }}
                >
                  혜택 구간을 추가해보세요
                </div>
              ) : (
                tiers.map((tier, idx) => (
                  <div
                    key={tier.id}
                    className="grid items-center gap-2 rounded-lg px-3 py-2.5"
                    style={{
                      backgroundColor: "var(--bg-soft)",
                      gridTemplateColumns: "28px 1fr 1.6fr 28px",
                    }}
                  >
                    {/* 레벨 */}
                    <span className="text-[10px] font-bold text-muted text-center">
                      Lv{idx + 1}
                    </span>

                    {/* 기준 금액 */}
                    <div className="relative">
                      <input
                        id={`tier-threshold-${tier.id}`}
                        aria-label={`${idx + 1}단계 기준 금액`}
                        type="number"
                        min="0"
                        value={
                          tier.thresholdAmount === 0 ? "" : tier.thresholdAmount
                        }
                        onChange={(e) =>
                          handleUpdateTier(
                            tier.id,
                            "thresholdAmount",
                            e.target.value,
                          )
                        }
                        onBlur={(e) => {
                          void handleSaveTier(tier.id, {
                            thresholdAmount: normalizeThresholdAmount(
                              e.target.value,
                            ),
                          });
                        }}
                        placeholder="기준 금액"
                        className="w-full border rounded-lg pl-2 pr-6 py-1.5 text-xs bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted pointer-events-none">
                        원↑
                      </span>
                    </div>

                    {/* 혜택 설명 */}
                    <input
                      id={`tier-desc-${tier.id}`}
                      aria-label={`${idx + 1}단계 혜택 설명`}
                      type="text"
                      value={tier.benefitDesc}
                      onChange={(e) =>
                        handleUpdateTier(tier.id, "benefitDesc", e.target.value)
                      }
                      onBlur={(e) => {
                        void handleSaveTier(tier.id, {
                          benefitDesc: e.target.value,
                        });
                      }}
                      placeholder="혜택 내용"
                      className="w-full border rounded-lg px-2 py-1.5 text-xs bg-transparent text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      style={{ borderColor: "var(--border)" }}
                    />

                    {/* 삭제 */}
                    <button
                      type="button"
                      aria-label={`Lv${idx + 1} 삭제`}
                      onClick={() => handleDeleteTier(tier.id)}
                      className="text-muted hover:text-red-500 flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
