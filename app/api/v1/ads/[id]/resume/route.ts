/**
 * Feature: Resume Ad API v1
 * Purpose: Resume a paused ad
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/reference/ad/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Get ad with campaign to verify ownership
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('id, status, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || ad.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Ad not found' } },
        { status: 404 }
      )
    }

    // Resume logic
    const { data: updated, error } = await supabaseServer
      .from('ads')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', adId)
      .select()
      .single()

    if (error) {
      console.error('[v1/ads/:id/resume] Error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'resume_failed', message: 'Failed to resume ad' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ad: updated }
    })
  } catch (error) {
    console.error('[v1/ads/:id/resume] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

