/**
 * Feature: Single Location Removal API
 * Purpose: Delete specific location by database ID
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

// DELETE /locations/[locationId] - Remove specific location
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string; locationId: string }> }
) {
  try {
    const { id: campaignId, adId, locationId } = await context.params;

    // Authenticate
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single();

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete specific location by database ID
    const { error: deleteError } = await supabaseServer
      .from('ad_target_locations')
      .delete()
      .eq('id', locationId)
      .eq('ad_id', adId);  // Extra safety - ensure belongs to this ad

    if (deleteError) {
      console.error('[DELETE location] Delete error:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to remove location',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('[DELETE location] ✅ Removed location:', locationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE location] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

