/**
 * Feature: Meta Disconnect (v1)
 * Purpose: Disconnect Meta account from campaign
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const body: unknown = await req.json();
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body');
    }
    
    const { campaignId } = body as { campaignId?: string };
    
    if (!campaignId) {
      throw new ValidationError('campaignId is required');
    }

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id);

    // Delete Meta connection from database
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('campaign_meta_connections')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'delete_failed', message: error.message } },
        { status: 500 }
      );
    }

    return successResponse({ message: 'Meta account disconnected' });
  } catch (error) {
    console.error('[POST /api/v1/meta/disconnect] Error:', error);
    return errorResponse(error as Error);
  }
}

