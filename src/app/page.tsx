'use client';

import { useState, useEffect, useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import CashflowSummary from '@/components/CashflowSummary';
import CardPerformanceGauge from '@/components/CardPerformanceGauge';
import MonthlyCumulativeTrends from '@/components/MonthlyCumulativeTrends';
import TransactionTable, { type TransactionFilters } from '@/components/TransactionTable';
import SettingsView from '@/components/SettingsView';
import { authClient } from '@/lib/auth/client';
import type {
  CashflowSummary as CashflowData,
  CardPerformance,
  Transaction,
  PaymentMethod,
  BenefitTier,
  CreateTransactionDTO,
} from '@/types';

export const dynamic = 'force-dynamic';

interface PaymentMethodWithTiers extends PaymentMethod {
  benefitTiers: BenefitTier[];
}

interface BillingSummary {
  currentMonth: number;
  nextMonth: number;
  currentMonthLabel: string;
  nextMonthLabel: string;
}

interface DashboardData {
  cashflow: CashflowData;
  cardPerformances: CardPerformance[];
  billingSummary: BillingSummary;
}

type DashboardSectionId = 'card-performance' | 'monthly-trends' | 'recent-transactions';

const DEFAULT_DASHBOARD_SECTION_ORDER: DashboardSectionId[] = [
  'card-performance',
  'monthly-trends',
  'recent-transactions',
];

const isDashboardSectionId = (value: string): value is DashboardSectionId =>
  value === 'card-performance' || value === 'monthly-trends' || value === 'recent-transactions';

const normalizeSectionOrder = (input: unknown): DashboardSectionId[] => {
  if (!Array.isArray(input)) {
    return [...DEFAULT_DASHBOARD_SECTION_ORDER];
  }

  const deduped = Array.from(
    new Set(input.filter((value): value is DashboardSectionId => typeof value === 'string' && isDashboardSectionId(value))),
  );
  const missing = DEFAULT_DASHBOARD_SECTION_ORDER.filter(value => !deduped.includes(value));
  return [...deduped, ...missing];
};

const defaultTransactionFilters: TransactionFilters = {
  search: '',
  category: 'all',
  paymentMethodId: 'all',
  performance: 'all',
};

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const session = authClient.useSession();
  const [activeTab, setActiveTabState] = useState<'dashboard' | 'settings'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodWithTiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>(defaultTransactionFilters);
  const [sectionOrder, setSectionOrder] = useState<DashboardSectionId[]>(DEFAULT_DASHBOARD_SECTION_ORDER);
  const [draggingSection, setDraggingSection] = useState<DashboardSectionId | null>(null);
  const isInitialTransactionsLoadRef = useRef(true);
  const now = new Date();
  const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [currentMonth, setCurrentMonth] = useState(todayMonth);

  const moveMonth = (delta: -1 | 1) => {
    setCurrentMonth(prev => {
      const [y, m] = prev.split('-').map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  };

  const displayMonth = (() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return `${y}년 ${m}월`;
  })();
  const isCurrentMonth = currentMonth === todayMonth;

  const parseApiJson = useCallback(
    async function parseApiJson<T>(response: Response): Promise<T | null> {
      if (!response.ok) {
        return null;
      }

      const text = await response.text();
      if (!text) {
        return null;
      }

      try {
        return (JSON.parse(text) as T) ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  const fetchDashboardData = useCallback(async () => {
    const dashRes = await fetch(`/api/dashboard?month=${currentMonth}`);
    const dash = await parseApiJson<DashboardData>(dashRes);
    if (!dash) {
      return;
    }
    setDashboardData(dash);
  }, [currentMonth, parseApiJson]);

  const fetchPaymentMethods = useCallback(async () => {
    const pmRes = await fetch('/api/payment-methods');
    const pms = await parseApiJson<PaymentMethodWithTiers[]>(pmRes);
    if (!pms) {
      return;
    }
    setPaymentMethods(pms);
  }, [parseApiJson]);

  const fetchTransactions = useCallback(
    async (
      filters: TransactionFilters = defaultTransactionFilters,
      { showLoading = true }: { showLoading?: boolean } = {},
    ) => {
      if (showLoading) {
        setTransactionsLoading(true);
      }

      const txParams = new URLSearchParams({
        month: currentMonth,
        limit: '200',
        search: filters.search,
        category: filters.category,
        paymentMethodId: filters.paymentMethodId,
        performance: filters.performance,
      });

      const txRes = await fetch(`/api/transactions?${txParams.toString()}`);
      const txns = await parseApiJson<Transaction[]>(txRes);
      if (!txns) {
        if (showLoading) {
          setTransactionsLoading(false);
        }
        return;
      }

      setTransactions(txns);

      if (showLoading) {
        setTransactionsLoading(false);
      }
    },
    [currentMonth, parseApiJson],
  );

  const persistSectionOrder = useCallback(async (nextOrder: DashboardSectionId[]) => {
    try {
      await fetch('/api/user-dashboard-layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionOrder: nextOrder }),
      });
    } catch {
      // keep local reorder state even if save fails
    }
  }, []);

  const fetchSectionOrder = useCallback(async () => {
    const layoutRes = await fetch('/api/user-dashboard-layout');
    const layout = await parseApiJson<{ sectionOrder: DashboardSectionId[] }>(layoutRes);
    if (layout?.sectionOrder) {
      setSectionOrder(normalizeSectionOrder(layout.sectionOrder));
    }
  }, [parseApiJson]);

  useEffect(() => {
    const init = async () => {
      const initialLoad = isInitialTransactionsLoadRef.current;
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchPaymentMethods(),
        fetchSectionOrder(),
        fetchTransactions(defaultTransactionFilters, { showLoading: initialLoad }),
      ]);
      isInitialTransactionsLoadRef.current = false;
      setLoading(false);
    };

    init();
  }, [fetchDashboardData, fetchPaymentMethods, fetchSectionOrder, fetchTransactions]);

  // 월 변경 시 필터 리셋 + 재조회
  useEffect(() => {
    if (isInitialTransactionsLoadRef.current) return; // 초기 로드 중엔 skip
    setTransactionFilters(defaultTransactionFilters);
    void Promise.all([
      fetchDashboardData(),
      fetchTransactions(defaultTransactionFilters, { showLoading: false }),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);


  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const setActiveTab = (tab: 'dashboard' | 'settings') => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('tab', tab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    setActiveTabState(tab);
  };

  useEffect(() => {
    const syncTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('tab') === 'settings' ? 'settings' : 'dashboard';
      setActiveTabState(next);
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);

    return () => {
      window.removeEventListener('popstate', syncTabFromUrl);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) {
        throw new Error(error.message || '로그아웃에 실패했습니다.');
      }
    } catch {
      try {
        await fetch('/api/auth/sign-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          credentials: 'include',
        });
      } catch {
        // Ignore fallback errors and force redirect below.
      }
    } finally {
      window.location.assign('/auth/sign-in');
    }
  };

  const handleCreateTransaction = async (dto: CreateTransactionDTO) => {
    const createRes = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    const createdTransaction = await parseApiJson<Transaction>(createRes);
    if (createdTransaction) {
      setTransactions((prev) => [createdTransaction, ...prev.filter((tx) => tx.id !== createdTransaction.id)]);

      if (createdTransaction.transactionDate.startsWith(currentMonth)) {
        setDashboardData((prev) => {
          if (!prev) {
            return prev;
          }

          const nextCashflow = { ...prev.cashflow };
          if (!createdTransaction.excludeFromBilling) {
            if (createdTransaction.amount > 0) {
              nextCashflow.income += createdTransaction.amount;
            } else {
              nextCashflow.expense += Math.abs(createdTransaction.amount);
            }
            nextCashflow.balance += createdTransaction.amount;
          }

          const nextCardPerformances = prev.cardPerformances.map((card) => {
            const isTargetCard = createdTransaction.paymentMethodId === card.paymentMethodId;
            const isExpense = createdTransaction.amount < 0;
            const isWithinPerformancePeriod =
              createdTransaction.transactionDate >= card.performancePeriodStart &&
              createdTransaction.transactionDate <= card.performancePeriodEnd;
            const isIncludedInPerformance = !(
              card.paymentMethodType === 'CREDIT' && createdTransaction.excludeFromPerformance
            );

            if (!isTargetCard || !isExpense || !isWithinPerformancePeriod || !isIncludedInPerformance) {
              return card;
            }

            const nextUsageTransactions = [
              {
                id: createdTransaction.id,
                transactionDate: createdTransaction.transactionDate,
                amount: Math.abs(createdTransaction.amount),
                category: createdTransaction.category,
                memo: createdTransaction.memo,
              },
              ...card.usageTransactions.filter((transaction) => transaction.id !== createdTransaction.id),
            ].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

            const nextCurrentPerformance = nextUsageTransactions.reduce(
              (sum, transaction) => sum + transaction.amount,
              0,
            );
            const nextTiers = card.tiers.map((tier) => ({
              ...tier,
              achieved: nextCurrentPerformance >= tier.thresholdAmount,
            }));
            const nextTier = nextTiers.find((tier) => !tier.achieved);

            return {
              ...card,
              usageTransactions: nextUsageTransactions,
              currentPerformance: nextCurrentPerformance,
              tiers: nextTiers,
              nextTierRemaining: nextTier ? nextTier.thresholdAmount - nextCurrentPerformance : null,
            };
          });

          return {
            cashflow: nextCashflow,
            cardPerformances: nextCardPerformances,
            billingSummary: prev.billingSummary,  // 서버 재조회 시 갱신됨
          };
        });
      }
    }

    await Promise.all([
      fetchDashboardData(),
      fetchTransactions(transactionFilters, { showLoading: false }),
    ]);
  };

  const handleDeleteTransaction = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    await Promise.all([fetchDashboardData(), fetchTransactions(transactionFilters)]);
  };

  const handleRefreshSettings = async () => {
    await Promise.all([
      fetchPaymentMethods(),
      fetchDashboardData(),
      fetchTransactions(transactionFilters, { showLoading: false }),
    ]);
  };

  const handleTransactionFiltersChange = async (filters: TransactionFilters) => {
    setTransactionFilters(filters);
    await fetchTransactions(filters);
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, target: 'dashboard' | 'settings') => {
    if (
      e.key === 'ArrowRight' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      e.preventDefault();
      const next = target === 'dashboard' ? 'settings' : 'dashboard';
      setActiveTab(next);
      const nextTabId = next === 'dashboard' ? 'tab-dashboard' : 'tab-settings';
      document.getElementById(nextTabId)?.focus();
    }
  };

  const categories = Array.from(
    new Set(
      transactions
        .map(tx => tx.category)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const handleSectionDrop = (targetSection: DashboardSectionId) => {
    if (!draggingSection || draggingSection === targetSection) {
      return;
    }

    setSectionOrder(prev => {
      const from = prev.indexOf(draggingSection);
      const to = prev.indexOf(targetSection);
      if (from === -1 || to === -1) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      void persistSectionOrder(next);
      return next;
    });
  };

  const dashboardSectionMap: Record<DashboardSectionId, { title: string; node: ReactNode }> = {
    'card-performance': {
      title: '결제 수단 실적/사용 현황',
      node: <CardPerformanceGauge cards={dashboardData?.cardPerformances ?? []} />,
    },
    'monthly-trends': {
      title: '월별 누적 변화 추이',
      node: <MonthlyCumulativeTrends transactions={transactions} month={currentMonth} />,
    },
    'recent-transactions': {
      title: '최근 내역 요약',
      node: (
        <TransactionTable
          transactions={transactions}
          paymentMethods={paymentMethods}
          filters={transactionFilters}
          categories={categories}
          currentMonth={currentMonth}
          billingSummary={dashboardData?.billingSummary ?? null}
          isLoading={transactionsLoading}
          onChangeFilters={handleTransactionFiltersChange}
          onDelete={handleDeleteTransaction}
          onCreateTransaction={handleCreateTransaction}
        />
      ),
    },
  };

  return (
    <div className="min-h-screen font-sans text-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 z-50 bg-surface-strong text-xs px-3 py-2 rounded-lg border border-current"
      >
        본문으로 이동
      </a>
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">우리집 가계부</h1>
            <p className="text-sm text-muted">Macro Money Manager</p>
          </div>

          <div className="flex items-center gap-2">
            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 surface-card rounded-xl px-1 py-1">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="p-1.5 text-secondary hover:text-primary rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
                  aria-label="이전 달"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-primary px-2 min-w-[90px] text-center tabular-nums">
                  {displayMonth}
                </span>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="p-1.5 text-secondary hover:text-primary rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
                  aria-label="다음 달"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => setCurrentMonth(todayMonth)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  오늘로
                </button>
              )}
            </div>

            <div
              className="surface-card flex p-1 rounded-xl"
              role="tablist"
              aria-label="메인 화면 전환"
              aria-orientation="horizontal"
            >
              <button
                type="button"
                id="tab-dashboard"
                role="tab"
                aria-selected={activeTab === 'dashboard'}
                aria-controls="panel-dashboard"
                onClick={() => setActiveTab('dashboard')}
                onKeyDown={e => onTabKeyDown(e, 'dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${activeTab === 'dashboard'
                  ? 'accent-chip shadow-sm'
                  : 'text-secondary hover:text-primary'
                  }`}
              >
                대시보드
              </button>
              <button
                type="button"
                id="tab-settings"
                role="tab"
                aria-selected={activeTab === 'settings'}
                aria-controls="panel-settings"
                onClick={() => setActiveTab('settings')}
                onKeyDown={e => onTabKeyDown(e, 'settings')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${activeTab === 'settings'
                  ? 'accent-chip shadow-sm'
                  : 'text-secondary hover:text-primary'
                  }`}
              >
                설정 (기준정보)
              </button>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="surface-card rounded-xl p-2.5 text-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label="테마 전환"
              title="라이트/다크 모드 전환"
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => router.push('/account')}
              className="surface-card rounded-xl px-3 py-2 text-sm text-secondary hover:text-primary"
            >
              {session.data?.user?.email ?? '계정'}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="surface-card rounded-xl px-3 py-2 text-sm text-secondary hover:text-primary"
            >
              로그아웃
            </button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          {loading ? (
            <div role="status" aria-live="polite" aria-atomic="true" className="flex justify-center items-center py-20">
              <span className="sr-only">데이터를 불러오는 중…</span>
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : activeTab === 'dashboard' ? (
            <section
              id="panel-dashboard"
              role="tabpanel"
              aria-labelledby="tab-dashboard"
              className="space-y-6 animate-fade-in"
            >
              {dashboardData && (
                <>
                  <CashflowSummary summary={dashboardData.cashflow} />
                </>
              )}
              {sectionOrder.map(sectionId => {
                const section = dashboardSectionMap[sectionId];
                return (
                  <section
                    key={sectionId}
                    draggable
                    onDragStart={() => setDraggingSection(sectionId)}
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleSectionDrop(sectionId);
                      setDraggingSection(null);
                    }}
                    onDragEnd={() => setDraggingSection(null)}
                    className={`surface-card rounded-2xl p-4 space-y-4 ${draggingSection === sectionId ? 'ring-2 ring-[color:var(--accent)]' : ''}`}
                  >
                    <div className="mb-2 text-xs text-muted">
                      <span>{section.title}</span>
                    </div>
                    <div>{section.node}</div>
                  </section>
                );
              })}
            </section>
          ) : (
            <section
              id="panel-settings"
              role="tabpanel"
              aria-labelledby="tab-settings"
            >
              <SettingsView
                paymentMethods={paymentMethods}
                onRefresh={handleRefreshSettings}
              />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
