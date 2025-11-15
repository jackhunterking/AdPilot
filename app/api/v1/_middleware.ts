/**
 * API v1 Middleware & Helpers
 * Purpose: Shared auth, validation, error handling, and utilities for all v1 endpoints
 * References:
 *  - Supabase Auth: https://supabase.com/docs/reference/javascript/auth-getuser
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 *  - TypeScript Type Guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, 'unauthorized', message)
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(403, 'forbidden', message)
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, 'not_found', `${resource} not found`)
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(400, 'validation_error', message, details)
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, 'conflict', message)
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter: number) {
    super(429, 'rate_limit_exceeded', `Too many requests. Try again in ${retryAfter} seconds`)
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

export function successResponse<T>(data: T, meta?: unknown, status = 200) {
  const response: { success: true; data: T; meta?: unknown } = {
    success: true,
    data
  }
  if (meta) {
    response.meta = meta
  }
  return NextResponse.json(response, { status })
}

export function errorResponse(error: ApiError | Error, status?: number) {
  if (error instanceof ApiError) {
    const errorObj: { code: string; message: string; details?: unknown } = {
      code: error.code,
      message: error.message
    }
    if (error.details) {
      errorObj.details = error.details
    }
    return NextResponse.json(
      {
        success: false,
        error: errorObj
      },
      { status: error.statusCode }
    )
  }

  // Generic error
  console.error('[API] Unhandled error:', error)
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'internal_error',
        message: 'An unexpected error occurred'
      }
    },
    { status: status || 500 }
  )
}

// ============================================================================
// Auth Helpers
// ============================================================================

export async function requireAuth(req: NextRequest): Promise<User> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new UnauthorizedError()
  }
  
  return user
}

export async function getAuthUser(req: NextRequest): Promise<User | null> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

// ============================================================================
// Ownership Verification
// ============================================================================

export async function requireCampaignOwnership(
  campaignId: string,
  userId: string
): Promise<void> {
  const { data: campaign } = await supabaseServer
    .from('campaigns')
    .select('user_id')
    .eq('id', campaignId)
    .single()
  
  if (!campaign) {
    throw new NotFoundError('Campaign')
  }
  
  if (campaign.user_id !== userId) {
    throw new ForbiddenError('You do not own this campaign')
  }
}

export async function requireAdOwnership(
  adId: string,
  userId: string
): Promise<{ campaignId: string }> {
  const { data: ad } = await supabaseServer
    .from('ads')
    .select('campaign_id, campaigns!inner(user_id)')
    .eq('id', adId)
    .single()
  
  if (!ad) {
    throw new NotFoundError('Ad')
  }
  
  if (ad.campaigns.user_id !== userId) {
    throw new ForbiddenError('You do not own this ad')
  }
  
  return { campaignId: ad.campaign_id }
}

export async function verifyCampaignOwnership(
  campaignId: string,
  userId: string
): Promise<boolean> {
  try {
    await requireCampaignOwnership(campaignId, userId)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Rate Limiting (Simple in-memory, production should use Redis/Upstash)
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxRequests = 100,
  windowSeconds = 60
): Promise<void> {
  const key = `${userId}:${endpoint}`
  const now = Date.now()
  const limit = rateLimitMap.get(key)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000
    })
    return
  }

  if (limit.count >= maxRequests) {
    const retryAfter = Math.ceil((limit.resetAt - now) / 1000)
    throw new RateLimitError(retryAfter)
  }

  limit.count++
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // Every minute

// ============================================================================
// Request Logging
// ============================================================================

export function logRequest(req: NextRequest, userId?: string, additionalData?: Record<string, unknown>) {
  const { pathname, searchParams } = new URL(req.url)
  console.log(`[API] ${req.method} ${pathname}`, {
    userId: userId || 'anonymous',
    params: Object.fromEntries(searchParams.entries()),
    timestamp: new Date().toISOString(),
    ...additionalData
  })
}

// ============================================================================
// Cache Headers Helper
// ============================================================================

export function addCacheHeaders(
  response: NextResponse,
  cacheType: 'static' | 'user' | 'realtime' | 'none'
): NextResponse {
  const headers: Record<string, string> = {}

  switch (cacheType) {
    case 'static':
      headers['Cache-Control'] = 'public, s-maxage=300, stale-while-revalidate=600'
      break
    case 'user':
      headers['Cache-Control'] = 'private, s-maxage=60, stale-while-revalidate=300'
      break
    case 'realtime':
      headers['Cache-Control'] = 'no-store, must-revalidate'
      break
    case 'none':
      headers['Cache-Control'] = 'no-cache'
      break
  }

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

// ============================================================================
// Query Parameter Parsing
// ============================================================================

export function parseIntParam(param: string | null, defaultValue: number, min = 1, max = 1000): number {
  if (!param) return defaultValue
  const parsed = parseInt(param, 10)
  if (!Number.isFinite(parsed)) return defaultValue
  if (parsed < min) return min
  if (parsed > max) return max
  return parsed
}

export function parseBoolParam(param: string | null, defaultValue = false): boolean {
  if (!param) return defaultValue
  return param === 'true' || param === '1'
}

export function parseStringParam(param: string | null, defaultValue = '', allowedValues?: string[]): string {
  if (!param) return defaultValue
  if (allowedValues && !allowedValues.includes(param)) return defaultValue
  return param
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateRequiredParams(
  searchParams: URLSearchParams,
  requiredParams: string[]
): void {
  const missing = requiredParams.filter(param => !searchParams.get(param))
  if (missing.length > 0) {
    throw new ValidationError(`Missing required parameters: ${missing.join(', ')}`)
  }
}

export function validateUUID(value: string, fieldName = 'ID'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`Invalid ${fieldName} format`)
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function hasRequiredFields<T extends Record<string, unknown>>(
  obj: unknown,
  requiredFields: (keyof T)[]
): obj is T {
  if (typeof obj !== 'object' || obj === null) return false
  return requiredFields.every(field => field in obj)
}

// ============================================================================
// Database Query Helpers
// ============================================================================

export async function getCampaignOrThrow(campaignId: string, userId: string) {
  const { data: campaign } = await supabaseServer
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign) {
    throw new NotFoundError('Campaign')
  }

  if (campaign.user_id !== userId) {
    throw new ForbiddenError('You do not own this campaign')
  }

  return campaign
}

export async function getAdOrThrow(adId: string, userId: string) {
  const { data: ad } = await supabaseServer
    .from('ads')
    .select('*, campaigns!inner(user_id)')
    .eq('id', adId)
    .single()

  if (!ad) {
    throw new NotFoundError('Ad')
  }

  if (ad.campaigns.user_id !== userId) {
    throw new ForbiddenError('You do not own this ad')
  }

  return ad
}

// ============================================================================
// Error Boundary Wrapper
// ============================================================================

export function withErrorHandling<T>(
  handler: (req: NextRequest, ...args: T[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T[]): Promise<NextResponse> => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      return errorResponse(error as Error)
    }
  }
}

// ============================================================================
// CORS Headers
// ============================================================================

export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}
