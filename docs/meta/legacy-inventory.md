/**
 * Feature: Legacy Meta payments/connect inventory
 * Purpose: Authoritative list of code paths to replace/remove during business-only refactor
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 *  - Meta JS SDK FB.ui: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 *  - Meta Marketing API (Ad Account): https://developers.facebook.com/docs/marketing-api/reference/ad-account
 */

### Legacy payment dialog and related flows (to be removed or rewritten)

- components/meta/MetaConnectCard.tsx
  - Contains FB.ui `ads_payment` invocation and dialog handling (around the "Prepare FB.ui parameters" section).
  - Replace with deep-link CTA to Business billing and server-side recheck. Remove dialog code entirely.

- app/meta/payment-bridge/page.tsx
  - Popup bridge for FB.ui redirect → postMessage to opener. Remove once dialogs are gone.

- app/api/meta/payment/route.ts
  - Marks payment connected for a campaign. Replace with funding recheck endpoint and updates to `meta_connections.has_funding` and `status`.

- app/api/meta/adaccount/status/route.ts
  - Pre-validation for dialog reliability. Keep logic for status checks but decouple from dialog rationale; may be renamed and reused by recheck flow.

- app/api/meta/payments/capability/route.ts
  - Computes role/finance/manage/funding capability. Keep logic but relocate under new payments status/checks module naming; ensure it aligns with business-owned assets only.

- docs/meta/localstorage-architecture.md
  - Mentions FB.ui dialog sequence. Update to reflect deep-link approach and wizard flow.

- docs/meta/graph-explorer-map.md
  - Mentions numeric-only `account_id` for dialogs. Retain historical note, but remove dialog guidance from active flow docs.

### Related service/util code to audit (rename/relocate or remove)

- lib/meta/payments.ts
  - Currently implements payment capability checks. Keep core capability logic; move into `lib/meta/payments.ts` dedicated to deep links + funding checks only (no dialogs). Update call sites accordingly.

- components/preview-panel.tsx → step "Connect Facebook & Instagram"
  - Ensures `MetaConnectCard` routes users into the new wizard rather than any payment dialog actions.

### Supabase schema references to align

- supabase/migrations/20251026_extend_campaign_meta_connections.sql
  - Historical extension. New canonical tables will live under `meta_tokens`, `meta_connections`, `meta_asset_snapshots` (see Milestone 1).

### Notes

- Business-managed only going forward. Filter lists to business-owned assets (not just accessible). All payment actions use deep links to Business Manager billing. No iframe or embedded dialogs.


