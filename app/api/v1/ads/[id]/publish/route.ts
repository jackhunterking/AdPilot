/**
 * Feature: Publish Ad API Endpoint (v1)
 * Purpose: Publish ads to Meta Marketing API
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Publisher: lib/meta/publisher-single-ad.ts
 *  - Client Service: lib/services/client/publish-service-client.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware';
import { publishSingleAd } from '@/lib/meta/publisher-single-ad';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ============================================================================
    // STEP 1: AUTHENTICATE & AUTHORIZE
    // ============================================================================
    const user = await requireAuth(req);
    const { id: adId } = await context.params;
    
    // Apply rate limiting (10 req/min for publishing)
    const { checkRateLimit } = await import('@/app/api/v1/_middleware');
    await checkRateLimit(user.id, 'POST /api/v1/ads/publish', 10);
    
    // Verify user owns this ad (via campaign ownership)
    await requireAdOwnership(adId, user.id);
    
    // ============================================================================
    // STEP 2: VALIDATE REQUEST
    // ============================================================================
    const body: unknown = await req.json();
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body');
    }
    
    const { campaignId } = body as { campaignId?: string };
    
    if (!campaignId) {
      throw new ValidationError('campaignId is required');
    }
    
    // ============================================================================
    // STEP 3: PUBLISH AD TO META
    // ============================================================================
    console.log('[POST /api/v1/ads/:id/publish] Publishing ad:', {
      adId,
      campaignId,
      userId: user.id
    });
    
    const result = await publishSingleAd({
      campaignId,
      adId,
      userId: user.id
    });
    
    if (!result.success) {
      // Return error from publishing service
      return NextResponse.json({
        success: false,
        error: {
          code: result.error?.code || 'publish_failed',
          message: result.error?.userMessage || result.error?.message || 'Failed to publish ad',
          details: result.error
        }
      }, { status: 500 });
    }
    
    // ============================================================================
    // STEP 4: UPDATE AD STATUS IN DATABASE
    // ============================================================================
    const { error: updateError } = await supabaseServer
      .from('ads')
      .update({
        meta_ad_id: result.metaAdId,
        status: result.status || 'pending_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', adId);
    
    if (updateError) {
      console.error('[POST /api/v1/ads/:id/publish] Failed to update ad status:', updateError);
      // Don't fail the request - ad was published successfully to Meta
    }
    
    // ============================================================================
    // STEP 5: INSERT PUBLISHING METADATA
    // ============================================================================
    const { error: metadataError } = await supabaseServer
      .from('ad_publishing_metadata')
      .insert({
        ad_id: adId,
        meta_ad_id: result.metaAdId,
        meta_campaign_id: null, // Will be set by publisher if available
        meta_adset_id: null, // Will be set by publisher if available
        publish_status: 'success',
        published_at: new Date().toISOString()
      });
    
    if (metadataError) {
      console.error('[POST /api/v1/ads/:id/publish] Failed to insert metadata:', metadataError);
      // Don't fail the request - ad was published successfully
    }
    
    console.log('[POST /api/v1/ads/:id/publish] ✅ Ad published successfully:', {
      adId,
      metaAdId: result.metaAdId,
      status: result.status
    });
    
    // ============================================================================
    // STEP 6: RETURN SUCCESS RESPONSE
    // ============================================================================
    return successResponse({
      meta_ad_id: result.metaAdId,
      status: result.status || 'pending_review',
      message: 'Ad published successfully and is pending Meta review'
    });
    
  } catch (error) {
    console.error('[POST /api/v1/ads/:id/publish] Error:', error);
    return errorResponse(error as Error);
  }
}

