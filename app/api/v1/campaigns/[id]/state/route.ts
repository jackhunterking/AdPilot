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
    
    // Fetch campaign state if table exists, otherwise return empty
    const { data: state } = await supabaseServer
      .from('campaigns')
      .select('metadata')
      .eq('id', campaignId)
      .single();
    
    return successResponse({ state: state?.metadata || {} });
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
    
    // Update campaign metadata with state
    const { data: updated } = await supabaseServer
      .from('campaigns')
      .update({ metadata: body })
      .eq('id', campaignId)
      .select('metadata')
      .single();
    
    return successResponse({ state: updated?.metadata || {} });
  } catch (error) {
    return errorResponse(error as Error);
  }
}

