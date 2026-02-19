export type PaymentMethodType = 'CREDIT' | 'CHECK' | 'ACCOUNT' | 'CASH';

/** DB row for payment_methods */
export interface PaymentMethodRow {
  id: string;
  name: string;
  type: PaymentMethodType;
  billing_day: number | null;
  performance_start_day: number;
  is_active: number; // SQLite boolean: 0 | 1
  created_at: string;
  color: string | null;
}

/** API / UI shape */
export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  billingDay: number | null;
  performanceStartDay: number;
  isActive: boolean;
  createdAt: string;
  color: string | null;
}

/** DB row for benefit_tiers */
export interface BenefitTierRow {
  id: string;
  payment_method_id: string;
  threshold_amount: number;
  benefit_desc: string;
  sort_order: number;
}

/** API / UI shape */
export interface BenefitTier {
  id: string;
  paymentMethodId: string;
  thresholdAmount: number;
  benefitDesc: string;
  sortOrder: number;
}

/** DB row for transactions */
export interface TransactionRow {
  id: string;
  payment_method_id: string | null;
  transaction_date: string;
  amount: number;
  category: string | null;
  memo: string | null;
  is_installment: number;
  installment_months: number;
  exclude_from_billing: number;
  exclude_from_performance: number;
  created_at: string;
}

/** API / UI shape */
export interface Transaction {
  id: string;
  paymentMethodId: string | null;
  transactionDate: string;
  amount: number;
  category: string | null;
  memo: string | null;
  isInstallment: boolean;
  installmentMonths: number;
  excludeFromBilling: boolean;
  excludeFromPerformance: boolean;
  createdAt: string;
  /** Joined field — payment method name */
  paymentMethodName?: string;
  /** 청구 기준 모드에서만 포함. "YYYY-MM" 포맷 */
  billingMonthKey?: string;
}

export interface CashflowSummary {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CardUsageTransaction {
  id: string;
  transactionDate: string;
  amount: number;
  category: string | null;
  memo: string | null;
}

export interface CardPerformance {
  paymentMethodId: string;
  cardName: string;
  paymentMethodType: PaymentMethodType;
  billingDay: number | null;
  performanceStartDay: number;
  performancePeriodStart: string;
  performancePeriodEnd: string;
  currentPerformance: number;
  usageTransactions: CardUsageTransaction[];
  tiers: (BenefitTier & { achieved: boolean })[];
  nextTierRemaining: number | null;
}

export interface CreatePaymentMethodDTO {
  name: string;
  type: PaymentMethodType;
  billingDay?: number | null;
  performanceStartDay?: number;
}

export interface UpdatePaymentMethodDTO extends Partial<CreatePaymentMethodDTO> {}

export interface CreateBenefitTierDTO {
  paymentMethodId: string;
  thresholdAmount: number;
  benefitDesc: string;
  sortOrder?: number;
}

export interface UpdateBenefitTierDTO {
  thresholdAmount?: number;
  benefitDesc?: string;
  sortOrder?: number;
}

export interface CreateTransactionDTO {
  paymentMethodId?: string | null;
  transactionDate: string;
  amount: number;
  category?: string | null;
  memo?: string | null;
  isInstallment?: boolean;
  installmentMonths?: number;
  excludeFromBilling?: boolean;
  excludeFromPerformance?: boolean;
}
