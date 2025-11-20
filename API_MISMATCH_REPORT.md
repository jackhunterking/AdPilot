# API Method Mismatch Report

**Generated:** November 20, 2025  
**Audit Scope:** All client fetch calls to `/api/v1/*` endpoints  
**Total Fetch Calls Found:** 112 occurrences across 23 files

---

## Executive Summary

### Issues Found

- **✅ FIXED:** 11 files using POST/PATCH instead of PUT for `/api/v1/ads/[id]/save`
- **🔴 CRITICAL:** 2 non-existent endpoints being called by clients
- **🟡 WARNING:** 1 incorrect endpoint path
- **✅ VERIFIED:** 95+ API calls using correct methods

---

## Critical Issues (Require Immediate Action)

### 🔴 Issue #1: Non-Existent Duplicate Endpoint

**Client Call:**
```typescript
// lib/services/client/ad-service-client.ts:396
const response = await fetch(`/api/v1/ads/${adId}/duplicate`, {
  method: 'POST',
  credentials: 'include',
});
```

**Problem:** No `/api/v1/ads/[id]/duplicate` route exists in the codebase

**Impact:** Any attempt to duplicate ads will fail with 404

**Resolution Options:**
1. Create the missing route endpoint
2. Remove the duplicate ad feature if not needed
3. Implement duplication client-side using create + copy logic

---

### 🟡 Issue #2: Incorrect Form Endpoint Path

**Client Call:**
```typescript
// lib/services/client/destination-service-client.ts:151
const response = await fetch(`/api/v1/meta/forms/${input.formId}?campaignId=${input.campaignId}`, {
  method: 'GET',
  credentials: 'include',
});
```

**Actual Route:** `/api/v1/meta/instant-forms/[id]`

**Problem:** Path mismatch - client uses `/meta/forms/[id]`, route is `/meta/instant-forms/[id]`

**Impact:** Get form details by ID will fail with 404

**Fix Required:**
```typescript
// CURRENT (WRONG)
const response = await fetch(`/api/v1/meta/forms/${input.formId}?campaignId=${input.campaignId}`, {

// SHOULD BE
const response = await fetch(`/api/v1/meta/instant-forms/${input.formId}?campaignId=${input.campaignId}`, {
```

**File to Fix:** `lib/services/client/destination-service-client.ts:151`

---

## Previously Fixed Issues (✅ Resolved in Phase 2)

### /api/v1/ads/[id]/save Method Mismatch

**Status:** ✅ FIXED - All 11 files updated to use PUT method

**Files Fixed:**
1. ✅ `lib/hooks/use-draft-auto-save.ts` - POST → PUT
2. ✅ `components/ai-chat.tsx` - POST → PUT
3. ✅ `components/ad-copy-selection-canvas.tsx` - POST → PUT
4. ✅ `components/preview-panel.tsx` (2 instances) - PATCH → PUT
5. ✅ `lib/services/server/save-service-server.ts` - POST → PUT
6. ✅ `lib/hooks/use-save-ad.ts` - POST → PUT
7. ✅ `lib/context/current-ad-context.tsx` - POST → PUT
8. ✅ `lib/services/client/destination-service-client.ts` - POST → PUT
9. ✅ `lib/services/client/copy-service-client.ts` - POST → PUT
10. ✅ `lib/services/client/save-service-client.ts` - POST → PUT
11. ✅ `lib/services/client/ad-service-client.ts` - POST → PUT

---

## Verified Correct API Calls

### Campaigns API (✅ All Correct)

| Endpoint | Method | Files | Status |
|----------|--------|-------|--------|
| `/api/v1/campaigns` | GET | 3 files | ✅ Correct |
| `/api/v1/campaigns` | POST | 2 files | ✅ Correct |
| `/api/v1/campaigns/[id]` | GET | 5 files | ✅ Correct |
| `/api/v1/campaigns/[id]` | PATCH | 1 file | ✅ Correct |
| `/api/v1/campaigns/[id]` | DELETE | 2 files | ✅ Correct |

### Ads API (✅ Mostly Correct, 1 non-existent endpoint)

| Endpoint | Method | Files | Status |
|----------|--------|-------|--------|
| `/api/v1/ads` | GET | 4 files | ✅ Correct |
| `/api/v1/ads` | POST | 6 files | ✅ Correct |
| `/api/v1/ads/[id]` | GET | 8 files | ✅ Correct |
| `/api/v1/ads/[id]` | PATCH | 3 files | ✅ Correct |
| `/api/v1/ads/[id]` | DELETE | 4 files | ✅ Correct |
| `/api/v1/ads/[id]/save` | GET | 3 files | ✅ Correct |
| `/api/v1/ads/[id]/save` | PUT | 11 files | ✅ Fixed (was POST/PATCH) |
| `/api/v1/ads/[id]/publish` | POST | 5 files | ✅ Correct |
| `/api/v1/ads/[id]/pause` | POST | 2 files | ✅ Correct |
| `/api/v1/ads/[id]/resume` | POST | 2 files | ✅ Correct |
| `/api/v1/ads/[id]/duplicate` | POST | 1 file | 🔴 **Route doesn't exist** |
| `/api/v1/ads/[id]/locations` | POST | 2 files | ✅ Correct |
| `/api/v1/ads/[id]/locations` | DELETE | 1 file | ✅ Correct |
| `/api/v1/ads/[id]/locations/exclude` | POST | 1 file | ✅ Correct |
| `/api/v1/ads/[id]/locations/[locationId]` | DELETE | 1 file | ✅ Correct |

### Meta Integration API (✅ All Correct, 1 path mismatch)

| Endpoint | Method | Files | Status |
|----------|--------|-------|--------|
| `/api/v1/meta/status` | GET | 3 files | ✅ Correct |
| `/api/v1/meta/assets` | GET | 2 files | ✅ Correct |
| `/api/v1/meta/businesses` | GET | 2 files | ✅ Correct |
| `/api/v1/meta/pages` | GET | 2 files | ✅ Correct |
| `/api/v1/meta/ad-accounts` | GET | 2 files | ✅ Correct |
| `/api/v1/meta/business-connections` | POST | 1 file | ✅ Correct |
| `/api/v1/meta/page-picture` | GET | 1 file | ✅ Correct |
| `/api/v1/meta/payment` | POST | 1 file | ✅ Correct |
| `/api/v1/meta/payment/status` | GET | 1 file | ✅ Correct |
| `/api/v1/meta/admin` | GET, POST | 2 files | ✅ Correct |
| `/api/v1/meta/metrics` | GET | 2 files | ✅ Correct |
| `/api/v1/meta/breakdown` | GET | 1 file | ✅ Correct |
| `/api/v1/meta/forms` | GET | 3 files | ✅ Correct |
| `/api/v1/meta/forms` | POST | 2 files | ✅ Correct |
| `/api/v1/meta/forms/[id]` | GET | 1 file | 🟡 **Wrong path** (should be `/meta/instant-forms/[id]`) |
| `/api/v1/meta/instant-forms` | GET | 1 file | ✅ Correct |
| `/api/v1/meta/instant-forms/[id]` | GET | 0 files | ⚠️ **Route exists but not used** |
| `/api/v1/meta/disconnect` | POST | 1 file | ✅ Correct |
| `/api/v1/meta/refresh-token` | POST | 1 file | ✅ Correct |
| `/api/v1/meta/destination/phone` | POST | 1 file | ✅ Correct |

### Conversations & Chat API (✅ All Correct)

| Endpoint | Method | Files | Status |
|----------|--------|-------|--------|
| `/api/v1/conversations` | GET | 2 files | ✅ Correct |
| `/api/v1/conversations` | POST | 1 file | ✅ Correct |
| `/api/v1/conversations/[id]` | GET | 1 file | ✅ Correct |
| `/api/v1/conversations/[id]` | PATCH | 1 file | ✅ Correct |
| `/api/v1/conversations/[id]` | DELETE | 1 file | ✅ Correct |
| `/api/v1/conversations/[id]/messages` | GET | 1 file | ✅ Correct |
| `/api/v1/chat` | POST | 1 file | ✅ Correct |

### Leads API (✅ All Correct)

| Endpoint | Method | Files | Status |
|----------|--------|-------|--------|
| `/api/v1/leads` | GET | 2 files | ✅ Correct |
| `/api/v1/leads/export` | GET | 1 file | ✅ Correct |

### Creative & Images API (✅ All Correct)

| Endpoint | Method | Files | Status |
|----------|--------|-------|--------|
| `/api/v1/images/variations` | POST | 2 files | ✅ Correct |
| `/api/v1/images/variations/single` | POST | 1 file | ✅ Correct |
| `/api/v1/creative/plan` | POST | 6 files | ✅ Correct |

### Budget API (✅ All Correct)

| Endpoint | Method | Files | Status |
|----------|--------|-------|--------|
| `/api/v1/budget/distribute` | POST | 1 file | ✅ Correct |

---

## Action Items

### Immediate (Before Deployment)

1. **🔴 Fix duplicate ad endpoint**
   - File: `lib/services/client/ad-service-client.ts:396`
   - Option A: Create `/api/v1/ads/[id]/duplicate` route
   - Option B: Remove duplicate functionality

2. **🟡 Fix form path mismatch**
   - File: `lib/services/client/destination-service-client.ts:151`
   - Change: `/api/v1/meta/forms/[id]` → `/api/v1/meta/instant-forms/[id]`

### Medium Priority (Quality Improvement)

3. **Update V1_MIGRATION_GUIDE.md**
   - Fix documentation showing POST instead of PUT for /save endpoint
   - Document duplicate endpoint status

4. **Add type-safe API wrapper** (Phase 4)
   - Prevent future method/path mismatches at compile time

---

## Files Requiring Updates

### Critical Priority

```
lib/services/client/ad-service-client.ts (duplicate endpoint)
lib/services/client/destination-service-client.ts (form path)
docs/V1_MIGRATION_GUIDE.md (documentation)
```

### May Require New Route

```
app/api/v1/ads/[id]/duplicate/route.ts (if duplicate feature is needed)
```

---

## Verification Status

- ✅ All 43 API routes inventoried
- ✅ All 112 client fetch calls audited
- ✅ 11 method mismatches fixed (POST/PATCH → PUT)
- 🔴 2 critical issues identified
- 🟡 1 path mismatch identified
- ✅ 95+ API calls verified correct

---

**Next Steps:**
1. Fix duplicate endpoint issue
2. Fix form path mismatch
3. Update documentation
4. Proceed to Phase 4 (Type Safety System)

