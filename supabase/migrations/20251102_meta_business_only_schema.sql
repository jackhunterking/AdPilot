--
-- Feature: Meta business-only schema (tokens, connections, snapshots)
-- Purpose: Create canonical tables with strict RLS for business-managed flow
-- References:
--  - Supabase: https://supabase.com/docs/guides/database
--  - RLS Policies: https://supabase.com/docs/guides/database/postgres/row-level-security
--  - Meta Marketing API (Ad Account): https://developers.facebook.com/docs/marketing-api/reference/ad-account
--

begin;

-- Extensions (uuid)
create extension if not exists pgcrypto;

-- meta_tokens: user-scoped token storage
create table if not exists public.meta_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  access_token text not null,
  expires_at timestamptz null,
  scopes text[] not null default '{}',
  last_validated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists meta_tokens_user_id_unique on public.meta_tokens(user_id);
create index if not exists meta_tokens_user_id_idx on public.meta_tokens(user_id);

alter table public.meta_tokens enable row level security;

-- meta_connections: selected business/page/ad account and funding status
create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  business_id text not null,
  business_name text null,
  page_id text null,
  page_name text null,
  ad_account_id text null,
  ad_account_name text null,
  currency text null,
  has_funding boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meta_connections_user_id_idx on public.meta_connections(user_id);
create index if not exists meta_connections_ad_account_id_idx on public.meta_connections(ad_account_id);

alter table public.meta_connections enable row level security;

-- meta_asset_snapshots: denormalized support snapshots per user
create table if not exists public.meta_asset_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  business_json jsonb null,
  pages_json jsonb null,
  ad_accounts_json jsonb null,
  captured_at timestamptz not null default now()
);

create index if not exists meta_asset_snapshots_user_id_idx on public.meta_asset_snapshots(user_id);

alter table public.meta_asset_snapshots enable row level security;

-- RLS policies: owner can manage own rows; service role unrestricted

-- meta_tokens policies
drop policy if exists "meta_tokens_select_own" on public.meta_tokens;
create policy "meta_tokens_select_own"
  on public.meta_tokens for select
  using (user_id = auth.uid());

drop policy if exists "meta_tokens_insert_own" on public.meta_tokens;
create policy "meta_tokens_insert_own"
  on public.meta_tokens for insert
  with check (user_id = auth.uid());

drop policy if exists "meta_tokens_update_own" on public.meta_tokens;
create policy "meta_tokens_update_own"
  on public.meta_tokens for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "meta_tokens_delete_own" on public.meta_tokens;
create policy "meta_tokens_delete_own"
  on public.meta_tokens for delete
  using (user_id = auth.uid());

-- meta_connections policies
drop policy if exists "meta_connections_select_own" on public.meta_connections;
create policy "meta_connections_select_own"
  on public.meta_connections for select
  using (user_id = auth.uid());

drop policy if exists "meta_connections_insert_own" on public.meta_connections;
create policy "meta_connections_insert_own"
  on public.meta_connections for insert
  with check (user_id = auth.uid());

drop policy if exists "meta_connections_update_own" on public.meta_connections;
create policy "meta_connections_update_own"
  on public.meta_connections for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "meta_connections_delete_own" on public.meta_connections;
create policy "meta_connections_delete_own"
  on public.meta_connections for delete
  using (user_id = auth.uid());

-- meta_asset_snapshots policies
drop policy if exists "meta_asset_snapshots_select_own" on public.meta_asset_snapshots;
create policy "meta_asset_snapshots_select_own"
  on public.meta_asset_snapshots for select
  using (user_id = auth.uid());

drop policy if exists "meta_asset_snapshots_insert_own" on public.meta_asset_snapshots;
create policy "meta_asset_snapshots_insert_own"
  on public.meta_asset_snapshots for insert
  with check (user_id = auth.uid());

drop policy if exists "meta_asset_snapshots_delete_own" on public.meta_asset_snapshots;
create policy "meta_asset_snapshots_delete_own"
  on public.meta_asset_snapshots for delete
  using (user_id = auth.uid());

commit;


