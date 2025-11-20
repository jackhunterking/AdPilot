/**
 * Feature: Meta Token Refresh (v1)
 * Purpose: Refresh Meta OAuth tokens
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta OAuth: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware';
import { metaServiceServer } from '@/lib/services/server/meta-service-server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const body: unknown = await req.json();
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body');
    }
    
    const { oldToken } = body as { oldToken?: string };
    
    if (!oldToken) {
      throw new ValidationError('oldToken is required');
    }

    // Refresh token via Meta API
    const result = await metaServiceServer.refreshToken.execute(oldToken);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Update token in database
    const supabase = await createServerClient();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + result.data!.expiresIn);

    await supabase
      .from('meta_tokens')
      .update({
        token: result.data!.token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return successResponse({
      token: result.data!.token,
      expiresIn: result.data!.expiresIn,
    });
  } catch (error) {
    console.error('[POST /api/v1/meta/refresh-token] Error:', error);
    return errorResponse(error as Error);
  }
}

