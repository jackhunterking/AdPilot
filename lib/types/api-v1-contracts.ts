/**
 * Feature: API v1 Type-Safe Contracts
 * Purpose: Single source of truth for v1 API routes and methods with compile-time + runtime validation
 * References:
 *  - API v1 Audit: API_METHOD_INVENTORY.md
 *  - Middleware: app/api/v1/_middleware.ts
 *  - TypeScript: https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
 */

// ============================================================================
// Route Method Registry (Single Source of Truth)
// ============================================================================

export const API_V1_ROUTES = {
  // Campaigns API
  '/api/v1/campaigns': ['GET', 'POST'],
  '/api/v1/campaigns/[id]': ['GET', 'PATCH', 'DELETE'],
  '/api/v1/campaigns/[id]/state': ['GET', 'PATCH'],
  
  // Ads API
  '/api/v1/ads': ['GET', 'POST'],
  '/api/v1/ads/[id]': ['GET', 'PATCH', 'DELETE'],
  '/api/v1/ads/[id]/save': ['GET', 'PUT'],
  '/api/v1/ads/[id]/publish': ['POST'],
  '/api/v1/ads/[id]/pause': ['POST'],
  '/api/v1/ads/[id]/resume': ['POST'],
  '/api/v1/ads/[id]/locations': ['POST', 'DELETE'],
  '/api/v1/ads/[id]/locations/exclude': ['POST'],
  '/api/v1/ads/[id]/locations/[locationId]': ['DELETE'],
  
  // Conversations & Chat API
  '/api/v1/conversations': ['GET', 'POST'],
  '/api/v1/conversations/[id]': ['GET', 'PATCH', 'DELETE'],
  '/api/v1/conversations/[id]/messages': ['GET'],
  '/api/v1/chat': ['POST'],
  
  // Meta Integration API
  '/api/v1/meta/status': ['GET'],
  '/api/v1/meta/assets': ['GET'],
  '/api/v1/meta/businesses': ['GET'],
  '/api/v1/meta/pages': ['GET'],
  '/api/v1/meta/ad-accounts': ['GET'],
  '/api/v1/meta/business-connections': ['POST'],
  '/api/v1/meta/page-picture': ['GET'],
  '/api/v1/meta/payment': ['POST'],
  '/api/v1/meta/payment/status': ['GET'],
  '/api/v1/meta/admin': ['GET', 'POST'],
  '/api/v1/meta/metrics': ['GET'],
  '/api/v1/meta/breakdown': ['GET'],
  '/api/v1/meta/forms': ['GET', 'POST'],
  '/api/v1/meta/instant-forms': ['GET'],
  '/api/v1/meta/instant-forms/[id]': ['GET'],
  '/api/v1/meta/leads/webhook': ['GET', 'POST'],
  '/api/v1/meta/auth/callback': ['GET'],
  '/api/v1/meta/disconnect': ['POST'],
  '/api/v1/meta/refresh-token': ['POST'],
  '/api/v1/meta/destination/phone': ['POST'],
  
  // Leads API
  '/api/v1/leads': ['GET'],
  '/api/v1/leads/export': ['GET'],
  
  // Creative & Images API
  '/api/v1/images/variations': ['POST'],
  '/api/v1/images/variations/single': ['POST'],
  '/api/v1/creative/plan': ['POST'],
  
  // Budget API
  '/api/v1/budget/distribute': ['POST'],
  
  // Temp Prompt API
  '/api/v1/temp-prompt': ['GET', 'POST'],
} as const

// ============================================================================
// Type Definitions
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ApiRoute = keyof typeof API_V1_ROUTES

export type AllowedMethods<T extends ApiRoute> = typeof API_V1_ROUTES[T][number]

// Route parameter extraction
export type RouteParams<T extends string> = 
  T extends `${infer _Start}[${infer Param}]${infer Rest}`
    ? { [K in Param]: string } & RouteParams<Rest>
    : Record<string, never>

// Standard API responses
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ============================================================================
// Type Guards
// ============================================================================

export function isApiSuccessResponse<T>(response: unknown): response is ApiSuccessResponse<T> {
  if (typeof response !== 'object' || response === null) return false
  const r = response as Record<string, unknown>
  return r.success === true && 'data' in r
}

export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  if (typeof response !== 'object' || response === null) return false
  const r = response as Record<string, unknown>
  return r.success === false && 'error' in r
}

// ============================================================================
// Runtime Validation
// ============================================================================

/**
 * Validate that a method is allowed for a given route
 * @throws {TypeError} if method not allowed
 */
export function validateRouteMethod(route: string, method: HttpMethod): void {
  // Check if route exists in registry
  if (!(route in API_V1_ROUTES)) {
    // Try to match dynamic routes (e.g., /api/v1/ads/123 -> /api/v1/ads/[id])
    const normalizedRoute = normalizeDynamicRoute(route)
    if (!(normalizedRoute in API_V1_ROUTES)) {
      throw new TypeError(
        `Route "${route}" not found in API v1 registry. Did you mean to create a new endpoint?`
      )
    }
    
    const allowedMethods = API_V1_ROUTES[normalizedRoute as ApiRoute]
    if (!allowedMethods.includes(method as never)) {
      throw new TypeError(
        `Method ${method} not allowed for ${route}. Allowed methods: ${allowedMethods.join(', ')}`
      )
    }
    return
  }
  
  const allowedMethods = API_V1_ROUTES[route as ApiRoute]
  if (!allowedMethods.includes(method as never)) {
    throw new TypeError(
      `Method ${method} not allowed for ${route}. Allowed methods: ${allowedMethods.join(', ')}`
    )
  }
}

/**
 * Normalize a route with actual IDs to its template form
 * Example: /api/v1/ads/abc-123 -> /api/v1/ads/[id]
 */
function normalizeDynamicRoute(route: string): string {
  // Remove query parameters
  const [pathOnly] = route.split('?')
  
  // Split into segments
  const segments = pathOnly.split('/').filter(Boolean)
  
  // Replace UUID-like segments with [id], numeric segments with [id]
  const normalized = segments.map(segment => {
    // Check if segment looks like a UUID or ID
    if (/^[a-f0-9-]{8,}$/i.test(segment) || /^\d+$/.test(segment)) {
      return '[id]'
    }
    // Check if it might be a locationId (in locations/[locationId] pattern)
    if (segments[segments.length - 2] === 'locations' && segment !== 'exclude') {
      return '[locationId]'
    }
    return segment
  })
  
  return '/' + normalized.join('/')
}

// ============================================================================
// Type-Safe Fetch Wrapper
// ============================================================================

export interface ApiV1Options extends Omit<RequestInit, 'method' | 'body'> {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

/**
 * Type-safe wrapper for v1 API calls
 * Enforces correct HTTP methods at compile time and validates at runtime
 * 
 * @example
 * ```typescript
 * // ✅ Compile-time type safety
 * const result = await apiV1('/api/v1/ads/[id]/save', 'PUT', {
 *   body: { creative: {...} }
 * })
 * 
 * // ❌ TypeScript error: 'POST' not allowed for this route
 * const result = await apiV1('/api/v1/ads/[id]/save', 'POST', {...})
 * ```
 */
export async function apiV1<TResponse = unknown>(
  route: ApiRoute,
  method: AllowedMethods<typeof route>,
  options?: ApiV1Options
): Promise<ApiResponse<TResponse>> {
  try {
    // Runtime validation (backup for any dynamic scenarios)
    validateRouteMethod(route, method as HttpMethod)
    
    // Build URL with query params if provided
    let url = route
    if (options?.params) {
      const queryParams = new URLSearchParams()
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
      const queryString = queryParams.toString()
      if (queryString) {
        url = `${route}?${queryString}`
      }
    }
    
    // Prepare fetch options
    const fetchOptions: RequestInit = {
      ...options,
      method: method as string,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: options?.credentials ?? 'include',
    }
    
    // Add body if provided and method allows it
    if (options?.body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body)
    }
    
    // Make request
    const response = await fetch(url, fetchOptions)
    const data: unknown = await response.json()
    
    // Validate response shape
    if (!isApiSuccessResponse(data) && !isApiErrorResponse(data)) {
      // Non-standard response, wrap it
      return {
        success: response.ok,
        data: data as TResponse,
      } as ApiResponse<TResponse>
    }
    
    return data as ApiResponse<TResponse>
  } catch (error) {
    // Network or parsing error
    return {
      success: false,
      error: {
        code: 'client_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      },
    }
  }
}

/**
 * Build dynamic route with parameters
 * 
 * @example
 * ```typescript
 * const route = buildRoute('/api/v1/ads/[id]/save', { id: 'abc-123' })
 * // Returns: '/api/v1/ads/abc-123/save'
 * ```
 */
export function buildRoute<T extends ApiRoute>(
  template: T,
  params: RouteParams<T>
): string {
  let route = template as string
  
  Object.entries(params).forEach(([key, value]) => {
    route = route.replace(`[${key}]`, String(value))
  })
  
  return route
}

// ============================================================================
// Convenience Wrappers for Common Patterns
// ============================================================================

/**
 * GET request helper
 */
export async function apiGet<TResponse = unknown>(
  route: Extract<ApiRoute, keyof { [K in ApiRoute as 'GET' extends AllowedMethods<K> ? K : never]: true }>,
  options?: Omit<ApiV1Options, 'body'>
): Promise<ApiResponse<TResponse>> {
  return apiV1<TResponse>(route, 'GET', options)
}

/**
 * POST request helper
 */
export async function apiPost<TResponse = unknown>(
  route: Extract<ApiRoute, keyof { [K in ApiRoute as 'POST' extends AllowedMethods<K> ? K : never]: true }>,
  body: unknown,
  options?: Omit<ApiV1Options, 'body'>
): Promise<ApiResponse<TResponse>> {
  return apiV1<TResponse>(route, 'POST', { ...options, body })
}

/**
 * PUT request helper
 */
export async function apiPut<TResponse = unknown>(
  route: Extract<ApiRoute, keyof { [K in ApiRoute as 'PUT' extends AllowedMethods<K> ? K : never]: true }>,
  body: unknown,
  options?: Omit<ApiV1Options, 'body'>
): Promise<ApiResponse<TResponse>> {
  return apiV1<TResponse>(route, 'PUT', { ...options, body })
}

/**
 * PATCH request helper
 */
export async function apiPatch<TResponse = unknown>(
  route: Extract<ApiRoute, keyof { [K in ApiRoute as 'PATCH' extends AllowedMethods<K> ? K : never]: true }>,
  body: unknown,
  options?: Omit<ApiV1Options, 'body'>
): Promise<ApiResponse<TResponse>> {
  return apiV1<TResponse>(route, 'PATCH', { ...options, body })
}

/**
 * DELETE request helper
 */
export async function apiDelete<TResponse = unknown>(
  route: Extract<ApiRoute, keyof { [K in ApiRoute as 'DELETE' extends AllowedMethods<K> ? K : never]: true }>,
  options?: ApiV1Options
): Promise<ApiResponse<TResponse>> {
  return apiV1<TResponse>(route, 'DELETE', options)
}

// ============================================================================
// Export Method Lists for Documentation
// ============================================================================

export const ROUTE_METHODS = Object.entries(API_V1_ROUTES).reduce((acc, [route, methods]) => {
  acc[route as ApiRoute] = [...methods]
  return acc
}, {} as Record<ApiRoute, readonly HttpMethod[]>)

export const TOTAL_ROUTES = Object.keys(API_V1_ROUTES).length
export const TOTAL_METHODS = Object.values(API_V1_ROUTES).flat().length

