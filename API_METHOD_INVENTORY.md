# API v1 Method Inventory

**Generated:** November 20, 2025  
**Purpose:** Complete HTTP method mapping for all 43 API v1 routes  
**Source:** Extracted from route.ts exports via codebase audit

---

## Summary

- **Total Routes:** 43
- **Total HTTP Methods:** 59 exports across all routes
- **Method Distribution:**
  - GET: 24 routes
  - POST: 23 routes
  - PATCH: 5 routes
  - DELETE: 6 routes
  - PUT: 1 route

---

## Complete Route Inventory

### Campaigns API (7 methods across 3 routes)

| Route | Methods | File |
|-------|---------|------|
| `/api/v1/campaigns` | GET, POST | `app/api/v1/campaigns/route.ts` |
| `/api/v1/campaigns/[id]` | GET, PATCH, DELETE | `app/api/v1/campaigns/[id]/route.ts` |
| `/api/v1/campaigns/[id]/state` | GET, PATCH | `app/api/v1/campaigns/[id]/state/route.ts` |

### Ads API (14 methods across 9 routes)

| Route | Methods | File |
|-------|---------|------|
| `/api/v1/ads` | GET, POST | `app/api/v1/ads/route.ts` |
| `/api/v1/ads/[id]` | GET, PATCH, DELETE | `app/api/v1/ads/[id]/route.ts` |
| `/api/v1/ads/[id]/save` | **GET, PUT** | `app/api/v1/ads/[id]/save/route.ts` |
| `/api/v1/ads/[id]/publish` | POST | `app/api/v1/ads/[id]/publish/route.ts` |
| `/api/v1/ads/[id]/pause` | POST | `app/api/v1/ads/[id]/pause/route.ts` |
| `/api/v1/ads/[id]/resume` | POST | `app/api/v1/ads/[id]/resume/route.ts` |
| `/api/v1/ads/[id]/locations` | POST, DELETE | `app/api/v1/ads/[id]/locations/route.ts` |
| `/api/v1/ads/[id]/locations/exclude` | POST | `app/api/v1/ads/[id]/locations/exclude/route.ts` |
| `/api/v1/ads/[id]/locations/[locationId]` | DELETE | `app/api/v1/ads/[id]/locations/[locationId]/route.ts` |

**⚠️ CRITICAL:** `/api/v1/ads/[id]/save` accepts **PUT**, NOT POST

### Conversations & Chat API (6 methods across 4 routes)

| Route | Methods | File |
|-------|---------|------|
| `/api/v1/conversations` | GET, POST | `app/api/v1/conversations/route.ts` |
| `/api/v1/conversations/[id]` | GET, PATCH, DELETE | `app/api/v1/conversations/[id]/route.ts` |
| `/api/v1/conversations/[id]/messages` | GET | `app/api/v1/conversations/[id]/messages/route.ts` |
| `/api/v1/chat` | POST | `app/api/v1/chat/route.ts` |

### Meta Integration API (18 methods across 16 routes)

| Route | Methods | File |
|-------|---------|------|
| `/api/v1/meta/status` | GET | `app/api/v1/meta/status/route.ts` |
| `/api/v1/meta/assets` | GET | `app/api/v1/meta/assets/route.ts` |
| `/api/v1/meta/businesses` | GET | `app/api/v1/meta/businesses/route.ts` |
| `/api/v1/meta/pages` | GET | `app/api/v1/meta/pages/route.ts` |
| `/api/v1/meta/ad-accounts` | GET | `app/api/v1/meta/ad-accounts/route.ts` |
| `/api/v1/meta/business-connections` | POST | `app/api/v1/meta/business-connections/route.ts` |
| `/api/v1/meta/page-picture` | GET | `app/api/v1/meta/page-picture/route.ts` |
| `/api/v1/meta/payment` | POST | `app/api/v1/meta/payment/route.ts` |
| `/api/v1/meta/payment/status` | GET | `app/api/v1/meta/payment/status/route.ts` |
| `/api/v1/meta/admin` | GET, POST | `app/api/v1/meta/admin/route.ts` |
| `/api/v1/meta/metrics` | GET | `app/api/v1/meta/metrics/route.ts` |
| `/api/v1/meta/breakdown` | GET | `app/api/v1/meta/breakdown/route.ts` |
| `/api/v1/meta/forms` | GET, POST | `app/api/v1/meta/forms/route.ts` |
| `/api/v1/meta/instant-forms` | GET | `app/api/v1/meta/instant-forms/route.ts` |
| `/api/v1/meta/instant-forms/[id]` | GET | `app/api/v1/meta/instant-forms/[id]/route.ts` |
| `/api/v1/meta/leads/webhook` | GET, POST | `app/api/v1/meta/leads/webhook/route.ts` |
| `/api/v1/meta/auth/callback` | GET | `app/api/v1/meta/auth/callback/route.ts` |
| `/api/v1/meta/disconnect` | POST | `app/api/v1/meta/disconnect/route.ts` |
| `/api/v1/meta/refresh-token` | POST | `app/api/v1/meta/refresh-token/route.ts` |
| `/api/v1/meta/destination/phone` | POST | `app/api/v1/meta/destination/phone/route.ts` |

### Leads API (2 methods across 2 routes)

| Route | Methods | File |
|-------|---------|------|
| `/api/v1/leads` | GET | `app/api/v1/leads/route.ts` |
| `/api/v1/leads/export` | GET | `app/api/v1/leads/export/route.ts` |

### Creative & Images API (3 methods across 3 routes)

| Route | Methods | File |
|-------|---------|------|
| `/api/v1/images/variations` | POST | `app/api/v1/images/variations/route.ts` |
| `/api/v1/images/variations/single` | POST | `app/api/v1/images/variations/single/route.ts` |
| `/api/v1/creative/plan` | POST | `app/api/v1/creative/plan/route.ts` |

### Budget API (1 method across 1 route)

| Route | Methods | File |
|-------|---------|------|
| `/api/v1/budget/distribute` | POST | `app/api/v1/budget/distribute/route.ts` |

### Temp Prompt API (2 methods across 1 route)

| Route | Methods | File |
|-------|---------|------|
| `/api/v1/temp-prompt` | GET, POST | `app/api/v1/temp-prompt/route.ts` |

---

## Known Issues

### 🔴 Critical: Method Mismatch on `/api/v1/ads/[id]/save`

**Route accepts:** GET, PUT  
**Clients sending:** POST, PATCH (incorrect)

**Affected client files (11 total):**
1. `lib/hooks/use-draft-auto-save.ts:162` - POST ❌
2. `components/ai-chat.tsx:626` - POST ❌
3. `components/ad-copy-selection-canvas.tsx:78` - POST ❌
4. `lib/services/server/save-service-server.ts:78` - POST ❌
5. `lib/hooks/use-save-ad.ts:154` - POST ❌
6. `lib/context/current-ad-context.tsx:201` - POST ❌
7. `lib/services/client/destination-service-client.ts:37` - POST ❌
8. `lib/services/client/copy-service-client.ts:276` - POST ❌
9. `lib/services/client/save-service-client.ts:84` - POST ❌
10. `lib/services/client/ad-service-client.ts:217` - POST ❌
11. `components/preview-panel.tsx:199,774` - PATCH ❌

**Impact:** All save operations fail with 405 Method Not Allowed

---

## Method Usage Patterns

### RESTful Pattern Analysis

**Standard CRUD Operations:**
- Collection GET: List resources
- Collection POST: Create resource
- Item GET: Retrieve single resource
- Item PATCH: Partial update
- Item DELETE: Remove resource
- Item PUT: Replace/save complete resource (special case: `/save` endpoint)

**Action Endpoints (POST):**
- `/publish` - Trigger publishing workflow
- `/pause` - Pause active ad
- `/resume` - Resume paused ad
- `/exclude` - Add excluded locations

**Non-Standard:**
- `/save` uses PUT instead of PATCH (intentional: complete snapshot replacement)
- Some routes support both GET and POST (e.g., `/meta/forms`, `/meta/admin`)

---

## Type Safety Gap

**Current State:**
- No compile-time enforcement of HTTP methods
- Clients must manually specify method string
- No runtime validation in routes
- Easy to introduce method mismatches

**Solution Required:**
- Type-safe API contract registry
- Client wrapper with method validation
- Runtime middleware checks
- ESLint rules to prevent raw fetch

See `lib/types/api-v1-contracts.ts` (to be created in Phase 4)

---

## Verification Checklist

- [x] All 43 routes audited
- [x] HTTP methods extracted and documented
- [x] Known mismatches identified
- [x] Impact assessment complete
- [ ] Client calls audited (Phase 3)
- [ ] Type contracts created (Phase 4)
- [ ] Runtime validation added (Phase 4)
- [ ] All mismatches fixed (Phase 2-5)

---

**Next Steps:**
1. Fix 11 client files using wrong methods (Phase 2)
2. Audit all client fetch calls for additional mismatches (Phase 3)
3. Create type-safe contract system (Phase 4)

