/**
 * Feature: Ads API (v1)
 * Purpose: List ads for campaign and create new ad drafts
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - API v1 Docs: MASTER_API_DOCUMENTATION.mdc
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { supabaseServer } from "@/lib/supabase/server"
import { adDataService } from "@/lib/services/ad-data-service"

// GET /api/v1/ads?campaignId=xxx - List ads for campaign
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Get campaignId from query params
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    
    if (!campaignId) {
      throw new ValidationError('campaignId query parameter is required')
    }
    
    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    // Fetch all ads with normalized data
    const completeAds = await adDataService.getCampaignAds(campaignId)

    // Build enriched response with snapshots from normalized tables
    const adsWithSnapshots = completeAds.map(adData => {
      const snapshot = adDataService.buildSnapshot(adData)
      
      return {
        id: adData.ad.id,
        campaign_id: adData.ad.campaign_id,
        name: adData.ad.name,
        status: adData.ad.status,
        meta_ad_id: adData.ad.meta_ad_id,
        metrics_snapshot: adData.ad.metrics_snapshot,
        created_at: adData.ad.created_at,
        updated_at: adData.ad.updated_at,
        setup_snapshot: snapshot
      }
    })

    return successResponse({ ads: adsWithSnapshots })
  } catch (error) {
    console.error('[GET /api/v1/ads] Error:', error)
    return errorResponse(error as Error)
  }
}

// POST /api/v1/ads - Create new ad
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    const body: unknown = await request.json()
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body')
    }

    const {
      campaignId,
      name,
      status = "draft",
      meta_ad_id = null,
    } = body as {
      campaignId?: string
      name?: string
      status?: string
      meta_ad_id?: string | null
    }

    if (!campaignId) {
      throw new ValidationError('campaignId is required')
    }
    
    if (!name) {
      throw new ValidationError('Ad name is required')
    }
    
    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    // Create new ad
    const { data: ad, error } = await supabaseServer
      .from("ads")
      .insert({
        campaign_id: campaignId,
        name,
        status: status as 'draft' | 'active' | 'paused',
        meta_ad_id,
        metrics_snapshot: null,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/v1/ads] Error:', error)
      throw new Error('Failed to create ad')
    }

    console.log('[POST /api/v1/ads] ✅ Created ad:', ad.id)

    return successResponse({ ad }, undefined, 201)
  } catch (error) {
    console.error('[POST /api/v1/ads] Error:', error)
    return errorResponse(error as Error)
  }
}
