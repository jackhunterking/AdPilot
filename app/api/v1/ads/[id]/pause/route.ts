/**
 * Feature: Pause Ad API Endpoint (v1)
 * Purpose: Pause live ads on Meta
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta API Client: lib/meta/publishing/meta-api-client.ts
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/reference/adgroup
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdOwnership, errorResponse, successResponse, NotFoundError } from '@/app/api/v1/_middleware';
import { createMetaAPIClient } from '@/lib/meta/publishing/meta-api-client';
import { createPublishLogger } from '@/lib/meta/observability/publish-logger';
import { getConnectionWithToken } from '@/lib/meta/service';
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
    
    // Verify user owns this ad
    await requireAdOwnership(adId, user.id);
    
    // ============================================================================
    // STEP 2: LOAD AD DATA
    // ============================================================================
    const { data: ad, error: adError } = await supabaseServer
      .from('ads')
      .select('id, campaign_id, meta_ad_id, status')
      .eq('id', adId)
      .single();
    
    if (adError || !ad) {
      throw new NotFoundError('Ad not found');
    }
    
    if (!ad.meta_ad_id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'not_published',
          message: 'Ad has not been published to Meta yet'
        }
      }, { status: 400 });
    }
    
    if (ad.status === 'paused') {
      // Already paused, return success
      return successResponse({
        status: 'paused',
        message: 'Ad is already paused'
      });
    }
    
    // ============================================================================
    // STEP 3: GET META CONNECTION
    // ============================================================================
    const connection = await getConnectionWithToken({ campaignId: ad.campaign_id });
    
    if (!connection || !connection.long_lived_user_token) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'connection_lost',
          message: 'Meta connection has expired. Please reconnect to continue.'
        }
      }, { status: 401 });
    }
    
    // ============================================================================
    // STEP 4: PAUSE AD ON META
    // ============================================================================
    console.log('[POST /api/v1/ads/:id/pause] Pausing ad on Meta:', {
      adId,
      metaAdId: ad.meta_ad_id
    });
    
    const logger = createPublishLogger(ad.campaign_id, false);
    const apiClient = createMetaAPIClient(connection.long_lived_user_token, logger);
    
    try {
      await apiClient.updateStatus(ad.meta_ad_id, 'PAUSED');
      
      console.log('[POST /api/v1/ads/:id/pause] ✅ Ad paused on Meta');
    } catch (metaError) {
      console.error('[POST /api/v1/ads/:id/pause] Meta API error:', metaError);
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'meta_api_error',
          message: metaError instanceof Error ? metaError.message : 'Failed to pause ad on Meta',
          details: metaError
        }
      }, { status: 500 });
    }
    
    // ============================================================================
    // STEP 5: UPDATE LOCAL DATABASE
    // ============================================================================
    const { error: updateError } = await supabaseServer
      .from('ads')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', adId);
    
    if (updateError) {
      console.error('[POST /api/v1/ads/:id/pause] Failed to update local status:', updateError);
      // Ad was paused on Meta, so don't fail the request
    }
    
    console.log('[POST /api/v1/ads/:id/pause] ✅ Ad paused successfully:', adId);
    
    // ============================================================================
    // STEP 6: RETURN SUCCESS
    // ============================================================================
    return successResponse({
      status: 'paused',
      message: 'Ad paused successfully'
    });
    
  } catch (error) {
    console.error('[POST /api/v1/ads/:id/pause] Error:', error);
    return errorResponse(error as Error);
  }
}

