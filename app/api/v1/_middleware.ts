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

