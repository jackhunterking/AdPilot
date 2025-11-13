# Publishing Database Schema Documentation

## Overview

This document describes the database schema used by the Meta Ad Publishing system, including table structures, relationships, and expected data formats.

## Tables

### campaigns

Primary table for campaign data.

**Key Fields for Publishing:**
- `id` (uuid) - Primary key
- `user_id` (uuid) - Owner of the campaign
- `name` (string) - Campaign name
- `published_status` (string | null) - Publishing status: `null`, `'publishing'`, `'active'`, `'paused'`, `'error'`
- `status` (string | null) - Campaign workflow status
- `initial_goal` (string | null) - Campaign goal type: `'leads'`, `'website-visits'`, `'calls'`
- `last_metrics_sync_at` (timestamp | null) - Last time metrics were synced from Meta
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Indexes:**
- `idx_campaigns_published_status` - For filtering by publish status

---

### campaign_states

Stores all campaign configuration data as JSON objects.

**Key Fields:**
- `id` (uuid) - Primary key
- `campaign_id` (uuid | null) - Foreign key to campaigns
- `goal_data` (json | null) - Goal configuration
- `location_data` (json | null) - Targeting locations
- `budget_data` (json | null) - Budget settings
- `ad_copy_data` (json | null) - Ad copy variations
- `ad_preview_data` (json | null) - Creative data and images
- `meta_connect_data` (json | null) - Meta connection status
- **`publish_data` (json | null)** - Prepared Meta API payloads
- `updated_at` (timestamp)

**publish_data Structure:**
```typescript
{
  campaign: {
    name: string;
    objective: CampaignObjective;
    status: 'PAUSED' | 'ACTIVE';
    special_ad_categories: string[];
  },
  adset: {
    name: string;
    campaign_id: string; // Will be populated after campaign creation
    daily_budget: number; // In cents
    billing_event: BillingEvent;
    optimization_goal: OptimizationGoal;
    bid_strategy: BidStrategy;
    targeting: TargetingSpec;
    status: 'PAUSED' | 'ACTIVE';
    start_time?: string;
    end_time?: string;
  },
  ads: Array<{
    name: string;
    adset_id: string; // Will be populated after adset creation
    creative: { creative_id: string }; // Will be populated after creative creation
    status: 'PAUSED' | 'ACTIVE';
  }>,
  metadata: {
    preparedAt: string; // ISO timestamp
    version: string; // Publishing system version
    imageHashes: Record<string, string>; // URL -> Meta image hash mapping
    creativeIds?: string[]; // Created creative IDs
  }
}
```

**Indexes:**
- `idx_campaign_states_campaign_id` - For fast lookups by campaign

---

### meta_published_campaigns

Tracks published campaigns and their Meta object IDs.

**Key Fields:**
- `id` (uuid) - Primary key
- `campaign_id` (uuid) - Foreign key to campaigns (one-to-one)
- `meta_campaign_id` (string) - Meta Campaign ID
- `meta_adset_id` (string) - Meta AdSet ID
- `meta_ad_ids` (string[]) - Array of Meta Ad IDs
- `publish_status` (string) - Status: `'publishing'`, `'active'`, `'paused'`, `'error'`
- `error_message` (string | null) - Error message if failed
- `published_at` (timestamp | null) - When successfully published
- `paused_at` (timestamp | null) - When paused
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Relationships:**
- One-to-one with `campaigns` table

**Indexes:**
- `idx_meta_published_campaigns_status` - For filtering by status
- `idx_meta_published_campaigns_campaign_id` - For lookups by campaign

---

### campaign_meta_connections

Stores Meta account connections and tokens for campaigns.

**Key Fields:**
- `id` (uuid) - Primary key
- `campaign_id` (uuid) - Foreign key to campaigns
- `user_id` (uuid) - Foreign key to profiles
- `fb_user_id` (string | null) - Meta user ID
- `long_lived_user_token` (string | null) - Meta access token (encrypted)
- `token_expires_at` (timestamp | null) - Token expiration
- `selected_business_id` (string | null) - Meta Business Manager ID
- `selected_business_name` (string | null)
- `selected_page_id` (string | null) - Facebook Page ID
- `selected_page_name` (string | null)
- `selected_page_access_token` (string | null) - Page token (encrypted)
- `selected_ig_user_id` (string | null) - Instagram account ID
- `selected_ig_username` (string | null)
- `selected_ad_account_id` (string | null) - Meta Ad Account ID (format: "act_123456" or "123456")
- `selected_ad_account_name` (string | null)
- `ad_account_currency_code` (string | null) - Currency (e.g., "USD")
- `ad_account_payment_connected` (boolean) - Whether payment method is set up
- `admin_connected` (boolean) - Whether admin permissions verified
- `user_app_connected` (boolean) - Whether user app token obtained
- `connection_status` (string | null) - Overall connection status
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Indexes:**
- `idx_campaign_meta_connections_campaign` - For lookups by campaign
- `idx_campaign_meta_connections_token_expiry` - For token expiry checks
- `idx_campaign_meta_connections_ad_account` - For grouping by ad account

---

### ads

Stores individual ad data.

**Key Fields:**
- `id` (uuid) - Primary key
- `campaign_id` (uuid) - Foreign key to campaigns
- `name` (string) - Ad name
- `status` (string) - Ad status: `'draft'`, `'active'`, `'paused'`, etc.
- `meta_ad_id` (string | null) - Meta Ad ID (populated after publishing)
- `meta_review_status` (string) - Meta's review status
- `copy_data` (json | null) - Ad copy content
- `creative_data` (json | null) - Creative assets
- `destination_data` (json | null) - Destination configuration
- `destination_type` (string | null) - Type: `'website'`, `'form'`, `'call'`
- `published_at` (timestamp | null) - When published to Meta
- `approved_at` (timestamp | null) - When approved by Meta
- `rejected_at` (timestamp | null) - When rejected by Meta
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Indexes:**
- `idx_ads_campaign_status` - Composite index for filtering
- `idx_ads_meta_ad_id` - For reverse lookups from Meta

---

## Data Flow During Publishing

1. **Preparation Phase**
   - Read from `campaign_states` (goal_data, location_data, budget_data, ad_copy_data, ad_preview_data)
   - Validate data completeness
   - Check `campaign_meta_connections` for valid token
   - Generate `publish_data` payload
   - Save to `campaign_states.publish_data`

2. **Publishing Phase**
   - Update `campaigns.published_status` = `'publishing'`
   - Create/update `meta_published_campaigns` with status `'publishing'`
   - Upload images to Meta
   - Create AdCreatives on Meta
   - Update `publish_data.metadata.creativeIds`
   - Create Campaign on Meta → get `meta_campaign_id`
   - Create AdSet on Meta → get `meta_adset_id`
   - Create Ads on Meta → get `meta_ad_ids`
   - Update `meta_published_campaigns` with all Meta IDs
   - Update `ads` table with `meta_ad_id` for each ad
   - Update `campaigns.published_status` = `'active'` or `'paused'`
   - Set `meta_published_campaigns.published_at`

3. **Error Handling**
   - Update `campaigns.published_status` = `'error'`
   - Set `meta_published_campaigns.error_message`
   - Update `meta_published_campaigns.publish_status` = `'error'`

4. **Verification Phase**
   - Query Meta API to confirm objects exist
   - Update local records with latest status
   - Set `campaigns.last_metrics_sync_at`

---

## Query Patterns

### Check if campaign can be published
```sql
SELECT 
  c.id,
  c.name,
  c.published_status,
  cs.goal_data,
  cs.location_data,
  cs.budget_data,
  cs.ad_copy_data,
  cs.ad_preview_data,
  cs.publish_data,
  cmc.long_lived_user_token,
  cmc.token_expires_at,
  cmc.selected_ad_account_id,
  cmc.ad_account_payment_connected
FROM campaigns c
LEFT JOIN campaign_states cs ON cs.campaign_id = c.id
LEFT JOIN campaign_meta_connections cmc ON cmc.campaign_id = c.id
WHERE c.id = $1;
```

### Get published campaign status
```sql
SELECT 
  mpc.publish_status,
  mpc.meta_campaign_id,
  mpc.meta_adset_id,
  mpc.meta_ad_ids,
  mpc.error_message,
  mpc.published_at,
  c.published_status,
  c.name
FROM meta_published_campaigns mpc
JOIN campaigns c ON c.id = mpc.campaign_id
WHERE mpc.campaign_id = $1;
```

### Get all ads for a campaign with Meta IDs
```sql
SELECT 
  a.id,
  a.name,
  a.status,
  a.meta_ad_id,
  a.meta_review_status,
  a.copy_data,
  a.creative_data
FROM ads a
WHERE a.campaign_id = $1
ORDER BY a.created_at ASC;
```

---

## Migration History

- `20250119_add_publishing_indexes.sql` - Added performance indexes for publishing queries

---

## Best Practices

1. **Always check token expiry** before publishing:
   ```sql
   WHERE token_expires_at > NOW()
   ```

2. **Use transactions** when updating multiple related tables

3. **Log all state changes** to `campaign_audit_log` table

4. **Encrypt sensitive fields** (`long_lived_user_token`, `selected_page_access_token`)

5. **Validate JSON schema** before saving to `*_data` fields

6. **Use prepared statements** to prevent SQL injection

7. **Index foreign keys** for join performance

---

## Security Considerations

- Tokens in `campaign_meta_connections` should be encrypted at rest
- Row-level security (RLS) policies should restrict access to user's own campaigns
- API calls to Meta should use the most restrictive token available
- Audit all publish attempts in `campaign_audit_log`

---

## Maintenance

- Monitor index usage with `pg_stat_user_indexes`
- Vacuum and analyze tables regularly
- Archive old `campaign_audit_log` entries
- Clean up failed publish attempts after 30 days
- Monitor table sizes and partitioning needs

---

## Future Enhancements

- Add `meta_creative_ids` to `meta_published_campaigns` for better tracking
- Add `publishing_state` JSONB field for granular progress tracking
- Add `retry_count` to track automated retry attempts
- Consider partitioning `campaign_audit_log` by date
- Add materialized view for campaign publishing metrics

