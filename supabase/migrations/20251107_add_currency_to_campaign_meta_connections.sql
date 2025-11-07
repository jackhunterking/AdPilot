--
-- Feature: Meta ad account currency persistence
-- Purpose: Persist ISO currency code for selected Meta ad accounts
-- References:
--  - Supabase DDL: https://supabase.com/docs/guides/database/extensions/uuid-ossp
--  - Meta Marketing API (Ad Account): https://developers.facebook.com/docs/marketing-api/reference/ad-account
--

begin;

alter table if exists public.campaign_meta_connections
  add column if not exists ad_account_currency_code text;

comment on column public.campaign_meta_connections.ad_account_currency_code
  is 'ISO 4217 currency code (e.g., USD, CAD) for the selected ad account.';

commit;

