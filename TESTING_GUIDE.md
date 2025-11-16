# 🧪 Backend Refactoring - Testing Guide

**Purpose**: Verify the refactored backend works correctly with the frontend  
**Status**: Implementation Complete - Testing Required  
**Time Estimate**: 30-60 minutes

---

## 🎯 What We're Testing

The backend has been completely refactored from JSON blobs to normalized tables. We need to verify:

1. ✅ Campaign creation works
2. ✅ Ad building wizard works
3. ✅ Data saves to new tables correctly
4. ✅ Data loads from new tables correctly
5. ✅ AI chat integration works
6. ✅ Publishing to Meta works

---

## 🚀 Quick Start Testing

### Step 1: Start Development Server

```bash
cd /Users/metinhakanokuyucu/adpilot
npm run dev
```

### Step 2: Open Browser

Navigate to: `http://localhost:3000`

---

## 📋 Test Plan

### Test 1: Campaign Creation (CRITICAL)

**Steps**:
1. Log in to the application
2. Click "Create Campaign" or similar button
3. Enter campaign name (or use temp prompt)
4. Submit

**Expected Result**:
- ✅ Campaign created successfully
- ✅ Redirects to campaign workspace
- ✅ No errors in browser console
- ✅ No 500 errors in server logs

**Verify in Supabase**:
```sql
SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 1;
-- Should show newly created campaign
```

**If it fails**:
- Check browser console for errors
- Check Network tab for failed API calls
- Check server logs (terminal) for database errors
- Likely cause: Frontend still referencing `campaign_states`

---

### Test 2: Creative Upload/Generation (CRITICAL)

**Steps**:
1. In campaign workspace, upload or generate creative image
2. AI generates image variations
3. Select a creative variation

**Expected Result**:
- ✅ Images appear in UI
- ✅ Selection persists
- ✅ No console errors

**Verify in Supabase**:
```sql
SELECT * FROM ad_creatives WHERE ad_id = 'YOUR_AD_ID';
-- Should show 1+ rows with image URLs
```

**If it fails**:
- Check `/api/campaigns/[id]/ads/[adId]/save` endpoint
- Check if creative data is in request body
- Verify `ad_creatives` table has data

---

### Test 3: Copy Generation & Selection (CRITICAL)

**Steps**:
1. AI generates ad copy variations (3 variations)
2. Review the variations
3. Select one variation

**Expected Result**:
- ✅ 3 copy variations appear
- ✅ Selection persists
- ✅ Selected copy highlighted
- ✅ No console errors

**Verify in Supabase**:
```sql
SELECT 
  headline,
  primary_text,
  is_selected,
  sort_order
FROM ad_copy_variations 
WHERE ad_id = 'YOUR_AD_ID'
ORDER BY sort_order;
-- Should show 3 rows, one with is_selected=true
```

**If it fails**:
- Check `/api/campaigns/[id]/ads/[adId]/save` endpoint
- Verify copy variations in request body
- Check `ad_copy_variations` table

---

### Test 4: Location Targeting (IMPORTANT)

**Steps**:
1. Go to location targeting step
2. Search for a city (e.g., "Toronto")
3. Add location to targeting
4. Verify it appears in list

**Expected Result**:
- ✅ Location search works
- ✅ Location added to list
- ✅ Location persists after refresh
- ✅ No console errors

**Verify in Supabase**:
```sql
SELECT 
  location_name,
  location_type,
  inclusion_mode
FROM ad_target_locations
WHERE ad_id = 'YOUR_AD_ID';
-- Should show added locations
```

**If it fails**:
- Check `/api/ads/[id]/locations` endpoint
- Verify POST request includes location data
- Check location format matches new schema

---

### Test 5: Destination Configuration (IMPORTANT)

**Steps**:
1. Go to destination step
2. Configure destination:
   - **Option A**: Create instant form
   - **Option B**: Enter website URL
   - **Option C**: Enter phone number
3. Save configuration

**Expected Result**:
- ✅ Destination saves successfully
- ✅ Data persists after refresh
- ✅ No console errors

**Verify in Supabase**:
```sql
SELECT 
  destination_type,
  website_url,
  phone_number,
  instant_form_id
FROM ad_destinations
WHERE ad_id = 'YOUR_AD_ID';
-- Should show 1 row with appropriate fields populated
```

**If it fails**:
- Check `/api/ads/[id]/destination` endpoint
- Verify destination_type mapping (website/form/call → website_url/instant_form/phone_number)
- Check polymorphic constraint

---

### Test 6: Budget Setting (IMPORTANT)

**Steps**:
1. Go to budget step
2. Enter daily budget (e.g., $500)
3. Set optional start/end dates
4. Save

**Expected Result**:
- ✅ Budget saves successfully
- ✅ Shows in cents (50000) in database
- ✅ Displays as dollars ($500) in UI
- ✅ No console errors

**Verify in Supabase**:
```sql
SELECT 
  daily_budget_cents,
  currency_code,
  start_date,
  end_date
FROM ad_budgets
WHERE ad_id = 'YOUR_AD_ID';
-- Should show budget in cents
```

**If it fails**:
- Check currency conversion (dollars → cents)
- Verify `/api/ads/[id]/budget` endpoint
- Check constraint: daily_budget_cents > 0

---

### Test 7: AI Chat Integration (CRITICAL)

**Steps**:
1. Open AI chat panel
2. Send a message about the campaign
3. AI responds with context about the ad
4. Try a tool call (e.g., "generate a new image")

**Expected Result**:
- ✅ Chat loads conversation history
- ✅ AI responds appropriately
- ✅ AI has context about campaign/ad
- ✅ Tool calls work
- ✅ No console errors

**Verify in Supabase**:
```sql
SELECT 
  role,
  content,
  parts,
  tool_invocations
FROM messages
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY seq DESC
LIMIT 5;
-- Should show recent messages
```

**If it fails**:
- Check `/api/chat` endpoint
- Verify conversation.metadata is accessible
- Check if AI can build context from campaigns/ads tables

---

### Test 8: Publishing to Meta (END-TO-END)

**Steps**:
1. Complete all wizard steps
2. Click "Publish" button
3. Confirm budget/payment
4. Submit to Meta

**Expected Result**:
- ✅ Publish request succeeds
- ✅ Meta ad ID returned
- ✅ Status updates to 'pending_review'
- ✅ `ad_publishing_metadata` record created
- ✅ No console errors

**Verify in Supabase**:
```sql
SELECT 
  ads.name,
  ads.status,
  ads.meta_ad_id,
  ads.published_at,
  apm.current_status
FROM ads
LEFT JOIN ad_publishing_metadata apm ON ads.id = apm.ad_id
WHERE ads.id = 'YOUR_AD_ID';
-- Should show meta_ad_id and published_at
```

**If it fails**:
- Publishing system was NOT changed (should work)
- Check if ad has all required data (creative, copy, destination, budget)
- Verify Meta connection is valid

---

### Test 9: Edit Existing Ad (IMPORTANT)

**Steps**:
1. Open an existing ad
2. Change the copy headline
3. Save changes
4. Reload page

**Expected Result**:
- ✅ Ad data loads correctly
- ✅ Changes save successfully
- ✅ Changes persist after reload
- ✅ No console errors

**Verify in Supabase**:
```sql
SELECT 
  headline,
  is_selected,
  updated_at
FROM ad_copy_variations
WHERE ad_id = 'YOUR_AD_ID' AND is_selected = true;
-- Should show updated headline
```

---

## 🔍 Debugging Tools

### Browser DevTools

**Console Tab:**
- Look for red errors
- Look for failed fetch() calls
- Filter by "Error" or "Failed"

**Network Tab:**
- Filter by "XHR" or "Fetch"
- Look for 500/404 errors
- Check request/response payloads
- Verify API endpoints exist

**Application Tab:**
- Check localStorage for issues
- Check sessionStorage

### Server Logs

Watch terminal for:
```
Error: relation "campaign_states" does not exist
Error: column "setup_snapshot" does not exist
```

These indicate missed references to old structure.

### Supabase Dashboard

**Table Editor:**
- Check if data is being saved
- Verify row counts increase
- Check data quality

**SQL Editor:**
- Run test queries (see examples above)
- Check for orphaned data
- Verify foreign key relationships

**Logs Tab:**
- Look for RLS policy errors
- Look for constraint violations
- Look for query errors

---

## 🐛 Common Issues & Fixes

### Issue 1: "campaign_states does not exist"

**Cause**: Component still references old table  
**Fix**:
```bash
# Find the file
grep -r "campaign_states" components/ lib/

# Update to use new endpoints or remove reference
```

### Issue 2: "setup_snapshot is undefined"

**Cause**: Component reading deleted column  
**Fix**: Component should call `/api/campaigns/[id]/ads/[adId]/snapshot` instead

### Issue 3: "saveCampaignState is not a function"

**Cause**: Component calling removed method  
**Fix**: Update component to call specific endpoints:
- `/api/ads/[id]/creative` for creative data
- `/api/ads/[id]/copy` for copy data
- `/api/ads/[id]/locations` for location data
- `/api/ads/[id]/destination` for destination
- `/api/ads/[id]/budget` for budget

### Issue 4: Data Not Saving

**Cause**: API endpoint may have validation error  
**Debug**:
1. Check Network tab for request body
2. Check server response for error message
3. Verify data format matches new schema
4. Check database constraints (foreign keys, CHECKs)

### Issue 5: AI Chat Broken

**Unlikely** - AI SDK integration was preserved  
**If it happens**:
1. Check `/api/chat` endpoint logs
2. Verify conversation loads from database
3. Check if context building works
4. Verify tool calls work

---

## ✅ Success Criteria

You'll know testing is complete when:

✅ Can create campaign without errors  
✅ Can upload/generate creative  
✅ Can generate and select copy  
✅ Can add location targeting  
✅ Can configure destination  
✅ Can set budget  
✅ Can preview ad  
✅ Can publish to Meta  
✅ Can edit existing ad  
✅ AI chat works  
✅ No 500 errors  
✅ No console errors  
✅ Data persists in Supabase  

---

## 📊 Verification Queries

Run these in Supabase SQL Editor to verify data:

```sql
-- Check campaign with ads
SELECT 
  c.name as campaign_name,
  c.campaign_budget_cents / 100 as total_budget,
  COUNT(a.id) as ad_count
FROM campaigns c
LEFT JOIN ads a ON c.id = a.campaign_id
GROUP BY c.id, c.name, c.campaign_budget_cents
ORDER BY c.created_at DESC;

-- Check ad with all data
SELECT 
  a.name as ad_name,
  COUNT(DISTINCT ac.id) as creative_count,
  COUNT(DISTINCT acv.id) as copy_count,
  COUNT(DISTINCT atl.id) as location_count,
  CASE WHEN ad.id IS NOT NULL THEN 'Has Destination' ELSE 'No Destination' END as has_destination,
  CASE WHEN ab.id IS NOT NULL THEN 'Has Budget' ELSE 'No Budget' END as has_budget
FROM ads a
LEFT JOIN ad_creatives ac ON a.id = ac.ad_id
LEFT JOIN ad_copy_variations acv ON a.id = acv.ad_id
LEFT JOIN ad_target_locations atl ON a.id = atl.ad_id
LEFT JOIN ad_destinations ad ON a.id = ad.ad_id
LEFT JOIN ad_budgets ab ON a.id = ab.ad_id
GROUP BY a.id, a.name, ad.id, ab.id
ORDER BY a.created_at DESC;

-- Check selected items
SELECT 
  a.name,
  ac_selected.image_url as selected_creative,
  acv_selected.headline as selected_copy
FROM ads a
LEFT JOIN ad_creatives ac_selected ON a.selected_creative_id = ac_selected.id
LEFT JOIN ad_copy_variations acv_selected ON a.selected_copy_id = acv_selected.id
ORDER BY a.created_at DESC;
```

---

## 🎬 Testing Script

For systematic testing, follow this script:

### Pre-Test Checklist
- [ ] Development server running (`npm run dev`)
- [ ] Logged into application
- [ ] Supabase dashboard open
- [ ] Browser DevTools open (Console + Network)

### Test Execution

**Test 1: Homepage** (2 min)
- [ ] Load homepage - no errors
- [ ] Campaigns list loads
- [ ] Can click into campaign

**Test 2: Create Campaign** (3 min)
- [ ] Click create campaign
- [ ] Campaign created successfully
- [ ] Appears in Supabase `campaigns` table
- [ ] Initial draft ad created in `ads` table

**Test 3: Creative** (5 min)
- [ ] Upload or generate creative
- [ ] See image variations
- [ ] Select a variation
- [ ] Data in `ad_creatives` table

**Test 4: Copy** (5 min)
- [ ] AI generates copy variations
- [ ] See 3 variations
- [ ] Select one
- [ ] Data in `ad_copy_variations` table with is_selected=true

**Test 5: Location** (5 min)
- [ ] Search for location
- [ ] Add location to targeting
- [ ] Location appears in list
- [ ] Data in `ad_target_locations` table

**Test 6: Destination** (5 min)
- [ ] Configure destination (form/URL/phone)
- [ ] Save configuration
- [ ] Data in `ad_destinations` table

**Test 7: Budget** (3 min)
- [ ] Enter budget amount
- [ ] Save budget
- [ ] Data in `ad_budgets` table (in cents)

**Test 8: AI Chat** (5 min)
- [ ] Open chat panel
- [ ] Send message
- [ ] AI responds with context
- [ ] Try tool call (generate image)
- [ ] Tool call works

**Test 9: Save & Reload** (3 min)
- [ ] Make changes to ad
- [ ] Reload page
- [ ] Changes persisted
- [ ] Data loads correctly

**Test 10: Publish** (5 min)
- [ ] Complete all steps
- [ ] Click publish
- [ ] Meta connection works
- [ ] Ad submits successfully

---

## 📝 Test Results Template

Copy this to document your testing:

```markdown
## Test Results - [DATE]

### Environment
- Browser: [Chrome/Firefox/Safari]
- Node Version: [X.X.X]
- Dev Server: [Running/Issues]

### Test 1: Campaign Creation
- Status: [✅ Pass / ❌ Fail]
- Notes: 
- Errors (if any):

### Test 2: Creative
- Status: [✅ Pass / ❌ Fail]
- Notes:
- Errors (if any):

### Test 3: Copy
- Status: [✅ Pass / ❌ Fail]
- Notes:
- Errors (if any):

### Test 4: Location
- Status: [✅ Pass / ❌ Fail]
- Notes:
- Errors (if any):

### Test 5: Destination
- Status: [✅ Pass / ❌ Fail]
- Notes:
- Errors (if any):

### Test 6: Budget
- Status: [✅ Pass / ❌ Fail]
- Notes:
- Errors (if any):

### Test 7: AI Chat
- Status: [✅ Pass / ❌ Fail]
- Notes:
- Errors (if any):

### Test 8: Save & Reload
- Status: [✅ Pass / ❌ Fail]
- Notes:
- Errors (if any):

### Test 9: Publish
- Status: [✅ Pass / ❌ Fail]
- Notes:
- Errors (if any):

### Overall Result
- Tests Passed: [X/9]
- Critical Issues: [None/List]
- Minor Issues: [None/List]
- Ready for Production: [Yes/No]
```

---

## 🔧 Troubleshooting Commands

### Check for Remaining Old References

```bash
# Find campaign_states references
grep -r "campaign_states" app/ lib/ components/ | grep -v node_modules

# Find setup_snapshot references
grep -r "setup_snapshot" app/ lib/ components/ | grep -v node_modules

# Find saveCampaignState references
grep -r "saveCampaignState" app/ lib/ components/ | grep -v node_modules
```

### Database Verification

```sql
-- Verify no old tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('campaign_states', 'copy_variants', 'creative_variants', 'experiments');
-- Should return 0 rows

-- Verify new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('ad_creatives', 'ad_copy_variations', 'ad_target_locations', 'ad_destinations', 'ad_budgets');
-- Should return 5 rows

-- Check data flow
SELECT 
  (SELECT COUNT(*) FROM ads) as total_ads,
  (SELECT COUNT(*) FROM ad_creatives) as total_creatives,
  (SELECT COUNT(*) FROM ad_copy_variations) as total_copy,
  (SELECT COUNT(*) FROM ad_target_locations) as total_locations,
  (SELECT COUNT(*) FROM ad_destinations) as total_destinations,
  (SELECT COUNT(*) FROM ad_budgets) as total_budgets;
```

---

## 🎯 Testing Priority

**Priority 1 (Must Work)**:
1. Campaign creation
2. Ad save
3. Ad load
4. AI chat

**Priority 2 (Should Work)**:
5. Location targeting
6. Destination config
7. Budget setting

**Priority 3 (Nice to Have)**:
8. Analytics endpoints
9. Search endpoint
10. Edit mode

---

## ✅ When Testing is Complete

Once all tests pass:

1. **Mark todos as complete**
2. **Document any issues found**
3. **Deploy to staging** (if available)
4. **Deploy to production**
5. **Monitor error rates**

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Documentation**:
   - `IMPLEMENTATION_COMPLETE.md` - What was built
   - `MIGRATION_VERIFICATION_REPORT.md` - Database status
   - `CRITICAL_ISSUES_REPORT.md` - Common problems

2. **Check Supabase**:
   - Dashboard → Logs
   - Dashboard → Table Editor
   - SQL Editor for queries

3. **Check Code**:
   - `lib/services/ad-data-service.ts` - Service methods
   - `app/api/ads/[id]/` - New endpoints
   - `app/api/campaigns/route.ts` - Campaign operations

---

**The refactoring is complete. Testing validates everything works together!** 🚀

**Estimated Testing Time**: 30-60 minutes  
**Expected Result**: 9/9 tests passing  
**Readiness**: Production-ready after successful testing

