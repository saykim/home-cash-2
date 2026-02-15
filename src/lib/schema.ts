import type { PoolClient } from "@neondatabase/serverless";

export async function initSchema(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('CREDIT','CHECK','ACCOUNT','CASH')),
      billing_day INTEGER,
      performance_start_day INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS benefit_tiers (
      id TEXT PRIMARY KEY,
      payment_method_id TEXT NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
      threshold_amount INTEGER NOT NULL,
      benefit_desc TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      payment_method_id TEXT REFERENCES payment_methods(id),
      transaction_date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT,
      memo TEXT,
      is_installment INTEGER DEFAULT 0,
      installment_months INTEGER DEFAULT 1,
      exclude_from_billing INTEGER DEFAULT 0,
      exclude_from_performance INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}
