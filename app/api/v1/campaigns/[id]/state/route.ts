/**
 * Feature: Campaign State API (v1)
 * Purpose: Get/update wizard state
 * References:
 *  - API v1: MASTER_API_DOCUMENTATION.mdc
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/app/api/v1/_middleware';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id: campaignId } = await context.params;
    
    const { data: state } = await supabaseServer
      .from('campaign_states')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();
    
    return successResponse({ state });
  } catch (error) {
    return errorResponse(error as Error);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id: campaignId } = await context.params;
    const body = await req.json();
    
    const { data: updated } = await supabaseServer
      .from('campaign_states')
      .upsert({
        campaign_id: campaignId,
        ...body
      }, { onConflict: 'campaign_id' })
      .select()
      .single();
    
    return successResponse({ state: updated });
  } catch (error) {
    return errorResponse(error as Error);
  }
}

