# API v1 Type Safety Guide

**Created:** November 20, 2025  
**Purpose:** Guide for using type-safe API contracts to prevent method/path mismatches

---

## Overview

The AdPilot v1 API now includes comprehensive type safety to prevent HTTP method mismatches at both compile-time and runtime. This system was created after fixing a critical bug where 11 client files were using `POST` instead of `PUT` for the `/api/v1/ads/[id]/save` endpoint, causing all save operations to fail with 405 errors.

---

## Quick Start

### Import the Type-Safe Wrapper

```typescript
import { apiV1, apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/types/api-v1-contracts'
```

### Before (Unsafe)

```typescript
// ❌ No type safety - easy to use wrong method
const response = await fetch(`/api/v1/ads/${adId}/save`, {
  method: 'POST', // WRONG! Should be PUT
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

### After (Type-Safe)

```typescript
// ✅ TypeScript enforces correct method at compile time
const result = await apiPut('/api/v1/ads/[id]/save', data)

// ✅ Or use the generic wrapper
const result = await apiV1('/api/v1/ads/[id]/save', 'PUT', { body: data })

// ❌ TypeScript ERROR: 'POST' is not assignable to type 'PUT' | 'GET'
const result = await apiV1('/api/v1/ads/[id]/save', 'POST', { body: data })
```

---

## API Contract Registry

All routes and their allowed methods are defined in `lib/types/api-v1-contracts.ts`:

```typescript
export const API_V1_ROUTES = {
  '/api/v1/ads/[id]/save': ['GET', 'PUT'],  // ✅ Type-safe
  '/api/v1/ads/[id]/publish': ['POST'],
  '/api/v1/campaigns': ['GET', 'POST'],
  // ... all 43 routes
} as const
```

This provides:
- **Compile-time validation**: TypeScript catches incorrect methods before code runs
- **Runtime validation**: Additional safety check in case of dynamic scenarios
- **Single source of truth**: One place to update when API changes

---

## Usage Patterns

### Simple GET Request

```typescript
import { apiGet } from '@/lib/types/api-v1-contracts'

// Type-safe GET with query params
const result = await apiGet('/api/v1/campaigns', {
  params: { limit: 10 }
})

if (result.success) {
  const campaigns = result.data
}
```

### POST with Body

```typescript
import { apiPost } from '@/lib/types/api-v1-contracts'

const result = await apiPost('/api/v1/campaigns', {
  name: 'My Campaign',
  goalType: 'leads'
})
```

### PUT for Updates

```typescript
import { apiPut } from '@/lib/types/api-v1-contracts'

// Save ad snapshot (uses PUT, not POST!)
const result = await apiPut('/api/v1/ads/[id]/save', {
  creative: { ... },
  copy: { ... },
  destination: { ... }
})
```

### Dynamic Routes

```typescript
import { buildRoute, apiGet } from '@/lib/types/api-v1-contracts'

// Build route with parameters
const route = buildRoute('/api/v1/ads/[id]/save', { id: adId })
// Returns: '/api/v1/ads/abc-123/save'

// Then use it
const result = await apiGet(route as typeof API_V1_ROUTES['/api/v1/ads/[id]/save'])
```

---

## Response Handling

All API responses follow a standard shape:

```typescript
// Success response
interface ApiSuccessResponse<T> {
  success: true
  data: T
}

// Error response
interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}
```

### Type Guards

```typescript
import { isApiSuccessResponse, isApiErrorResponse } from '@/lib/types/api-v1-contracts'

const result = await apiGet('/api/v1/campaigns')

if (isApiSuccessResponse(result)) {
  // TypeScript knows result.data exists
  console.log(result.data)
} else if (isApiErrorResponse(result)) {
  // TypeScript knows result.error exists
  console.error(result.error.message)
}
```

---

## Runtime Validation

### Middleware Method Validation

Routes can use the `validateMethod` middleware helper:

```typescript
import { validateMethod } from '@/app/api/v1/_middleware'

export async function GET(req: NextRequest, context: Context) {
  // Validate HTTP method - returns 405 if wrong method
  const methodError = validateMethod(req, ['GET', 'PUT'])
  if (methodError) return methodError
  
  // Continue with request handling...
}
```

This provides an extra layer of protection in case:
- Dynamic routing scenarios bypass TypeScript
- External tools call the API directly
- Misconfigured clients attempt requests

---

## Migration Guide

### Step 1: Replace Raw Fetch Calls

Find:
```typescript
const response = await fetch(`/api/v1/ads/${adId}/save`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

Replace with:
```typescript
const result = await apiPut('/api/v1/ads/[id]/save', data)
```

### Step 2: Handle Responses

Before:
```typescript
if (response.ok) {
  const data = await response.json()
  // ...
}
```

After:
```typescript
if (result.success) {
  const { data } = result
  // TypeScript knows the shape
}
```

### Step 3: Update Error Handling

Before:
```typescript
const errorText = await response.text()
throw new Error(errorText)
```

After:
```typescript
if (!result.success) {
  throw new Error(result.error.message)
}
```

---

## Common Mistakes to Avoid

### ❌ Wrong: Using POST for Save Endpoint

```typescript
// This was the original bug!
await fetch(`/api/v1/ads/${adId}/save`, {
  method: 'POST'  // 405 Error - endpoint only accepts GET/PUT
})
```

### ✅ Correct: Using PUT

```typescript
await apiPut('/api/v1/ads/[id]/save', data)
```

### ❌ Wrong: Guessing HTTP Methods

```typescript
// Which method does this use? Who knows!
await fetch('/api/v1/ads/[id]/publish', { method: 'PATCH' })
```

### ✅ Correct: Type-Safe Method

```typescript
// TypeScript tells you it's POST
await apiPost('/api/v1/ads/[id]/publish', {})
```

---

## ESLint Integration

To prevent raw `fetch` calls to v1 API, add this ESLint rule:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.name='fetch'][arguments.0.value=/\\/api\\/v1/]",
        "message": "Use apiV1() wrapper from lib/types/api-v1-contracts.ts instead of raw fetch for v1 API calls"
      }
    ]
  }
}
```

---

## Complete Route Registry

See `API_METHOD_INVENTORY.md` for the complete list of all 43 routes and their allowed methods.

Key routes:
- `GET/POST /api/v1/campaigns` - Campaign management
- `GET/PUT /api/v1/ads/[id]/save` - **Ad snapshots (uses PUT!)**
- `POST /api/v1/ads/[id]/publish` - Publish to Meta
- `GET /api/v1/meta/status` - Meta connection status
- `POST /api/v1/chat` - AI streaming chat

---

## Benefits

1. **Compile-Time Safety**: TypeScript catches method mismatches before deployment
2. **Runtime Protection**: Middleware validates methods as backup
3. **Auto-Complete**: IDE suggests only valid methods for each route
4. **Documentation**: Type system serves as living documentation
5. **Refactoring**: Rename routes once, TypeScript finds all usages

---

## Testing

Test that type safety works:

```typescript
// This should cause TypeScript error
const result = await apiV1('/api/v1/ads/[id]/save', 'POST', {})
//                                                    ^^^^^ 
// Error: Type '"POST"' is not assignable to type '"GET" | "PUT"'
```

---

## Future Improvements

- Auto-generate route types from OpenAPI schema
- Add request/response type definitions per endpoint
- Create code generator for service clients
- Add zod schemas for runtime request validation

---

**For more information:**
- API Method Inventory: `API_METHOD_INVENTORY.md`
- Mismatch Report: `API_MISMATCH_REPORT.md`
- Contracts Implementation: `lib/types/api-v1-contracts.ts`
- Middleware: `app/api/v1/_middleware.ts`

