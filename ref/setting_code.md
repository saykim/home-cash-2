import React, { useState } from 'react';
import {
CreditCard, Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle,
Plus, Settings, Save, Trash2, ChevronRight, Landmark
} from 'lucide-react';

// [Type Definitions]
type BenefitTier = {
id: number;
threshold: number;
benefit: string;
achieved: boolean;
};

type PaymentMethod = {
id: number;
name: string;
type: 'CREDIT' | 'CHECK' | 'ACCOUNT' | 'CASH';
billingDate?: number; // 결제일 (신용카드)
performanceStartDay?: number; // 실적 산정 시작일 (1 = 전월 1일)
targetTiers: BenefitTier[];
currentPerformance?: number; // 현재 실적 (대시보드용)
nextTierRemaining?: number; // 다음 단계까지 남은 금액 (대시보드용)
};

// [Mock Data] 초기 데이터
const initialPaymentMethods: PaymentMethod[] = [
{
id: 1,
name: '가족카드 (신한)',
type: 'CREDIT',
billingDate: 14,
performanceStartDay: 1, // 전월 1일 ~ 말일
currentPerformance: 1350000,
nextTierRemaining: 150000,
targetTiers: [
{ id: 101, threshold: 300000, benefit: '대중교통 10%', achieved: true },
{ id: 102, threshold: 600000, benefit: '커피 쿠폰 2매', achieved: true },
{ id: 103, threshold: 1000000, benefit: '주유 60원/L', achieved: true },
{ id: 104, threshold: 1500000, benefit: '쇼핑 5% 캐시백', achieved: false },
],
},
{
id: 2,
name: '개인카드 (현대)',
type: 'CREDIT',
billingDate: 25,
performanceStartDay: 1,
currentPerformance: 380000,
nextTierRemaining: 320000,
targetTiers: [
{ id: 201, threshold: 300000, benefit: '통신비 할인', achieved: true },
{ id: 202, threshold: 700000, benefit: 'M포인트 2%', achieved: false },
],
},
{
id: 3,
name: '급여통장 (국민)',
type: 'ACCOUNT',
targetTiers: [],
}
];

const mockTransactions = [
{ id: 1, date: '2026-02-10', category: '생활', desc: '이마트 장보기', amount: -150000, method: '가족카드', excluded: false },
{ id: 2, date: '2026-02-11', category: '고정', desc: '아파트 관리비', amount: -280000, method: '가족카드', excluded: true },
{ id: 3, date: '2026-02-12', category: '수입', desc: '급여', amount: 4200000, method: '급여통장', excluded: false },
];

const mockSummary = {
month: '2026-02',
income: 4600000,
expense: 2750000,
balance: 1850000,
};

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
const Dashboard = () => {
const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods);

return (

<div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
<div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header & Navigation */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">우리집 가계부</h1>
            <p className="text-sm text-gray-500">Macro Money Manager</p>
          </div>

          <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              대시보드
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              설정 (기준정보)
            </button>
          </div>
        </header>

        {/* Content Area */}
        {activeTab === 'dashboard' ? (
          <DashboardView
            summary={mockSummary}
            paymentMethods={paymentMethods.filter(pm => pm.type === 'CREDIT')}
            transactions={mockTransactions}
          />
        ) : (
          <SettingsView
            paymentMethods={paymentMethods}
            setPaymentMethods={setPaymentMethods}
          />
        )}

      </div>
    </div>

);
};

// ----------------------------------------------------------------------
// View 1: Dashboard (기존 뷰)
// ----------------------------------------------------------------------
const DashboardView = ({ summary, paymentMethods, transactions }: any) => {
const isDeficit = summary.balance < 0;

return (

<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
{/_ 1. Cashflow Summary _/}
<section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
<div className="flex justify-between items-center mb-4">
<h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
{summary.month} Cashflow
</h2>
<button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1">
<Plus size={16} /> 내역 입력
</button>
</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="pb-4 md:pb-0">
            <span className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp size={16} className="text-blue-500" /> 수입
            </span>
            <p className="text-2xl font-bold text-blue-600">
              {summary.income.toLocaleString()}
            </p>
          </div>
          <div className="py-4 md:py-0">
            <span className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingDown size={16} className="text-red-500" /> 지출
            </span>
            <p className="text-2xl font-bold text-red-600">
              {summary.expense.toLocaleString()}
            </p>
          </div>
          <div className="pt-4 md:pt-0">
            <span className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-1">
              <Wallet size={16} className={isDeficit ? "text-red-500" : "text-green-500"} /> 잔액
            </span>
            <p className={`text-2xl font-bold ${isDeficit ? "text-red-500" : "text-green-600"}`}>
              {summary.balance > 0 ? "+" : ""}{summary.balance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Alert Message */}
        <div className={`mt-6 p-3 rounded-lg flex items-start gap-3 text-sm ${isDeficit ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>
            {isDeficit
              ? "주의: 지출이 수입을 초과했습니다. 비상금을 확인하세요."
              : "안정적입니다. 이대로라면 이번 달 185만원 저축 가능합니다."}
          </p>
        </div>
      </section>

      {/* 2. Card Performance Gauge */}
      <section className="grid gap-4">
        <h2 className="text-lg font-bold text-gray-900 px-1">카드 실적 현황</h2>

        {paymentMethods.map((card: PaymentMethod) => {
          if (!card.targetTiers || card.targetTiers.length === 0) return null;

          const nextTier = card.targetTiers.find(t => !t.achieved);
          const maxThreshold = card.targetTiers[card.targetTiers.length - 1].threshold;
          const percentage = Math.min(((card.currentPerformance || 0) / maxThreshold) * 100, 100);

          return (
            <div key={card.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <CreditCard size={18} className="text-indigo-500" />
                    {card.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">결제일: 매월 {card.billingDate}일</p>
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-bold text-gray-900">
                    {(card.currentPerformance || 0).toLocaleString()}원
                  </span>
                  <span className="text-xs text-gray-500">실적 인정 금액</span>
                </div>
              </div>

              {/* Gauge Bar */}
              <div className="relative h-4 bg-gray-100 rounded-full mb-4">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-1000"
                  style={{ width: `${percentage}%` }}
                ></div>
                {card.targetTiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 h-full w-0.5 bg-white mix-blend-overlay z-10"
                    style={{ left: `${(tier.threshold / maxThreshold) * 100}%` }}
                  ></div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-lg">
                {nextTier ? (
                  <>
                    <span className="text-gray-600">
                      다음 혜택: <span className="font-semibold text-indigo-700">{nextTier.benefit}</span>
                    </span>
                    <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-gray-200 text-gray-500">
                      {(card.nextTierRemaining || 0).toLocaleString()}원 더 쓰면 달성 🔥
                    </span>
                  </>
                ) : (
                  <span className="text-green-600 font-medium flex items-center gap-1 w-full justify-center">
                    <CheckCircle size={16} /> 모든 혜택 달성 완료!
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. Transaction List */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">최근 내역 요약</h2>
        <div className="overflow-hidden">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">날짜</th>
                <th className="px-4 py-3">구분</th>
                <th className="px-4 py-3">내역</th>
                <th className="px-4 py-3 text-right">금액</th>
                <th className="px-4 py-3 text-center">실적</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{tx.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tx.amount > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {tx.desc}
                    <span className="block text-xs text-gray-400 font-normal">{tx.method}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${tx.amount > 0 ? "text-blue-600" : "text-gray-900"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                      {tx.excluded ? (
                        <span className="text-xs text-gray-400 line-through decoration-gray-400">제외</span>
                      ) : (
                        <span className="text-xs text-green-600">포함</span>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>

);
};

// ----------------------------------------------------------------------
// View 2: Settings (새로 추가된 기준정보 관리 뷰)
// ----------------------------------------------------------------------
const SettingsView = ({ paymentMethods, setPaymentMethods }: { paymentMethods: PaymentMethod[], setPaymentMethods: any }) => {
const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);

// 선택된 결제 수단이 없으면 첫 번째 항목 선택 (UX 편의상)
if (selectedMethodId === null && paymentMethods.length > 0) {
setSelectedMethodId(paymentMethods[0].id);
}

const selectedMethod = paymentMethods.find(pm => pm.id === selectedMethodId);

return (

<div className="flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. Left Sidebar: List of Payment Methods */}
      <div className="w-full md:w-1/3 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">결제 수단 관리</h2>
            <button className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1">
              <Plus size={14} /> 추가
            </button>
          </div>
          <div className="space-y-2">
            {paymentMethods.map(pm => (
              <button
                key={pm.id}
                onClick={() => setSelectedMethodId(pm.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                  selectedMethodId === pm.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  {pm.type === 'CREDIT' ? <CreditCard size={18} /> : <Landmark size={18} />}
                  <span className="font-medium text-sm">{pm.name}</span>
                </div>
                {selectedMethodId === pm.id && <ChevronRight size={16} />}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-800 leading-relaxed">
            💡 <strong>Tip:</strong> 여기서 설정한 '실적 기준일'과 '혜택 구간'은 대시보드 게이지에 즉시 반영됩니다.
        </div>
      </div>

      {/* 2. Right Content: Edit Form */}
      <div className="w-full md:w-2/3">
        {selectedMethod ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedMethod.name} 수정</h3>
                <p className="text-xs text-gray-500">ID: {selectedMethod.id}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="삭제">
                    <Trash2 size={18} />
                </button>
                <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">
                    <Save size={16} /> 저장
                </button>
              </div>
            </div>

            {/* Basic Info Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">이름 (별칭)</label>
                <input
                  type="text"
                  defaultValue={selectedMethod.name}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">유형</label>
                <select
                  defaultValue={selectedMethod.type}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="CREDIT">신용카드</option>
                  <option value="CHECK">체크카드</option>
                  <option value="ACCOUNT">입출금 통장</option>
                  <option value="CASH">현금</option>
                </select>
              </div>

              {selectedMethod.type === 'CREDIT' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                        결제일 <span className="text-xs font-normal text-gray-400">(자금 흐름용)</span>
                    </label>
                    <div className="relative">
                        <input
                        type="number"
                        defaultValue={selectedMethod.billingDate}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-8"
                        />
                        <span className="absolute right-3 top-2 text-gray-400 text-sm">일</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                        실적 산정 기준 <span className="text-xs font-normal text-gray-400">(혜택 계산용)</span>
                    </label>
                    <select
                      defaultValue={selectedMethod.performanceStartDay}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="1">전월 1일 ~ 전월 말일</option>
                      <option value="user_billing">전월 결제일 기준</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Benefit Tiers Editor */}
            {selectedMethod.type === 'CREDIT' && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    🎁 혜택 구간 설정
                  </h4>
                  <button className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
                    <Plus size={14} /> 구간 추가
                  </button>
                </div>

                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  {selectedMethod.targetTiers.length === 0 ? (
                      <div className="text-center text-gray-400 text-xs py-4">등록된 혜택 구간이 없습니다.</div>
                  ) : (
                    selectedMethod.targetTiers.map((tier, idx) => (
                        <div key={tier.id} className="flex gap-2 items-center">
                        <div className="w-8 text-xs text-gray-400 font-medium text-center">Lv.{idx + 1}</div>
                        <div className="flex-1 relative">
                            <input
                            type="number"
                            defaultValue={tier.threshold}
                            className="w-full border border-gray-200 rounded p-1.5 text-sm pl-2"
                            placeholder="기준 실적"
                            />
                            <span className="absolute right-2 top-1.5 text-xs text-gray-400">원 이상</span>
                        </div>
                        <div className="flex-[2]">
                            <input
                            type="text"
                            defaultValue={tier.benefit}
                            className="w-full border border-gray-200 rounded p-1.5 text-sm"
                            placeholder="혜택 내용 (예: 통신비 할인)"
                            />
                        </div>
                        <button className="text-gray-400 hover:text-red-500 p-1">
                            <Trash2 size={14} />
                        </button>
                        </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm p-10">
            <Settings size={48} className="mb-4 opacity-20" />
            <p>왼쪽 목록에서 관리할 결제 수단을 선택하세요.</p>
          </div>
        )}
      </div>
    </div>

);
};

export default Dashboard;
