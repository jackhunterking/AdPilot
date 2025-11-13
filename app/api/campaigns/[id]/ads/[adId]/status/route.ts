/**
 * Feature: Ad Status Sync API
 * Purpose: Check and sync ad status from Meta Marketing API
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/reference/ad/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { syncAdStatus } from '@/lib/meta/status-sync/polling-service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await params
    
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify campaign ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Sync status from Meta
    const result = await syncAdStatus(campaignId, adId)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ad_id: adId,
      status: result.status,
      meta_ad_id: result.metaAdId,
      updated_at: result.updatedAt
    })

  } catch (error) {
    console.error('[Status Sync API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to force status refresh
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  return GET(req, { params })
}

