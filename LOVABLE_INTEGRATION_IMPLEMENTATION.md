# AdPilot x Lovable Integration - Implementation Summary

**Status:** ✅ Backend Foundation Complete  
**Date:** November 20, 2025  
**Architecture:** Microservices-based  
**Source of Truth:** AdPilot Backend

---

## Overview

Successfully implemented the backend foundation for AdPilot's Lovable integration using microservices architecture. This integration enables Lovable users to create and manage Meta ads directly from their Lovable editor via a Chrome extension.

**Key Principle:** AdPilot owns ALL data, logic, and IP. Lovable provides only AI token consumption (image/copy generation).

---

## What Was Implemented

### 1. Type System & Contracts ✅

**Location:** `lib/types/lovable/`

**Files Created:**
- `project.ts` - Project linking types
- `bridge-messages.ts` - Extension ↔ iframe communication contract
- `conversions.ts` - Conversion tracking types
- `sync-state.ts` - Synchronization state types
- `index.ts` - Central exports

**Service Contracts:** `lib/services/lovable/contracts/`
- `lovable-sync-contract.ts` - Sync service interface
- `lovable-conversion-contract.ts` - Conversion service interface
- `lovable-project-contract.ts` - Project service interface

**Purpose:** Type-safe contracts for all microservices communication.

---

### 2. Database Schema ✅

**Location:** `supabase/migrations/20251120000000_lovable_integration.sql`

**Tables Created:**
1. **lovable_project_links** - Links Lovable projects to AdPilot users
2. **campaign_conversions** - Tracks signups/conversions from Lovable projects
3. **lovable_subscriptions** - $9/month subscription management
4. **lovable_image_imports** - Audit trail of imported images

**Features:**
- Full RLS policies (users can only access their own data)
- Optimized indexes for fast queries
- Helper functions for common operations
- Cascade deletes for data integrity

---

### 3. Service Layer ✅

**Location:** `lib/services/lovable/`

#### LovableSyncService (`lovable-sync-service-impl.ts`)
**Responsibility:** Enforce AdPilot as single source of truth

**Key Methods:**
- `importImageFromLovable()` - Copy image from Lovable → AdPilot Storage
- `linkLovableProject()` - Link project to user account
- `loadCampaignData()` - Load from AdPilot DB (never from Lovable)
- `resolveConflict()` - Always use AdPilot data
- `checkLovableImageStatus()` - Optional: check if images still exist

**Critical:** ALL images copied to AdPilot Storage. Original Lovable URLs stored as reference only.

#### LovableConversionService (`lovable-conversion-service-impl.ts`)
**Responsibility:** Track conversions from Lovable webhooks

**Key Methods:**
- `recordConversion()` - Record signup/purchase from webhook
- `getCampaignConversions()` - Query conversions with filters
- `getConversionRate()` - Calculate conversion rate
- `getConversionSummary()` - Analytics summary
- `generateEdgeFunctionTemplate()` - Generate code for user

#### LovableProjectService (`lovable-project-service-impl.ts`)
**Responsibility:** Manage project links and metadata

**Key Methods:**
- `createProjectLink()` - Link new project
- `getProjectLink()` - Get project by ID
- `getUserProjectLinks()` - List all user's projects
- `updateProjectMetadata()` - Update metadata
- `deactivateProjectLink()` - Soft delete
- `validateProjectOwnership()` - Check ownership
- `getProjectStats()` - Project analytics

---

### 4. API Endpoints ✅

**Location:** `app/api/v1/lovable/`

#### Projects API
- **POST** `/api/v1/lovable/projects/link` - Link Lovable project
- **GET** `/api/v1/lovable/projects/[projectId]/campaigns` - Get campaigns

#### Images API
- **POST** `/api/v1/lovable/images/import` - Import image from Lovable

#### Webhooks API
- **POST** `/api/v1/webhooks/lovable/[projectId]/signup` - Record signup
- **GET** `/api/v1/webhooks/lovable/[projectId]/signup` - Health check

#### Subscription API
- **GET** `/api/v1/lovable/subscription/status` - Get subscription status
- **POST** `/api/v1/lovable/subscription/checkout` - Create Stripe session (placeholder)

**Features:**
- Authentication on all endpoints
- Ownership validation
- Thin controllers (delegate to services)
- Consistent error format
- Rate limiting ready

---

### 5. Chrome Extension Foundation ✅

**Location:** Separate repository - [adpilot-lovable-extension](https://github.com/yourusername/adpilot-lovable-extension)

**Files Created:**
- `manifest.json` - Extension config (MV3)
- `background/service-worker.js` - Background tasks
- `content/inject.js` - Inject "Ads" tab into Lovable
- `content/styles.css` - Match Lovable UI
- `ui/panel.html` - Iframe container
- `types/` - Copied type definitions from main repo
- `README.md` - Extension documentation

**Features:**
- Detects Lovable editor pages
- Injects "Ads" tab next to "Speed"
- Opens iframe with AdPilot UI
- Extracts project context (ID, Supabase URL)
- postMessage bridge for communication

**Note:** Extension moved to separate repository for independent deployment and Chrome Web Store distribution.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│  Chrome Extension (adpilot-lovable-extension/)      │
│  - Inject.js: Detects Lovable, injects tab         │
│  - Bridge: postMessage communication                │
└─────────────────────────────────────────────────────┘
                      ↓ postMessage
┌─────────────────────────────────────────────────────┐
│  AdPilot UI Service (lovable.adpilot.com)           │
│  - Next.js app with Lovable design system           │
│  - Journey-based workflows                          │
│  - Calls AdPilot API                                │
└─────────────────────────────────────────────────────┘
                      ↓ REST API
┌─────────────────────────────────────────────────────┐
│  API Routes (app/api/v1/lovable/*)                  │
│  - Thin controllers                                 │
│  - Delegate to service layer                        │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Service Layer (lib/services/lovable/)              │
│  - LovableSyncService: Source of truth              │
│  - LovableConversionService: Webhook handling       │
│  - LovableProjectService: Project management        │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  AdPilot Database (Supabase)                        │
│  - lovable_project_links                            │
│  - campaign_conversions                             │
│  - lovable_subscriptions                            │
│  - lovable_image_imports                            │
└─────────────────────────────────────────────────────┘
```

---

## Data Flow: Image Import

**User generates image in Lovable → AdPilot owns it**

1. **User generates image with Lovable AI**
   - Image saved to user's Lovable Supabase Storage
   - Extension detects new image in bucket

2. **Extension notifies iframe**
   - postMessage: `ADPILOT_NEW_IMAGES`
   - Payload: image URL, bucket, metadata

3. **Iframe calls AdPilot API**
   - POST `/api/v1/lovable/images/import`
   - Body: `{ sourceUrl, campaignId, adId, metadata }`

4. **API delegates to LovableSyncService**
   - Service downloads image from Lovable URL
   - Uploads to AdPilot Supabase Storage (`ad-creatives` bucket)
   - Creates `ad_creatives` record with AdPilot URL
   - Creates `lovable_image_imports` audit record
   - Returns AdPilot URL (source of truth)

5. **Result:**
   - ✅ Image owned by AdPilot (copied to AdPilot Storage)
   - ✅ ad_creatives points to AdPilot URL
   - ✅ Original Lovable URL stored as reference only
   - ✅ If user deletes from Lovable, AdPilot unaffected

**Critical:** We NEVER reference Lovable URLs. We copy images to our storage.

---

## Data Flow: Conversion Tracking

**User signs up in their Lovable project → AdPilot tracks it**

1. **User sets up tracking**
   - UI generates Edge Function template
   - User copies code, creates Edge Function in Lovable
   - Code calls AdPilot webhook on signup

2. **Signup occurs in Lovable project**
   - User fills signup form
   - Form handler calls Edge Function
   - Edge Function receives: `{ email, name, phone }`

3. **Edge Function calls AdPilot webhook**
   - POST `/api/v1/webhooks/lovable/[projectId]/signup`
   - Body: `{ event: 'signup', email, name, phone }`

4. **Webhook delegates to LovableConversionService**
   - Finds active campaign for project
   - Records conversion in `campaign_conversions`
   - Updates campaign metrics
   - Returns success

5. **Result:**
   - ✅ Conversion tracked in AdPilot database
   - ✅ Campaign metrics updated
   - ✅ Conversion rate calculated
   - ✅ Shows in analytics dashboard

---

## Source of Truth Rules

### ✅ AdPilot ALWAYS Wins

1. **Campaign Data:** Always loaded from AdPilot database
2. **Images:** Copied to AdPilot Storage (not referenced from Lovable)
3. **Conversions:** Stored in AdPilot database
4. **Subscriptions:** Managed by AdPilot Stripe
5. **User Accounts:** AdPilot authentication

### ❌ NEVER Read from Lovable

- Never query Lovable Supabase for campaign data
- Never trust Lovable URLs as permanent (copy images)
- Never sync bidirectionally (one-way: Lovable → AdPilot)

### Conflict Resolution

If conflict detected: **AdPilot data always used**

```typescript
resolveConflict<T>(adpilotData: T, lovableData: T): T {
  console.warn('Conflict detected - using AdPilot data');
  return adpilotData; // ALWAYS
}
```

---

## What's Next (Not Yet Implemented)

### 1. Extension Services (Pending)
**Location:** `adpilot-lovable-extension/services/`

**Need to implement:**
- `injection-service.js` - Clean DOM injection logic
- `detection-service.js` - Lovable page detection
- `monitoring-service.js` - Watch Supabase Storage for images
- `bridge-service.js` - postMessage communication

**Status:** Basic injection in `inject.js`, needs refactor into services

### 2. UI Service (Pending)
**Location:** `adpilot-lovable-ui/` (separate Next.js app)

**Need to build:**
- Extract Lovable design system (CSS variables)
- Build Lovable-styled components (sidebar, cards, tables)
- Implement 7 journey pages:
  1. Overview - Dashboard
  2. Goal - Goal selection + Edge Function template
  3. Create - Ad builder with image import
  4. Campaigns - Campaign list
  5. Ads - Ad management
  6. Results - Analytics
  7. Settings - Account & subscription

**Deployment:** Vercel (lovable.adpilot.com)

### 3. Image Monitoring
**Status:** Not implemented

**Needed:**
- Poll Lovable Supabase Storage every 5 seconds
- Detect new images in `lead-photos`, `assets`, `generated-images` buckets
- Send `ADPILOT_NEW_IMAGES` message to iframe
- Handle errors gracefully

### 4. Stripe Integration
**Status:** Placeholder in `/api/v1/lovable/subscription/checkout`

**Needed:**
- Integrate Stripe SDK
- Create $9/month price in Stripe
- Handle Stripe webhooks
- Update `lovable_subscriptions` table
- Enforce subscription checks in API

---

## Testing Checklist

### Database ✅
```bash
# Run migration
supabase db reset
# Or
supabase migration up

# Verify tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'lovable%';
```

### API Endpoints 🧪
```bash
# Test project linking
curl -X POST https://yourapp.com/api/v1/lovable/projects/link \
  -H "Cookie: sb-auth-token=..." \
  -H "Content-Type: application/json" \
  -d '{"lovableProjectId":"test-123"}'

# Test image import
curl -X POST https://yourapp.com/api/v1/lovable/images/import \
  -H "Cookie: sb-auth-token=..." \
  -H "Content-Type: application/json" \
  -d '{"sourceUrl":"https://...", "campaignId":"...", "adId":"..."}'

# Test webhook
curl -X POST https://yourapp.com/api/v1/webhooks/lovable/test-project/signup \
  -H "Content-Type: application/json" \
  -d '{"event":"signup","email":"test@example.com"}'
```

### Chrome Extension 🧪
```bash
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select adpilot-lovable-extension/ directory
5. Navigate to lovable.dev/projects/{projectId}
6. "Ads" tab should appear
7. Click tab, iframe should load
```

---

## Security Considerations

### ✅ Implemented
1. RLS policies on all Lovable tables
2. User ownership validation on API routes
3. Auth required on all endpoints
4. Service role client for webhooks (no user auth needed)
5. postMessage origin validation in extension

### 🔒 Additional Needed
1. Webhook signature verification (HMAC)
2. Rate limiting on webhook endpoint
3. Content Security Policy for iframe
4. Extension manifest permissions review
5. Stripe webhook signature verification

---

## Deployment Guide

### 1. Database Migration
```bash
# Apply migration to production
supabase db push

# Verify
supabase db remote inspect
```

### 2. API Deployment
```bash
# Deploy to Vercel (already part of main app)
git push origin main
# Vercel auto-deploys
```

### 3. Extension Submission
```bash
# Zip extension
cd adpilot-lovable-extension
zip -r adpilot-lovable-extension.zip . -x "*.git*" "*.DS_Store"

# Submit to Chrome Web Store
# https://chrome.google.com/webstore/developer/dashboard
```

### 4. UI Service (When Ready)
```bash
cd adpilot-lovable-ui
vercel --prod
# Point lovable.adpilot.com to deployment
```

---

## Environment Variables

### Required
```env
# Supabase (already exist)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe (for subscriptions)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_LOVABLE_PRICE_ID=price_... # $9/month price

# App URLs
NEXT_PUBLIC_APP_URL=https://yourapp.com
NEXT_PUBLIC_LOVABLE_UI_URL=https://lovable.adpilot.com
```

---

## References

**Implementation Files:**
- Types: `lib/types/lovable/`
- Services: `lib/services/lovable/`
- API: `app/api/v1/lovable/`
- Database: `supabase/migrations/20251120000000_lovable_integration.sql`
- Extension: [Separate Repository](https://github.com/yourusername/adpilot-lovable-extension)

**Architecture Docs:**
- [API & Architecture Reference](docs/API_AND_ARCHITECTURE_REFERENCE.md)
- [Microservices Rules](.cursor/rules.cursorrules)

**External Docs:**
- [Chrome Extension MV3](https://developer.chrome.com/docs/extensions/mv3/)
- [Supabase](https://supabase.com/docs)
- [Next.js 15](https://nextjs.org/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)

---

## Summary

✅ **Completed:**
- Type-safe contracts for all services
- Database schema with RLS and indexes
- 3 service implementations (Sync, Conversion, Project)
- 6 API endpoints (projects, images, webhooks, subscription)
- Chrome extension foundation (manifest, injection, bridge)
- Comprehensive documentation

🚧 **In Progress:**
- Extension service refactoring (monitoring, bridge)
- UI service implementation

📋 **Remaining:**
- Lovable design system extraction
- 7 journey page implementations
- Image monitoring service
- Stripe integration
- Chrome Web Store submission
- End-to-end testing

**Status:** Backend foundation 100% complete. Ready for UI development and extension refinement.

