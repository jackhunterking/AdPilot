/**
 * Feature: v1 API Middleware
 * Purpose: Shared auth, errors, types, rate limiting
 * Microservices: Shared kernel (minimal shared logic)
 * References:
 *  - API v1 Architecture: MASTER_API_DOCUMENTATION.mdc
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseServer } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

// ============================================
// Error Classes
// ============================================

export class ApiError extends Error {
  code: string;
  statusCode: number;
  
  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'unauthorized', 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 'forbidden', 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 'not_found', 404);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 'validation_error', 400);
    if (details) {
      (this as unknown as { details: unknown }).details = details;
    }
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, 'conflict', 409);
  }
}

// ============================================
// Response Helpers
// ============================================

export function successResponse<T>(data: T, meta?: unknown, status: number = 200): NextResponse {
  const response: { success: true; data: T; meta?: unknown } = {
    success: true,
    data
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return NextResponse.json(response, { status });
}

export function errorResponse(error: ApiError | Error): NextResponse {
  if (error instanceof ApiError) {
    const errorObj: { code: string; message: string; details?: unknown } = {
      code: error.code,
      message: error.message
    };
    
    const details = (error as unknown as { details?: unknown }).details;
    if (details) {
      errorObj.details = details;
    }
    
    return NextResponse.json({
      success: false,
      error: errorObj
    }, { status: error.statusCode });
  }
  
  // Unknown error
  return NextResponse.json({
    success: false,
    error: {
      code: 'internal_error',
      message: error.message || 'Internal server error'
    }
  }, { status: 500 });
}

// ============================================
// HTTP Method Validation
// ============================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Validate that a request uses an allowed HTTP method
 * Returns NextResponse with 405 error if method not allowed
 * Returns null if method is allowed
 * 
 * @example
 * ```typescript
 * export async function GET(req: NextRequest, context: Context) {
 *   const methodError = validateMethod(req, ['GET', 'PUT'])
 *   if (methodError) return methodError
 *   // ... continue with request handling
 * }
 * ```
 */
export function validateMethod(
  request: NextRequest,
  allowed: readonly HttpMethod[]
): NextResponse | null {
  const method = request.method as HttpMethod
  
  if (!allowed.includes(method)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'method_not_allowed',
          message: `Method ${method} not allowed. Allowed methods: ${allowed.join(', ')}`,
        },
      },
      {
        status: 405,
        headers: {
          Allow: allowed.join(', '),
        },
      }
    )
  }
  
  return null
}

// ============================================
// Auth Helpers
// ============================================

export async function requireAuth(req: NextRequest): Promise<User> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new UnauthorizedError();
  }
  
  return user;
}

export async function requireCampaignOwnership(campaignId: string, userId: string): Promise<void> {
  const { data: campaign } = await supabaseServer
    .from('campaigns')
    .select('user_id')
    .eq('id', campaignId)
    .single();
  
  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }
  
  if (campaign.user_id !== userId) {
    throw new ForbiddenError('You do not have access to this campaign');
  }
}

export async function requireAdOwnership(adId: string, userId: string): Promise<void> {
  const { data: ad } = await supabaseServer
    .from('ads')
    .select('*, campaigns!inner(user_id)')
    .eq('id', adId)
    .single();
  
  if (!ad) {
    throw new NotFoundError('Ad not found');
  }
  
  if ((ad.campaigns as unknown as { user_id: string }).user_id !== userId) {
    throw new ForbiddenError('You do not have access to this ad');
  }
}

// ============================================
// Validation Helpers
// ============================================

export function parseIntParam(param: string | null, defaultValue: number): number {
  if (!param) return defaultValue;
  const parsed = parseInt(param, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================
// Cache Headers
// ============================================

export function addCacheHeaders(response: NextResponse, cacheType: 'private' | 'public' | 'none'): NextResponse {
  switch (cacheType) {
    case 'private':
      response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=300');
      break;
    case 'public':
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      break;
    case 'none':
      response.headers.set('Cache-Control', 'no-store, must-revalidate');
      break;
  }
  
  return response;
}

// ============================================
// Rate Limiting (In-Memory)
// ============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(userId: string, endpoint: string, limit: number = 100): Promise<void> {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  
  if (current.count >= limit) {
    throw new ApiError('Rate limit exceeded', 'rate_limit_exceeded', 429);
  }
  
  current.count++;
}

// ============================================
// Logging
// ============================================

export function logRequest(req: NextRequest, userId?: string): void {
  console.log(`[API v1] ${req.method} ${req.nextUrl.pathname}`, {
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString()
  });
}

// ============================================
// Type Definitions & Type Guards
// ============================================

// Campaign Types
export interface CreateCampaignRequest {
  name?: string;
  tempPromptId?: string;
  prompt?: string;
  goalType?: 'leads' | 'calls' | 'website-visits';
}

export interface UpdateCampaignRequest {
  name?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  currentStep?: number;
  metadata?: Record<string, unknown>;
}

// Ad Types
export interface CreateAdRequest {
  campaignId: string;
  name: string;
  status?: 'draft' | 'active' | 'paused';
  meta_ad_id?: string | null;
}

export interface UpdateAdRequest {
  name?: string;
  status?: 'draft' | 'active' | 'paused' | 'pending_review';
  metrics_snapshot?: unknown;
  meta_ad_id?: string;
  destination_type?: string;
  selected_creative_id?: string;
  selected_copy_id?: string;
}

// Location Types
export interface AddLocationRequest {
  locations: Array<{
    name: string;
    type: string;
    coordinates: [number, number];
    radius?: number;
    key?: string;
    bbox?: [number, number, number, number];
    geometry?: object;
  }>;
}

// Meta Types
export interface MarkPaymentConnectedRequest {
  campaignId: string;
}

// Conversation Types
export interface CreateConversationRequest {
  campaignId?: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateConversationRequest {
  title?: string;
  metadata?: Record<string, unknown>;
}

// Type Guards
export function isCreateCampaignRequest(body: unknown): body is CreateCampaignRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  
  // All fields are optional, but if provided must be correct type
  if ('name' in b && typeof b.name !== 'string') return false;
  if ('tempPromptId' in b && typeof b.tempPromptId !== 'string') return false;
  if ('prompt' in b && typeof b.prompt !== 'string') return false;
  if ('goalType' in b && !['leads', 'calls', 'website-visits'].includes(b.goalType as string)) return false;
  
  return true;
}

export function isUpdateCampaignRequest(body: unknown): body is UpdateCampaignRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  
  if ('name' in b && typeof b.name !== 'string') return false;
  if ('status' in b && !['draft', 'active', 'paused', 'completed'].includes(b.status as string)) return false;
  if ('currentStep' in b && typeof b.currentStep !== 'number') return false;
  if ('metadata' in b && (typeof b.metadata !== 'object' || b.metadata === null)) return false;
  
  return true;
}

export function isCreateAdRequest(body: unknown): body is CreateAdRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  
  // Required fields
  if (!('campaignId' in b) || typeof b.campaignId !== 'string') return false;
  if (!('name' in b) || typeof b.name !== 'string') return false;
  
  // Optional fields
  if ('status' in b && !['draft', 'active', 'paused'].includes(b.status as string)) return false;
  if ('meta_ad_id' in b && b.meta_ad_id !== null && typeof b.meta_ad_id !== 'string') return false;
  
  return true;
}

export function isUpdateAdRequest(body: unknown): body is UpdateAdRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  
  // All optional, but if provided must be correct type
  if ('name' in b && typeof b.name !== 'string') return false;
  if ('status' in b && !['draft', 'active', 'paused', 'pending_review'].includes(b.status as string)) return false;
  if ('meta_ad_id' in b && typeof b.meta_ad_id !== 'string') return false;
  if ('destination_type' in b && typeof b.destination_type !== 'string') return false;
  if ('selected_creative_id' in b && typeof b.selected_creative_id !== 'string') return false;
  if ('selected_copy_id' in b && typeof b.selected_copy_id !== 'string') return false;
  
  return true;
}

export function isAddLocationRequest(body: unknown): body is AddLocationRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  
  if (!('locations' in b) || !Array.isArray(b.locations)) return false;
  if (b.locations.length === 0) return false;
  
  // Validate each location object
  return b.locations.every((loc) => {
    if (typeof loc !== 'object' || loc === null) return false;
    return (
      'name' in loc && typeof loc.name === 'string' &&
      'type' in loc && typeof loc.type === 'string' &&
      'coordinates' in loc && Array.isArray(loc.coordinates) &&
      loc.coordinates.length === 2 &&
      typeof loc.coordinates[0] === 'number' &&
      typeof loc.coordinates[1] === 'number'
    );
  });
}

export function isMarkPaymentConnectedRequest(body: unknown): body is MarkPaymentConnectedRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  
  return 'campaignId' in b && typeof b.campaignId === 'string';
}

export function isCreateConversationRequest(body: unknown): body is CreateConversationRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  
  // All fields optional
  if ('campaignId' in b && typeof b.campaignId !== 'string') return false;
  if ('title' in b && typeof b.title !== 'string') return false;
  if ('metadata' in b && (typeof b.metadata !== 'object' || b.metadata === null)) return false;
  
  return true;
}

export function isUpdateConversationRequest(body: unknown): body is UpdateConversationRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  
  if ('title' in b && typeof b.title !== 'string') return false;
  if ('metadata' in b && (typeof b.metadata !== 'object' || b.metadata === null)) return false;
  
  return true;
}

