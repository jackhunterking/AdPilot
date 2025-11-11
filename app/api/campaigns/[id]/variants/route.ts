/**
 * Feature: Campaign Variants API
 * Purpose: Manage multiple ad variants within a campaign
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/database/joins
 */

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AdVariant } from '@/lib/types/workspace'

// GET /api/campaigns/[id]/variants - List all ad variants for a campaign
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { id: campaignId } = await context.params

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get all ads (variants) for this campaign
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (adsError) {
      console.error('[API] Error fetching variants:', adsError)
      return NextResponse.json(
        { error: 'Failed to fetch variants' },
        { status: 500 }
      )
    }

    // Transform to AdVariant format
    const variants: AdVariant[] = (ads || []).map((ad) => ({
      id: ad.id,
      campaign_id: ad.campaign_id,
      name: ad.name,
      status: ad.status as 'draft' | 'active' | 'paused' | 'archived',
      variant_type: 'original', // TODO: Add variant_type column to ads table
      creative_data: (ad.creative_data as AdVariant['creative_data']) || {
        headline: '',
        body: '',
        cta: '',
      },
      metrics_snapshot: ad.metrics_snapshot as unknown as AdVariant['metrics_snapshot'],
      meta_ad_id: ad.meta_ad_id || undefined,
      created_at: ad.created_at,
      updated_at: ad.updated_at,
    }))

    return NextResponse.json({ variants })
  } catch (error) {
    console.error('[API] Variants GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/campaigns/[id]/variants - Create new ad variant
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { id: campaignId } = await context.params
    const body = await request.json()

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Extract variant data from request
    const { name, creative_data, variant_type = 'manual', status = 'draft' } = body as {
      name: string
      creative_data: AdVariant['creative_data']
      variant_type?: string
      status?: string
    }

    if (!name || !creative_data) {
      return NextResponse.json(
        { error: 'Missing required fields: name, creative_data' },
        { status: 400 }
      )
    }

    // Create new ad variant
    const { data: newAd, error: createError } = await supabase
      .from('ads')
      .insert({
        campaign_id: campaignId,
        name,
        status,
        creative_data,
        copy_data: {
          headline: creative_data.headline,
          body: creative_data.body,
          cta: creative_data.cta,
        },
      })
      .select()
      .single()

    if (createError) {
      console.error('[API] Error creating variant:', createError)
      return NextResponse.json(
        { error: 'Failed to create variant' },
        { status: 500 }
      )
    }

    // Transform to AdVariant format
    const variant: AdVariant = {
      id: newAd.id,
      campaign_id: newAd.campaign_id,
      name: newAd.name,
      status: newAd.status as 'draft' | 'active' | 'paused' | 'archived',
      variant_type: 'manual',
      creative_data,
      created_at: newAd.created_at,
      updated_at: newAd.updated_at,
    }

    return NextResponse.json({ variant }, { status: 201 })
  } catch (error) {
    console.error('[API] Variants POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

