-- [1. 초기 설정] -----------------------------------------------------------
-- 사용자 프로필 테이블 (Supabase Auth와 연동)
create table profiles (
id uuid references auth.users on delete cascade not null primary key,
email text,
full_name text,
created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS(Row Level Security) 활성화: 내 데이터는 나만 볼 수 있음
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- [2. 카드 및 결제 수단 설정] ------------------------------------------------
-- 카드의 '결제일'과 '실적기간'을 정의하는 핵심 테이블
create table payment_methods (
id uuid default uuid_generate_v4() primary key,
user_id uuid references profiles(id) not null,
name text not null, -- 예: '신한카드', '현금', '급여통장'
type text not null, -- 'CREDIT', 'CHECK', 'CASH', 'ACCOUNT'

-- [핵심 로직 1] 결제일 설정 (자금 흐름용)
billing_day integer, -- 예: 14일, 25일 (현금은 null)

-- [핵심 로직 2] 실적 기준 설정 (혜택 관리용)
performance_start_day integer default 1, -- 예: 전월 1일이면 1, 전월 15일이면 15
is_active boolean default true,
created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS 설정
alter table payment_methods enable row level security;
create policy "Users can CRUD own payment methods" on payment_methods for all using (auth.uid() = user_id);

-- [3. 혜택 구간 정의] -------------------------------------------------------
-- 카드별 달성해야 할 목표 금액과 보상
create table benefit_tiers (
id uuid default uuid_generate_v4() primary key,
payment_method_id uuid references payment_methods(id) on delete cascade not null,
threshold_amount integer not null, -- 예: 300000 (30만원)
benefit_desc text not null, -- 예: '통신비 1만원 할인'
sort_order integer default 0 -- 보여줄 순서
);

alter table benefit_tiers enable row level security;
create policy "Users can CRUD own benefits" on benefit_tiers for all using (
payment_method_id in (select id from payment_methods where user_id = auth.uid())
);

-- [4. 거래/지출 내역 (Macro Entry)] -----------------------------------------
-- 개별 껌값 입력이 아니라 '주간 합계', '월간 합계' 등 덩어리 입력 최적화
create table transactions (
id uuid default uuid_generate_v4() primary key,
user_id uuid references profiles(id) not null,
payment_method_id uuid references payment_methods(id),

transaction_date date not null, -- 사용 날짜
amount integer not null, -- 금액 (수입은 +, 지출은 -)
category text, -- '식비', '고정지출', '급여' 등
memo text,

-- [핵심 로직 3] 이중 집계를 위한 플래그
is_installment boolean default false, -- 할부 여부
installment_months integer default 1, -- 할부 개월 수

exclude_from_billing boolean default false, -- 청구 제외 (예: 법인카드 지출)
exclude_from_performance boolean default false, -- 실적 제외 (예: 아파트 관리비, 상품권)

created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table transactions enable row level security;
create policy "Users can CRUD own transactions" on transactions for all using (auth.uid() = user_id);

-- [5. 뷰(View) - 자동 계산 엔진] ---------------------------------------------
-- 복잡한 로직을 DB 레벨에서 처리하여 프론트엔드는 결과만 조회함

-- VIEW 1: 월별 자금 흐름 (Cashflow)
-- 단순히 이번 달에 '결제'되어야 하는 금액 합산 (할부 로직은 간소화: 일단 당월 청구로 가정하거나 추후 고도화)
create view v_monthly_cashflow as
select
user_id,
to_char(transaction_date, 'YYYY-MM') as month_str,
sum(case when amount > 0 then amount else 0 end) as total_income,
sum(case when amount < 0 then abs(amount) else 0 end) as total_expense,
sum(amount) as net_balance
from transactions
where exclude_from_billing = false
group by user_id, to_char(transaction_date, 'YYYY-MM');

-- VIEW 2: 카드별 실적 현황 (Benefit Status)
-- 카드별 '실적 인정 기간'에 따른 사용액 합산
-- (단순화를 위해 일단 월별 합산으로 구현하되, 추후 날짜 범위 쿼리로 개선 가능)
create view v_card_performance as
select
t.user_id,
t.payment_method_id,
pm.name as card_name,
to_char(t.transaction_date, 'YYYY-MM') as month_str,
sum(abs(t.amount)) as current_performance
from transactions t
join payment_methods pm on t.payment_method_id = pm.id
where
t.amount < 0 -- 지출만
and pm.type = 'CREDIT' -- 신용카드만
and t.exclude_from_performance = false -- 실적 제외 항목 배제
group by t.user_id, t.payment_method_id, pm.name, to_char(t.transaction_date, 'YYYY-MM');
