import type {
  PaymentMethodRow, PaymentMethod,
  BenefitTierRow, BenefitTier,
  TransactionRow, Transaction,
} from '@/types';

export function toPaymentMethod(r: PaymentMethodRow): PaymentMethod {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    billingDay: r.billing_day,
    performanceStartDay: r.performance_start_day,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    color: r.color ?? null,
  };
}

export function toBenefitTier(r: BenefitTierRow): BenefitTier {
  return {
    id: r.id,
    paymentMethodId: r.payment_method_id,
    thresholdAmount: r.threshold_amount,
    benefitDesc: r.benefit_desc,
    sortOrder: r.sort_order,
  };
}

export function toTransaction(r: TransactionRow & { payment_method_name?: string; billing_month_key?: string }): Transaction {
  return {
    id: r.id,
    paymentMethodId: r.payment_method_id,
    transactionDate: r.transaction_date,
    amount: r.amount,
    category: r.category,
    memo: r.memo,
    isInstallment: r.is_installment === 1,
    installmentMonths: r.installment_months,
    excludeFromBilling: r.exclude_from_billing === 1,
    excludeFromPerformance: r.exclude_from_performance === 1,
    createdAt: r.created_at,
    paymentMethodName: r.payment_method_name ?? undefined,
    billingMonthKey: r.billing_month_key ?? undefined,
  };
}
