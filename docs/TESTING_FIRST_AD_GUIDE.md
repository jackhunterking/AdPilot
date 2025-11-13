# Testing Your First Real Meta Ad - Complete Guide

**System Status:** ✅ READY FOR TESTING  
**Destination Data Fix:** ✅ APPLIED  
**Date:** January 19, 2025

---

## 🎯 Prerequisites Checklist

Before testing, ensure you have:

- [x] **Meta Ad Account** with payment method configured
- [x] **Facebook Page** connected to your account
- [x] **Campaign created** in AdPilot with complete data:
  - [x] Goal selected (leads, website-visits, or calls)
  - [x] Location(s) added
  - [x] Budget set (minimum $5/day)
  - [x] Ad copy generated (3 variations)
  - [x] Images generated/uploaded
  - [x] Meta account connected to campaign
  - [x] Destination configured:
    - **Leads:** Lead form created OR website URL set
    - **Website Visits:** Website URL set in goal form
    - **Calls:** Phone number set in goal form

---

## 📊 Test Scenario 1: Prepare and Validate

### Step 1: Call Prepare-Publish API

**Endpoint:** `POST /api/campaigns/{campaignId}/prepare-publish`

**Example using curl:**
```bash
curl -X POST "http://localhost:3000/api/campaigns/YOUR_CAMPAIGN_ID/prepare-publish" \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE"
```

**Example using fetch (browser console):**
```javascript
const response = await fetch('/api/campaigns/YOUR_CAMPAIGN_ID/prepare-publish', {
  method: 'POST',
  credentials: 'include'
});

const result = await response.json();
console.log('Prepare Result:', result);
```

### Step 2: Expected Success Response

```json
{
  "success": true,
  "canPublish": true,
  "validationResults": {
    "isValid": true,
    "canPublish": true,
    "errors": [],
    "warnings": [],
    "checkedAt": "2025-01-19T..."
  },
  "publishPreview": {
    "campaignName": "Your Campaign - 2025-01-19",
    "objective": "OUTCOME_TRAFFIC",
    "dailyBudget": "$20.00",
    "targeting": "1 country",
    "adCount": 3
  },
  "warnings": []
}
```

### Step 3: Check for Validation Errors

**If canPublish is false:**
```json
{
  "success": false,
  "canPublish": false,
  "validationResults": {
    "errors": [
      {
        "code": "NO_IMAGES",
        "field": "ad_preview_data",
        "message": "No ad images available",
        "severity": "CRITICAL",
        "suggestedFix": "Generate ad images"
      }
    ]
  }
}
```

**Fix any errors and retry prepare-publish.**

---

## 🚀 Test Scenario 2: Publish to Meta

### Step 1: Call Publish API

**Endpoint:** `POST /api/meta/publish`

**Example using fetch:**
```javascript
const response = await fetch('/api/meta/publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ campaignId: 'YOUR_CAMPAIGN_ID' }),
  credentials: 'include'
});

const result = await response.json();
console.log('Publish Result:', result);
```

### Step 2: Expected Success Response

```json
{
  "success": true,
  "publishResult": {
    "success": true,
    "metaCampaignId": "120210000000000",
    "metaAdSetId": "120210000000001",
    "metaAdIds": ["120210000000002", "120210000000003", "120210000000004"],
    "publishStatus": "paused",
    "createdAt": "2025-01-19T..."
  },
  "status": {
    "publishStatus": "active",
    "metaCampaignId": "120210000000000",
    "metaAdSetId": "120210000000001",
    "metaAdIds": ["120210000000002", "120210000000003", "120210000000004"],
    "errorMessage": null,
    "publishedAt": "2025-01-19T...",
    "pausedAt": null,
    "campaignStatus": "active"
  }
}
```

### Step 3: Monitor Progress (Check Logs)

The system will log each stage:
1. PREPARING - Loading campaign data
2. VALIDATING - Checking prerequisites
3. UPLOADING_IMAGES - Uploading images to Meta
4. CREATING_CREATIVES - Creating ad creatives
5. CREATING_CAMPAIGN - Creating campaign
6. CREATING_ADSET - Creating ad set
7. CREATING_ADS - Creating ads
8. VERIFYING - Verifying creation
9. COMPLETE - Success!

---

## ✅ Test Scenario 3: Verify on Meta Ads Manager

### Step 1: Open Meta Ads Manager

Go to: https://adsmanager.facebook.com/

### Step 2: Navigate to Your Ad Account

- Select the ad account you connected to AdPilot
- You should see a new campaign

### Step 3: Verify Campaign

**Campaign Level:**
- ✅ Campaign name includes date: "Your Campaign - 2025-01-19"
- ✅ Objective matches your goal:
  - Leads → "Leads" or similar
  - Website Visits → "Traffic" or "Link Clicks"
  - Calls → "Traffic" with call CTA
- ✅ Status is **PAUSED** (for safety)
- ✅ Special ad categories: None (unless you're in restricted category)

### Step 4: Verify Ad Set

Click into the campaign to see the ad set:
- ✅ Ad set name: "Your Campaign - AdSet"
- ✅ Daily budget: $20.00 (or your amount)
- ✅ Optimization: Link Clicks / Lead Generation
- ✅ Targeting: Your selected location(s)
- ✅ Age range: 18-65
- ✅ Placements: Facebook & Instagram (automatic)
- ✅ Status: **PAUSED**

### Step 5: Verify Ads

Click into the ad set to see individual ads:
- ✅ 3 ads created (or your variation count)
- ✅ Ad names: "Your Campaign - Ad 1", "Ad 2", "Ad 3"
- ✅ Each ad has:
  - ✅ Correct image
  - ✅ Correct primary text
  - ✅ Correct headline
  - ✅ Correct call-to-action button
  - ✅ Correct destination (URL/form/phone)
- ✅ All ads status: **PAUSED**

### Step 6: Check Ad Preview

Click "Preview" on any ad to see how it looks:
- ✅ Image displays correctly
- ✅ Text is properly formatted
- ✅ CTA button shows correct action
- ✅ Destination link works

---

## 🔍 Test Scenario 4: Verify Database

### Check Supabase Database

```sql
-- Get published campaign data
SELECT 
  c.id,
  c.name,
  c.published_status,
  mpc.meta_campaign_id,
  mpc.meta_adset_id,
  mpc.meta_ad_ids,
  mpc.publish_status,
  mpc.published_at
FROM campaigns c
JOIN meta_published_campaigns mpc ON mpc.campaign_id = c.id
WHERE c.id = 'YOUR_CAMPAIGN_ID';

-- Get individual ads with Meta IDs
SELECT 
  id,
  name,
  status,
  meta_ad_id,
  published_at
FROM ads
WHERE campaign_id = 'YOUR_CAMPAIGN_ID'
ORDER BY created_at;
```

**Expected Results:**
- ✅ `published_status` = 'active'
- ✅ `meta_campaign_id` = Real Meta ID (not 'pending')
- ✅ `meta_adset_id` = Real Meta ID
- ✅ `meta_ad_ids` = Array of 3 Meta IDs
- ✅ `publish_status` = 'active'
- ✅ `published_at` = Timestamp
- ✅ Each ad has `meta_ad_id` populated

---

## 🧪 Test Scenario 5: Error Handling

### Test 1: Publish Without Preparation

```javascript
// Try to publish without calling prepare-publish first
const response = await fetch('/api/meta/publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ campaignId: 'UNPREPARED_CAMPAIGN_ID' }),
  credentials: 'include'
});

const result = await response.json();
```

**Expected:** Error message "Campaign not prepared for publishing"

### Test 2: Expired Token

**Manually expire token in database:**
```sql
UPDATE campaign_meta_connections
SET token_expires_at = NOW() - INTERVAL '1 day'
WHERE campaign_id = 'YOUR_CAMPAIGN_ID';
```

**Then call prepare-publish:**

**Expected:** Validation error about expired token

### Test 3: Missing Payment Method

**Set payment_connected to false:**
```sql
UPDATE campaign_meta_connections
SET ad_account_payment_connected = false
WHERE campaign_id = 'YOUR_CAMPAIGN_ID';
```

**Expected:** Validation error about missing payment method

---

## 📈 Test Scenario 6: Activate Campaign

### Option A: Via Meta Ads Manager

1. Go to Meta Ads Manager
2. Find your campaign
3. Click the toggle to set status to **ACTIVE**
4. Confirm activation
5. Ads will start running!

### Option B: Via API (Future Enhancement)

```javascript
// Would use the pause/resume endpoints
const response = await fetch('/api/meta/campaign/resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ campaignId: 'YOUR_CAMPAIGN_ID' }),
  credentials: 'include'
});
```

---

## 🐛 Troubleshooting Guide

### Issue: "Campaign not found"
**Cause:** Invalid campaign ID or not owned by user  
**Fix:** Verify campaign ID and user ownership

### Issue: "Meta connection not found"
**Cause:** Meta account not connected to campaign  
**Fix:** Connect Facebook account via Meta setup flow

### Issue: "Token has expired"
**Cause:** Meta token expired  
**Fix:** Reconnect Facebook account

### Issue: "No payment method"
**Cause:** Ad account missing payment method  
**Fix:** Add payment method in Meta Business Manager

### Issue: "No locations selected"
**Cause:** Location targeting not configured  
**Fix:** Add at least one target location

### Issue: "No ad images available"
**Cause:** Images not generated  
**Fix:** Generate ad images in preview step

### Issue: "Phone number required"
**Cause:** Call campaign without phone number  
**Fix:** Set phone number in call configuration

### Issue: "Website URL required"
**Cause:** Website visits campaign without URL  
**Fix:** Set website URL in goal configuration

### Issue: "Image upload failed"
**Cause:** Network error or invalid image  
**Fix:** Check image URLs are accessible, retry

### Issue: "Creative creation failed"
**Cause:** Invalid creative data or Meta API error  
**Fix:** Check logs for specific Meta error, verify page_id is correct

### Issue: "Campaign creation failed"
**Cause:** Invalid payload or Meta API error  
**Fix:** Check logs for Meta error code, verify ad account permissions

---

## 📝 Success Criteria

Your first ad is successfully published if:

- ✅ API returns success: true
- ✅ metaCampaignId is a real ID (not 'pending')
- ✅ metaAdSetId is a real ID
- ✅ metaAdIds array has 3 IDs
- ✅ Campaign visible in Meta Ads Manager
- ✅ All ads in PAUSED state
- ✅ Images display correctly
- ✅ Ad copy is correct
- ✅ Destination link works
- ✅ Database updated with Meta IDs

---

## 🎓 Understanding the Flow

### What Happens During Publish

**Phase 1: Preparation (prepare-publish)**
1. Loads campaign data
2. Loads Meta connection
3. Runs 5 preflight checks:
   - Connection (token valid, permissions OK)
   - Funding (payment method, account active)
   - Campaign Data (all fields complete)
   - Compliance (policy checks)
   - Targeting (locations valid)
4. Transforms campaign state to Meta format
5. Saves publish_data to database

**Phase 2: Publishing (publish)**
1. Loads publish_data
2. Fetches images from Supabase (if not cached)
3. Validates images (dimensions, format, size)
4. Processes images (convert to JPEG, optimize)
5. Uploads images to Meta AdImage API → Gets image hashes
6. Generates creative payloads with image hashes
7. Creates ad creatives on Meta → Gets creative IDs
8. Creates campaign on Meta → Gets campaign ID
9. Creates ad set on Meta (linked to campaign) → Gets adset ID
10. Creates ads on Meta (linked to adset & creatives) → Gets ad IDs
11. Verifies all objects exist on Meta
12. Updates database with all Meta IDs
13. Returns success!

**Safety Features:**
- ✅ All campaigns start **PAUSED** (must manually activate)
- ✅ Automatic retry on transient errors (3 attempts)
- ✅ Rollback on failures (deletes created objects)
- ✅ State persistence (can resume if interrupted)
- ✅ Comprehensive error messages

---

## 📞 Support

If you encounter issues:

1. **Check the logs** in terminal/console for detailed error messages
2. **Check Meta Ads Manager** to see if anything was created
3. **Check Supabase database** for state persistence
4. **Review error code** in response for specific issue
5. **Retry** after fixing the issue (system is idempotent)

---

## 🎉 Next Steps After Success

Once your first ad publishes successfully:

1. **Leave it PAUSED** for now (safe)
2. **Review in Meta Ads Manager** - make any final tweaks
3. **Test with small budget** - Activate and run for 24-48 hours
4. **Monitor performance** - Check impressions, clicks, results
5. **Iterate** - Adjust targeting, budget, creative based on data

---

**Ready to publish your first real Meta ad!** 🚀

**Quick Start Command:**
```javascript
// In browser console on your campaign page:
const campaignId = 'paste-your-campaign-id-here';

// Step 1: Prepare
const prep = await fetch(`/api/campaigns/${campaignId}/prepare-publish`, {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json());

console.log('Prepare:', prep);

// Step 2: If canPublish is true, publish!
if (prep.canPublish) {
  const pub = await fetch('/api/meta/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId }),
    credentials: 'include'
  }).then(r => r.json());
  
  console.log('Published:', pub);
  console.log('Meta Campaign ID:', pub.publishResult?.metaCampaignId);
  console.log('Check Meta Ads Manager!');
} else {
  console.error('Cannot publish:', prep.validationResults.errors);
}
```

