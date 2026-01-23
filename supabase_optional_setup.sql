-- Optional helper SQL (run once in Supabase SQL editor)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy if not exists "profiles self read" on public.profiles
for select using (auth.uid() = id);

create policy if not exists "profiles self upsert" on public.profiles
for insert with check (auth.uid() = id);

create policy if not exists "profiles self update" on public.profiles
for update using (auth.uid() = id);

-- Loyalty tables (if not already present)
create table if not exists public.loyalty_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0,
  updated_at timestamptz default now()
);
alter table public.loyalty_balances enable row level security;
create policy if not exists "balances self read" on public.loyalty_balances
for select using (auth.uid() = user_id);

create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  change integer not null,
  source text,
  created_at timestamptz default now()
);
alter table public.loyalty_ledger enable row level security;
create policy if not exists "ledger self read" on public.loyalty_ledger
for select using (auth.uid() = user_id);


-- Reward coupons issued to users for redemptions
create table if not exists public.reward_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id text not null,
  code text not null,
  square_discount_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_at timestamptz
);
alter table public.reward_coupons enable row level security;
create policy if not exists "users can view own reward coupons"
  on public.reward_coupons
  for select
  using (auth.uid() = user_id);
create policy if not exists "users can insert own reward coupons"
  on public.reward_coupons
  for insert
  with check (auth.uid() = user_id);
