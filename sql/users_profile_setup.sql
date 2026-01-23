-- Ensure table exists with expected columns (no-op if already there)
create table if not exists public.users_profile (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Update trigger for updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as users_profile_setup.sql
begin
  new.updated_at := now();
  return new;
end users_profile_setup.sql;

drop trigger if exists trg_users_profile_updated_at on public.users_profile;
create trigger trg_users_profile_updated_at
before update on public.users_profile
for each row execute function public.set_updated_at();

-- Enable RLS and (re)create policies
alter table public.users_profile enable row level security;

do users_profile_setup.sql
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users_profile' and policyname='users_profile_select_own') then
    execute 'drop policy users_profile_select_own on public.users_profile';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users_profile' and policyname='users_profile_insert_self') then
    execute 'drop policy users_profile_insert_self on public.users_profile';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users_profile' and policyname='users_profile_update_own') then
    execute 'drop policy users_profile_update_own on public.users_profile';
  end if;
endusers_profile_setup.sql;

create policy users_profile_select_own
on public.users_profile
for select
using (auth.uid() = user_id);

create policy users_profile_insert_self
on public.users_profile
for insert
with check (auth.uid() = user_id);

create policy users_profile_update_own
on public.users_profile
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
