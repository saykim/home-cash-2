import type { PoolClient } from "@neondatabase/serverless";
import { v4 as uuid } from "uuid";

export async function seedIfEmpty(client: PoolClient): Promise<void> {
  const res = await client.query("SELECT COUNT(*) as cnt FROM payment_methods");
  const count = parseInt(res.rows[0].cnt);
  if (count > 0) return;

  const pmFamily = uuid();
  const pmPersonal = uuid();
  const pmSalary = uuid();

  await client.query(
    `
    INSERT INTO payment_methods (id, name, type, billing_day, performance_start_day, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
  `,
    [pmFamily, "가족카드 (신한)", "CREDIT", 14, 1, 1],
  );

  await client.query(
    `
    INSERT INTO payment_methods (id, name, type, billing_day, performance_start_day, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
  `,
    [pmPersonal, "개인카드 (현대)", "CREDIT", 25, 1, 1],
  );

  await client.query(
    `
    INSERT INTO payment_methods (id, name, type, billing_day, performance_start_day, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
  `,
    [pmSalary, "급여통장 (국민)", "ACCOUNT", null, 1, 1],
  );

  const tiers = [
    { pmId: pmFamily, threshold: 300000, desc: "대중교통 10%", order: 1 },
    { pmId: pmFamily, threshold: 600000, desc: "커피 쿠폰 2매", order: 2 },
    { pmId: pmFamily, threshold: 1000000, desc: "주유 60원/L", order: 3 },
    { pmId: pmFamily, threshold: 1500000, desc: "쇼핑 5% 캐시백", order: 4 },
    { pmId: pmPersonal, threshold: 300000, desc: "통신비 할인", order: 1 },
    { pmId: pmPersonal, threshold: 700000, desc: "M포인트 2%", order: 2 },
  ];

  for (const t of tiers) {
    await client.query(
      `
      INSERT INTO benefit_tiers (id, payment_method_id, threshold_amount, benefit_desc, sort_order)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [uuid(), t.pmId, t.threshold, t.desc, t.order],
    );
  }

  const txns = [
    {
      pmId: pmFamily,
      date: "2026-02-03",
      amount: -120000,
      cat: "생활",
      memo: "코스트코 장보기",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmFamily,
      date: "2026-02-05",
      amount: -85000,
      cat: "생활",
      memo: "이마트 장보기",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmFamily,
      date: "2026-02-07",
      amount: -280000,
      cat: "고정",
      memo: "아파트 관리비",
      exBill: 0,
      exPerf: 1,
    },
    {
      pmId: pmFamily,
      date: "2026-02-08",
      amount: -350000,
      cat: "고정",
      memo: "보험료 자동이체",
      exBill: 0,
      exPerf: 1,
    },
    {
      pmId: pmFamily,
      date: "2026-02-10",
      amount: -150000,
      cat: "생활",
      memo: "이마트 장보기",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmFamily,
      date: "2026-02-11",
      amount: -280000,
      cat: "고정",
      memo: "아파트 관리비",
      exBill: 0,
      exPerf: 1,
    },
    {
      pmId: pmFamily,
      date: "2026-02-13",
      amount: -95000,
      cat: "외식",
      memo: "가족 외식",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmFamily,
      date: "2026-02-14",
      amount: -200000,
      cat: "쇼핑",
      memo: "아이 학원비",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmFamily,
      date: "2026-02-15",
      amount: -320000,
      cat: "쇼핑",
      memo: "생필품 구매",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmPersonal,
      date: "2026-02-04",
      amount: -45000,
      cat: "교통",
      memo: "주유",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmPersonal,
      date: "2026-02-06",
      amount: -55000,
      cat: "통신",
      memo: "핸드폰 요금",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmPersonal,
      date: "2026-02-09",
      amount: -120000,
      cat: "쇼핑",
      memo: "개인 쇼핑",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmPersonal,
      date: "2026-02-12",
      amount: -160000,
      cat: "외식",
      memo: "팀 회식",
      exBill: 1,
      exPerf: 1,
    },
    {
      pmId: pmSalary,
      date: "2026-02-01",
      amount: 4200000,
      cat: "급여",
      memo: "2월 급여",
      exBill: 0,
      exPerf: 0,
    },
    {
      pmId: pmSalary,
      date: "2026-02-10",
      amount: 400000,
      cat: "수입",
      memo: "부업 수입",
      exBill: 0,
      exPerf: 0,
    },
  ];

  for (const tx of txns) {
    await client.query(
      `
      INSERT INTO transactions (id, payment_method_id, transaction_date, amount, category, memo, exclude_from_billing, exclude_from_performance)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        uuid(),
        tx.pmId,
        tx.date,
        tx.amount,
        tx.cat,
        tx.memo,
        tx.exBill,
        tx.exPerf,
      ],
    );
  }
}
