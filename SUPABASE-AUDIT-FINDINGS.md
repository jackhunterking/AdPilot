# Supabase Backend Audit - Complete Findings
**Date:** November 15, 2025
**Issue:** Location data not saving properly + Backend bloat

---

## Phase 1: Database Schema Audit

### Complete Table Inventory

**Total Tables:** 18 in public schema

#### Core Campaign/Ad Tables
1. **campaigns** (11 records) - Main campaign tracking
2. **campaign_states** (11 records) - JSONB state storage per campaign
3. **ads** (4 records) - Individual ads with setup_snapshot

#### Location-Related Tables (REDUNDANCY ALERT)
4. **location_sets** (0 records) ⚠️ **UNUSED - CANDIDATE FOR REMOVAL**
5. **campaign_states.location_data** ⚠️ **DEPRECATED COLUMN**
6. **ads.setup_snapshot.location** ✅ **CURRENT STORAGE**

#### Meta Integration Tables
7. **meta_tokens** (1 record) - OAuth tokens
8. **meta_accounts** (2 records) - Business/Page/AdAccount selections
9. **campaign_meta_links** (0 records) - Links campaigns to Meta accounts
10. **campaign_meta_connections** (0 records) - Campaign-specific Meta data
11. **meta_connections** (0 records) - User Meta connections
12. **meta_asset_snapshots** (0 records) - Snapshots of Meta assets
13. **meta_published_campaigns** (0 records) - Published campaign tracking
14. **ad_publishing_metadata** (1 record) - Publishing status/errors
15. **meta_webhook_events** (0 records) - Webhook event log

#### Variant/Experiment Tables
16. **creative_variants** (0 records) ⚠️ **UNUSED**
17. **copy_variants** (0 records) ⚠️ **UNUSED**
18. **experiment_variants** (0 records) - A/B test variants
19. **experiments** (0 records) - A/B test experiments
20. **creative_plans** (0 records) - Creative generation plans
21. **creative_lint_reports** (0 records) - Creative validation

#### AI Chat Tables
22. **conversations** (11 records) - AI chat sessions
23. **messages** (132 records) - AI chat messages

#### Lead/Metrics Tables
24. **leads** (0 records) - Lead capture
25. **lead_form_submissions** (0 records) - Form submissions
26. **campaign_metrics_cache** (0 records) - Metrics cache
27. **insights_snapshots** (0 records) - Historical metrics

#### Other Tables
28. **profiles** (3 records) - User profiles
29. **temp_prompts** (3 records) - Temporary signup prompts
30. **crm_webhooks** (0 records) - CRM integration
31. **budget_allocations** (0 records) - Budget distribution
32. **campaign_audit_log** (0 records) - Audit trail
33. **ad_status_transitions** (1 record) - Status change log
34. **schema_migrations** (3 records) - Migration tracking
35. **messages_backup_invalid_parts** (1 record) - Backup table

---

## Critical Finding: Triple Storage for Location Data

### PROBLEM: Three Different Places to Store Locations

**1. ads.setup_snapshot.location** (Current/Correct)
```json
{
  "location": {
    "locations": [],  // ← This should have data but is EMPTY
    "status": "completed"
  }
}
```

**2. campaign_states.location_data** (Deprecated)
```json
{
  "location_data": null  // ← Deprecated, should be removed
}
```

**3. location_sets table** (Completely Unused)
- 0 records
- Foreign key to campaigns
- Has geojson column
- **CANDIDATE FOR REMOVAL**

---

## Phase 2: Data Flow Analysis

### Current Save Path for Location Data

**Expected Flow:**
```
addLocations() 
  → setLocationState() 
  → useAutoSave (300ms debounce)
  → saveFn()
  → updateAdSnapshot({ location: {...} })
  → Supabase UPDATE ads SET setup_snapshot = ...
```

### Issues Found

**Issue 1: useAutoSave Cleanup Cancels Saves**
```typescript
// lib/hooks/use-auto-save.ts lines 97-99
return () => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current)  // ← CANCELS SAVE
}
```

When component re-renders during 300ms wait, cleanup runs and cancels the timeout.

**Issue 2: No Verification That Save Completed**
- No logging when save completes
- No error reporting if save fails
- Silent failures

**Issue 3: Memoization Comparison Issue**
```typescript
// lib/hooks/use-auto-save.ts lines 86-87
const nextString = JSON.stringify(data)
if (JSON.stringify(lastDataRef.current) === nextString) return
```

If objects are deeply nested (like location with geometry), JSON.stringify might fail or be expensive.

---

## Phase 3: updateAdSnapshot Investigation

Need to find where `updateAdSnapshot` is defined to check:
- Does it properly merge JSONB?
- Does it handle deep updates correctly?
- Is there transaction handling?

---

## Redundant Tables/Columns Identified

### Tables to Remove
1. **location_sets** - 0 records, completely unused
2. **creative_variants** - 0 records, data now in ads.setup_snapshot
3. **copy_variants** - 0 records, data now in ads.setup_snapshot
4. **campaign_meta_links** - 0 records, redundant with campaign_meta_connections
5. **meta_connections** - 0 records, redundant with campaign_meta_connections
6. **meta_asset_snapshots** - 0 records, unused

### Columns to Remove
1. **campaign_states.location_data** - Deprecated, moved to ads.setup_snapshot.location
2. **campaign_states.generated_images** - Legacy, now in ad_preview_data

### Tables with 0 Records (Investigate Usage)
- budget_allocations
- campaign_audit_log
- campaign_metrics_cache
- crm_webhooks
- experiments
- experiment_variants
- insights_snapshots
- lead_form_submissions
- leads
- meta_webhook_events

**Need to check:** Are these tables used in code? Or safe to remove?

---

## Immediate Action Items

### Priority 1: Fix Location Save (CRITICAL)
1. Find `updateAdSnapshot` implementation
2. Add immediate save to `addLocations()` - bypass useAutoSave
3. Add logging to verify saves complete
4. Test that data reaches database

### Priority 2: Remove Redundant Location Storage
1. Drop `location_sets` table
2. Remove `campaign_states.location_data` column
3. Ensure only `ads.setup_snapshot.location` is used

### Priority 3: Clean Up Unused Tables
1. Verify which 0-record tables are actually used in code
2. Create migration to drop unused tables
3. Reduce database complexity

---

## Next Steps

1. **Find updateAdSnapshot implementation** - Trace code to see how JSONB is merged
2. **Add diagnostic save logging** - Verify saves actually complete
3. **Test immediate save** - Bypass useAutoSave for critical location data
4. **Create cleanup migration** - Remove redundant tables/columns

