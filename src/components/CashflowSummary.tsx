"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  X,
  BookOpen,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  ListChecks,
} from "lucide-react";
import type { CashflowSummary as CashflowData } from "@/types";

interface Props {
  summary: CashflowData;
}

const GUIDE_SECTIONS = [
  {
    icon: <BarChart3 size={16} />,
    title: "대시보드",
    items: [
      "< 연도 월 > 버튼으로 과거/미래 월 탐색",
      "수입 · 지출 · 잔액을 한눈에 파악",
      "이월잔액: 이전 달까지 누적 잔액이 자동 이월 (설정에서 ON/OFF)",
      "잔액 기준 저축 가능액 자동 계산",
    ],
  },
  {
    icon: <CreditCard size={16} />,
    title: "카드 실적 현황",
    items: [
      "카드별 실적 · 다음 혜택 달성까지 남은 금액 확인",
      "산정기간(예: 1/20~2/19)과 결제 예정일(예: 3/1) 표시",
      "결제일 전까지 이전 실적기간 결제 대기 금액 함께 표시",
      "카드 클릭 → 실적 기간 내 거래 상세 목록",
    ],
  },
  {
    icon: <ListChecks size={16} />,
    title: "내역 관리",
    items: [
      "사용일 · 결제 예정일 동시 표시",
      "당월 결제 / 익월 결제 예정 금액을 결제일 기준으로 정확 집계",
      "분류 · 결제수단 · 실적 포함여부 필터",
      "+ 버튼으로 지출/수입 직접 등록",
    ],
  },
  {
    icon: <Calendar size={16} />,
    title: "입력 옵션",
    items: [
      "청구 제외 — 취소·환불 등 실제 결제되지 않는 거래 (결제 예정액에서 자동 차감)",
      "실적 제외 — 관리비·보험료 등 카드사 실적 미인정 항목",
    ],
  },
  {
    icon: <Settings size={16} />,
    title: "설정",
    items: [
      "결제 수단 추가 · 이름 · 결제일 · 실적 산정 시작일 관리",
      "혜택 구간 설정 (예: 30만원 달성 시 캐시백 1%)",
      "산정 시작일에 따라 실적 기간 자동 계산",
      "이월잔액 표시 ON/OFF",
    ],
  },
];

export default function CashflowSummary({ summary }: Props) {
  const [showGuide, setShowGuide] = useState(false);
  const totalBalance = summary.carryOver + summary.balance;
  const isDeficit = totalBalance < 0;
  const savingsAmount = Math.floor(totalBalance / 10000);

  return (
    <>
      <section className="surface-card rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            {summary.month} Cashflow
          </h2>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="pb-4 md:pb-0">
            <span className="flex items-center justify-center gap-2 text-secondary text-sm mb-1">
              <TrendingUp size={16} className="text-blue-500" /> 수입
              {summary.carryOver !== 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium whitespace-nowrap">
                  이월 {summary.carryOver > 0 ? "+" : ""}
                  {summary.carryOver.toLocaleString()}
                </span>
              )}
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
              <Wallet
                size={16}
                className={isDeficit ? "text-red-500" : "text-green-500"}
              />{" "}
              잔액
            </span>
            <p
              className={`text-xl sm:text-2xl font-bold ${isDeficit ? "text-red-500" : "text-green-600"}`}
            >
              {totalBalance > 0 ? "+" : ""}
              {totalBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 알림 행 + 가이드 버튼 */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div
            className={`flex-1 p-3 rounded-xl flex items-start gap-3 text-sm ${
              isDeficit ? "danger-chip" : "accent-chip"
            }`}
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>
              {isDeficit
                ? "주의: 지출이 수입을 초과했습니다. 비상금을 확인하세요."
                : `안정적입니다. 이대로라면 이번 달 ${savingsAmount}만원 저축 가능합니다.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="self-end sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold surface-soft text-secondary hover:text-primary hover:shadow-sm transition-all border"
            style={{ borderColor: "var(--border)" }}
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
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowGuide(false)}
        >
          <div
            className="surface-card rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div
              className="sticky top-0 surface-card flex items-center justify-between px-5 sm:px-6 py-5 border-b z-10"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted mb-1">
                  Guide
                </p>
                <h2 className="text-base font-bold text-primary tracking-tight">
                  우리집 가계부 사용 가이드
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-muted hover:text-primary p-1.5 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="px-5 sm:px-6 py-5 space-y-5">
              {GUIDE_SECTIONS.map((section, idx) => (
                <div key={section.title}>
                  <h3 className="flex items-center gap-2 text-[13px] font-bold text-primary mb-2.5 tracking-tight">
                    <span className="text-muted opacity-70">
                      {section.icon}
                    </span>
                    {section.title}
                  </h3>
                  <ul className="space-y-1.5 pl-6">
                    {section.items.map((item) => (
                      <li
                        key={item}
                        className="text-xs text-secondary leading-relaxed list-disc marker:text-[color:var(--border-strong)]"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                  {idx < GUIDE_SECTIONS.length - 1 && (
                    <div
                      className="mt-5 border-b"
                      style={{ borderColor: "var(--border)" }}
                    />
                  )}
                </div>
              ))}

              {/* 핵심 플로우 */}
              <div
                className="rounded-xl p-4 mt-2"
                style={{ background: "var(--bg-soft)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted mb-3">
                  Quick Start
                </p>
                <ol className="space-y-2">
                  {[
                    "설정에서 카드 등록 (결제일 · 실적 시작일 입력)",
                    "매일 지출/수입 내역 입력",
                    "대시보드에서 이번 달 결제 총액 확인",
                    "다음 달 결제 예정 ≤ 급여 → 안심",
                  ].map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-xs text-secondary leading-relaxed"
                    >
                      <span className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                        style={{ background: "var(--border)", color: "var(--text-muted)" }}
                      >
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
