# Client/Server Service Architecture

**Date:** November 18, 2025  
**Status:** ✅ IMPLEMENTED  
**Build Status:** ✅ Passing

---

## Overview

The service layer has been split into **client** and **server** implementations to comply with Next.js 15 server/client boundaries while maintaining the microservices architecture.

### Problem Solved

**Before:**
```
ServiceProvider (client component)
  ↓ imports
campaign-service-impl.ts
  ↓ uses
next/headers (cookies) ❌ SERVER-ONLY API
```

**Error:** `"You're importing a component that needs next/headers. That only works in a Server Component"`

**After:**
```
Client Components
  ↓ use
Client Service Implementations ✅
  ↓ call via fetch
API v1 Routes
  ↓ use
Server Service Implementations ✅
  ↓ use
Supabase (direct access)
```

---

## Directory Structure

```
lib/services/
├── client/                              # NEW - Client implementations
│   ├── campaign-service-client.ts       # Calls /api/v1/campaigns
│   ├── ad-service-client.ts             # Calls /api/v1/ads
│   ├── workspace-service-client.ts      # Pure client logic
│   ├── save-service-client.ts           # Calls /api/v1/ads/[id]/save
│   ├── publish-service-client.ts        # Calls /api/v1/ads/[id]/publish
│   ├── creative-service-client.ts       # Stub - TO BE IMPLEMENTED
│   ├── copy-service-client.ts           # Stub - TO BE IMPLEMENTED
│   ├── targeting-service-client.ts      # Stub - TO BE IMPLEMENTED
│   ├── destination-service-client.ts    # Stub - TO BE IMPLEMENTED
│   ├── budget-service-client.ts         # Stub - TO BE IMPLEMENTED
│   ├── analytics-service-client.ts      # Stub - TO BE IMPLEMENTED
│   ├── meta-service-client.ts           # Stub - TO BE IMPLEMENTED
│   └── index.ts                         # Export all client services
│
├── server/                              # MOVED - Server implementations
│   ├── campaign-service-server.ts       # Direct Supabase access
│   ├── workspace-service-server.ts      # Server-side workspace logic
│   ├── save-service-server.ts           # Direct Supabase save
│   ├── publish-service-server.ts        # Meta API + Supabase
│   └── index.ts                         # Export all server services
│
├── contracts/                           # UNCHANGED - Shared interfaces
│   ├── campaign-service.interface.ts
│   ├── ad-service.interface.ts
│   └── ... (7 more)
│
├── service-provider.tsx                 # UPDATED - Uses client services
└── index.ts                             # UPDATED - Exports client services
```

---

## Implementation Status

### ✅ Fully Implemented (5 Client Services)

| Service | File | API Routes Used | Status |
|---------|------|----------------|--------|
| **Campaign** | `campaign-service-client.ts` | `/api/v1/campaigns/*` | ✅ Complete |
| **Ad** | `ad-service-client.ts` | `/api/v1/ads/*` | ✅ Complete |
| **Workspace** | `workspace-service-client.ts` | None (pure client) | ✅ Complete |
| **Save** | `save-service-client.ts` | `/api/v1/ads/[id]/save` | ✅ Complete |
| **Publish** | `publish-service-client.ts` | `/api/v1/ads/[id]/publish` | ✅ Complete |

### ⏸️ Stub Implementations (7 Services)

| Service | File | Status | Next Steps |
|---------|------|--------|-----------|
| **Creative** | `creative-service-client.ts` | Stub | Implement image generation API calls |
| **Copy** | `copy-service-client.ts` | Stub | Implement copy generation logic |
| **Targeting** | `targeting-service-client.ts` | Stub | Implement location/geocoding APIs |
| **Destination** | `destination-service-client.ts` | Stub | Implement destination setup APIs |
| **Budget** | `budget-service-client.ts` | Stub | Implement budget/schedule APIs |
| **Analytics** | `analytics-service-client.ts` | Stub | Implement metrics/analytics APIs |
| **Meta** | `meta-service-client.ts` | Stub | Implement Meta connection APIs |

**Note:** Stub implementations return `not_implemented` errors. They're included for type safety but need full implementation.

---

## Usage Guide

### For Client Components

**Import from client directory:**
```typescript
import { campaignServiceClient } from '@/lib/services/client/campaign-service-client';

// Or use service hooks
import { useCampaignService } from '@/lib/services/service-provider';

function MyComponent() {
  const campaignService = useCampaignService();
  
  const handleCreate = async () => {
    const result = await campaignService.createCampaign.execute({
      name: 'My Campaign',
      goalType: 'leads',
    });
    
    if (result.success) {
      console.log('Created:', result.data);
    } else {
      console.error('Error:', result.error);
    }
  };
}
```

### For API Routes (Server Components)

**Import from server directory:**
```typescript
import { campaignService } from '@/lib/services/server/campaign-service-server';

export async function POST(request: NextRequest) {
  const input = await request.json();
  
  const result = await campaignService.createCampaign.execute(input);
  
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: { campaign: result.data }
  });
}
```

---

## Client Service Pattern

### Standard Implementation Pattern

```typescript
/**
 * Feature: Example Service Client
 * Purpose: Client-side operations via API routes
 * References:
 *  - API v1: app/api/v1/example/
 *  - Contract: lib/services/contracts/example-service.interface.ts
 */

"use client";

import type { ExampleService, ExampleInput, ExampleOutput } from '../contracts/example-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

class ExampleServiceClient implements ExampleService {
  exampleMethod = {
    async execute(input: ExampleInput): Promise<ServiceResult<ExampleOutput>> {
      try {
        const response = await fetch('/api/v1/example', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include auth cookies
          body: JSON.stringify(input),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: ExampleOutput };
        return {
          success: true,
          data: successResult.data,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Request failed',
          },
        };
      }
    }
  };
}

export const exampleServiceClient = new ExampleServiceClient();
```

### Key Principles

✅ **Always use `credentials: 'include'`** - Ensures auth cookies are sent  
✅ **Type narrow the response** - Use `unknown` then narrow to specific types  
✅ **Handle network errors** - Wrap in try/catch for network failures  
✅ **Match API v1 response format** - `{ success, data, error }`  
✅ **Return ServiceResult<T>** - Consistent error handling  

---

## Server Service Pattern

### Server implementations remain unchanged

```typescript
import { createServerClient } from '@/lib/supabase/server';

class ExampleServiceServer implements ExampleService {
  exampleMethod = {
    async execute(input: ExampleInput): Promise<ServiceResult<ExampleOutput>> {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Direct Supabase access (server-only)
      const { data, error } = await supabase
        .from('example_table')
        .insert(...)
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          error: {
            code: 'database_error',
            message: error.message,
          },
        };
      }
      
      return {
        success: true,
        data,
      };
    }
  };
}
```

---

## Migration Guide

### If You Need to Add a New Service

**Step 1: Create Contract**
```typescript
// lib/services/contracts/my-service.interface.ts
export interface MyService {
  myMethod: ServiceContract<InputType, ServiceResult<OutputType>>;
}
```

**Step 2: Create Client Implementation**
```typescript
// lib/services/client/my-service-client.ts
class MyServiceClient implements MyService {
  myMethod = {
    async execute(input: InputType): Promise<ServiceResult<OutputType>> {
      const response = await fetch('/api/v1/my-endpoint', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(input),
      });
      // ... handle response
    }
  };
}
```

**Step 3: Add to ServiceProvider**
```typescript
// lib/services/service-provider.tsx
import { myServiceClient } from './client/my-service-client';

interface ServiceContextValue {
  myService: MyService; // Add to interface
}

export function ServiceProvider({ children, services = {} }: ServiceProviderProps) {
  const value: ServiceContextValue = {
    // ... existing services
    myService: services.myService || myServiceClient, // Add here
  };
}

// Add hook
export function useMyService(): MyService {
  const { myService } = useServices();
  return myService;
}
```

**Step 4: (Optional) Create Server Implementation**
```typescript
// lib/services/server/my-service-server.ts
// Only needed if you want to use it in API routes
class MyServiceServer implements MyService {
  myMethod = {
    async execute(input: InputType): Promise<ServiceResult<OutputType>> {
      const supabase = await createServerClient();
      // Direct database access
    }
  };
}
```

---

## Testing

### Test Client Services (with fetch mocks)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { campaignServiceClient } from '@/lib/services/client/campaign-service-client';

describe('CampaignServiceClient', () => {
  it('should create campaign via API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { campaign: { id: 'test-id', name: 'Test' } }
      })
    });

    const result = await campaignServiceClient.createCampaign.execute({
      name: 'Test Campaign'
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/campaigns', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Campaign' })
    });
  });
});
```

### Test ServiceProvider

```typescript
import { render } from '@testing-library/react';
import { ServiceProvider, useCampaignService } from '@/lib/services/service-provider';

function TestComponent() {
  const service = useCampaignService();
  return <div>{service ? 'Has Service' : 'No Service'}</div>;
}

it('provides services to children', () => {
  const { getByText } = render(
    <ServiceProvider>
      <TestComponent />
    </ServiceProvider>
  );
  
  expect(getByText('Has Service')).toBeInTheDocument();
});
```

---

## Stub Services TODO List

The following services have stub implementations and need to be fully implemented:

### Creative Service Client
**API Routes:**
- POST `/api/v1/images/variations` - Generate image variations
- POST `/api/v1/images/variations/single` - Edit single image

**Methods to Implement:**
- `generateVariations()` - Generate creative variations from prompt
- `editVariation()` - Edit specific image with prompt
- `regenerateVariation()` - Regenerate single variation
- `selectVariation()` - Select which variation to use
- `deleteVariation()` - Remove variation

### Copy Service Client
**API Routes:**
- POST `/api/v1/creative/plan` - Generate copy variations

**Methods to Implement:**
- `generateCopyVariations()` - Generate copy options
- `editCopy()` - Edit complete copy variation
- `refineHeadline()` - Refine headline only
- `refinePrimaryText()` - Refine primary text only
- `refineDescription()` - Refine description only
- `selectCopyVariation()` - Select copy variation
- `validateCopy()` - Validate against Meta limits

### Targeting Service Client
**API Routes:**
- POST `/api/v1/ads/[id]/locations` - Add locations
- DELETE `/api/v1/ads/[id]/locations/[locationId]` - Remove location
- DELETE `/api/v1/ads/[id]/locations` - Clear all

**Methods to Implement:**
- `addLocations()` - Add geographic targeting
- `removeLocation()` - Remove specific location
- `clearLocations()` - Remove all locations
- `getLocations()` - Get current targeting
- `geocode()` - Convert name to coordinates
- `fetchBoundary()` - Get location geometry
- `lookupMetaLocationKey()` - Get Meta location key

### Destination Service Client
**API Routes:**
- GET `/api/v1/meta/forms` - List Meta forms
- GET `/api/v1/meta/forms/[id]` - Get form details

**Methods to Implement:**
- `setupDestination()` - Configure destination
- `getDestination()` - Get current destination
- `validateWebsiteUrl()` - Validate URL
- `validatePhoneNumber()` - Validate phone
- `listMetaForms()` - List available forms
- `getMetaForm()` - Get form details
- `createMetaForm()` - Create new form

### Budget Service Client
**API Routes:**
- To be determined (may need new endpoints)

**Methods to Implement:**
- `setBudget()` - Set daily budget
- `getBudget()` - Get current budget
- `setSchedule()` - Set start/end time
- `selectAdAccount()` - Select ad account
- `getRecommendations()` - Get budget recommendations
- `validateBudget()` - Validate budget amount
- `estimateReach()` - Calculate estimated reach

### Analytics Service Client
**API Routes:**
- GET `/api/v1/meta/metrics` - Get metrics
- GET `/api/v1/meta/breakdown` - Get demographic breakdown

**Methods to Implement:**
- `getMetrics()` - Fetch campaign metrics
- `getDemographicBreakdown()` - Get age/gender data
- `getPerformanceInsights()` - AI-generated insights
- `compareAds()` - Compare ad performance
- `getCostEfficiency()` - Calculate efficiency score
- `exportMetrics()` - Export to CSV/JSON

### Meta Service Client
**API Routes:**
- GET `/api/v1/meta/status` - Connection status
- GET `/api/v1/meta/assets` - List assets (businesses, pages, ad accounts)
- POST `/api/v1/meta/payment` - Verify payment
- POST `/api/v1/meta/admin` - Verify admin access

**Methods to Implement:**
- `getConnectionStatus()` - Check Meta connection
- `getAssets()` - List businesses/pages/ad accounts
- `selectAssets()` - Select assets for campaign
- `verifyPayment()` - Verify payment method
- `verifyAdmin()` - Verify page admin access
- `initiateOAuth()` - Start OAuth flow
- `handleOAuthCallback()` - Handle OAuth callback
- `refreshToken()` - Refresh access token
- `disconnect()` - Disconnect Meta account

---

## Benefits of This Architecture

### 1. Clean Server/Client Separation ✅
- Client components never import server-only APIs
- No `next/headers` in client code
- Build errors prevented at compile time

### 2. Microservices Alignment ✅
- API routes are the service boundary
- Services are independently deployable
- Clear separation of concerns

### 3. Testability ✅
- Client services can mock `fetch` for testing
- Server services can mock Supabase
- ServiceProvider can inject mocks

### 4. Type Safety ✅
- Same contracts for both client and server
- TypeScript ensures interface compliance
- Compile-time verification

### 5. Maintainability ✅
- Clear file organization
- Obvious which services to use where
- Easy to add new services

---

## Migration Checklist for Stub Services

For each stub service, follow these steps:

- [ ] Review the service contract interface
- [ ] Identify the API v1 routes to call
- [ ] Implement each method to call the appropriate route
- [ ] Add error handling (network errors, API errors)
- [ ] Type narrow responses from `unknown`
- [ ] Test with fetch mocks
- [ ] Update ServiceProvider if needed
- [ ] Document usage examples

---

## Common Patterns

### Pattern 1: GET Request

```typescript
async execute(id: string): Promise<ServiceResult<Data>> {
  try {
    const response = await fetch(`/api/v1/resource/${id}`, {
      credentials: 'include',
    });
    
    const result: unknown = await response.json();
    
    if (!response.ok) {
      const errorResult = result as { success: false; error: { code: string; message: string } };
      return { success: false, error: errorResult.error };
    }
    
    const successResult = result as { success: true; data: { resource: Data } };
    return { success: true, data: successResult.data.resource };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'network_error',
        message: error instanceof Error ? error.message : 'Request failed',
      },
    };
  }
}
```

### Pattern 2: POST Request

```typescript
async execute(input: Input): Promise<ServiceResult<Output>> {
  try {
    const response = await fetch('/api/v1/resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    
    const result: unknown = await response.json();
    
    if (!response.ok) {
      const errorResult = result as { success: false; error: { code: string; message: string } };
      return { success: false, error: errorResult.error };
    }
    
    const successResult = result as { success: true; data: Output };
    return { success: true, data: successResult.data };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'network_error',
        message: error instanceof Error ? error.message : 'Request failed',
      },
    };
  }
}
```

### Pattern 3: Pure Client Logic (No API)

```typescript
class WorkspaceServiceClient {
  // No fetch calls - pure client logic
  shouldShowButton(mode: WorkspaceMode): boolean {
    return mode === 'edit' || mode === 'build';
  }
  
  validateInput(input: string): { valid: boolean; error?: string } {
    if (!input || input.trim().length === 0) {
      return { valid: false, error: 'Input required' };
    }
    return { valid: true };
  }
}
```

---

## Troubleshooting

### Error: "Cannot find module '@/lib/services/workspace-service'"

**Cause:** Old import from before client/server split

**Fix:**
```typescript
// BEFORE:
import { workspaceService } from '@/lib/services/workspace-service';

// AFTER (client component):
import { workspaceServiceClient as workspaceService } from '@/lib/services/client/workspace-service-client';

// AFTER (server component/API route):
import { WorkspaceService } from '@/lib/services/server/workspace-service-server';
const workspaceService = new WorkspaceService();
```

### Error: "You're importing a component that needs next/headers"

**Cause:** Client component importing server service

**Fix:** Use client service instead
```typescript
// BEFORE:
import { campaignService } from '@/lib/services/campaign-service-impl';

// AFTER:
import { campaignServiceClient } from '@/lib/services/client/campaign-service-client';
```

### Error: "Service not implemented"

**Cause:** Calling stub service method

**Fix:** Implement the full service or use existing API patterns
```typescript
// Check if service is stub
const result = await service.method.execute(input);
if (!result.success && result.error?.code === 'not_implemented') {
  // Fall back to direct API call or show not available message
}
```

---

## Files Modified/Created

### Created (15 files)
- `lib/services/client/campaign-service-client.ts` (303 lines)
- `lib/services/client/ad-service-client.ts` (372 lines)
- `lib/services/client/workspace-service-client.ts` (146 lines)
- `lib/services/client/save-service-client.ts` (183 lines)
- `lib/services/client/publish-service-client.ts` (189 lines)
- `lib/services/client/creative-service-client.ts` (99 lines - stub)
- `lib/services/client/copy-service-client.ts` (127 lines - stub)
- `lib/services/client/targeting-service-client.ts` (125 lines - stub)
- `lib/services/client/destination-service-client.ts` (119 lines - stub)
- `lib/services/client/budget-service-client.ts` (121 lines - stub)
- `lib/services/client/analytics-service-client.ts` (114 lines - stub)
- `lib/services/client/meta-service-client.ts` (202 lines - stub)
- `lib/services/client/index.ts` (46 lines)
- `lib/services/server/index.ts` (17 lines)
- `lib/services/CLIENT_SERVER_ARCHITECTURE.md` (this file)

### Moved (4 files)
- `lib/services/campaign-service-impl.ts` → `lib/services/server/campaign-service-server.ts`
- `lib/services/workspace-service.ts` → `lib/services/server/workspace-service-server.ts`
- `lib/services/save-service.ts` → `lib/services/server/save-service-server.ts`
- `lib/services/publish-service.ts` → `lib/services/server/publish-service-server.ts`

### Modified (9 files)
- `lib/services/service-provider.tsx` - Uses client services
- `lib/services/index.ts` - Exports client services only
- `app/layout.tsx` - Re-enabled ServiceProvider
- `components/workspace/workspace-orchestrator.tsx` - Updated imports
- `components/workspace/hooks/use-workspace-state.ts` - Updated imports
- `components/workspace/hooks/use-workspace-navigation.ts` - Updated imports
- `components/workspace/modes/*.tsx` (5 files) - Updated imports

**Total Impact:** 28 files

---

## Next Steps

### Immediate (Complete)
- ✅ Build passes
- ✅ ServiceProvider works
- ✅ Campaign & Ad services functional
- ✅ Workspace services functional

### Short-Term (Week 1-2)
- 🔄 Implement stub services (Creative, Copy, Targeting)
- 🔄 Add tests for all client services
- 🔄 Update contexts to use service hooks

### Medium-Term (Week 2-3)
- 🔄 Implement remaining stub services (Destination, Budget, Analytics, Meta)
- 🔄 Refactor API routes to use server services (optional cleanup)
- 🔄 Performance testing

---

## Summary

✅ **ServiceProvider is now fully functional**  
✅ **No server/client boundary errors**  
✅ **Build passes successfully**  
✅ **5 core services implemented (Campaign, Ad, Workspace, Save, Publish)**  
⏸️ **7 services stubbed** (need full implementation but don't block usage)  

**The architecture is clean, maintainable, and follows microservices principles.**

---

*Client/Server Service Architecture Guide - November 18, 2025*

