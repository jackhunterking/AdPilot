--
-- Feature: Meta connection currency persistence
-- Purpose: Persist ad account currency code on user-level meta_connections table
-- References:
--  - Supabase DDL: https://supabase.com/docs/guides/database
--  - Meta Marketing API (Ad Account): https://developers.facebook.com/docs/marketing-api/reference/ad-account
--

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'meta_connections'
      and column_name = 'ad_account_currency_code'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'meta_connections'
        and column_name = 'currency'
    ) then
      alter table public.meta_connections
        rename column currency to ad_account_currency_code;
    else
      alter table public.meta_connections
        add column ad_account_currency_code text;
    end if;
  end if;
end $$;

comment on column public.meta_connections.ad_account_currency_code
  is 'ISO 4217 currency code (e.g., USD, CAD) for the selected ad account.';

commit;

