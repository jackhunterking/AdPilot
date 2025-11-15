/**
 * Feature: Individual Ad Publishing API v1
 * Purpose: Publish a single ad to Meta with proper status tracking and error handling
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/reference/ad/
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { publishSingleAd } from '@/lib/meta/publisher-single-ad'
import { validatePrePublish } from '@/lib/meta/publishing/pre-publish-validator'
import type { AdStatus } from '@/lib/types/workspace'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params
    
    console.log('[v1/ads/:id/publish] ========================================')
    console.log('[v1/ads/:id/publish] 📥 Received publish request')
    console.log('[v1/ads/:id/publish] Ad ID:', adId)
    console.log('[v1/ads/:id/publish] ========================================')
    
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[v1/ads/:id/publish] ❌ Authentication failed:', authError?.message)
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    console.log('[v1/ads/:id/publish] ✅ User authenticated:', user.id)

    // Get ad with campaign to verify ownership
    const { data: ad, error: adError } = await supabaseServer
      .from('ads')
      .select('id, campaign_id, status, meta_ad_id, name, campaigns!inner(id, user_id, name)')
      .eq('id', adId)
      .single()

    if (adError || !ad) {
      console.error('[v1/ads/:id/publish] ❌ Ad not found:', {
        adId,
        error: adError?.message
      })
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Ad not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    if (ad.campaigns.user_id !== user.id) {
      console.error('[v1/ads/:id/publish] ❌ Ownership mismatch:', {
        campaignUserId: ad.campaigns.user_id,
        requestUserId: user.id
      })
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Access denied' } },
        { status: 403 }
      )
    }

    console.log('[v1/ads/:id/publish] ✅ Ownership verified. Campaign:', ad.campaigns.name)
    console.log('[v1/ads/:id/publish] ✅ Ad found:', {
      name: ad.name,
      status: ad.status,
      alreadyPublished: !!ad.meta_ad_id
    })

    // Check if already published
    if (ad.meta_ad_id) {
      console.warn('[v1/ads/:id/publish] ⚠️  Ad already published:', {
        adId,
        metaAdId: ad.meta_ad_id,
        currentStatus: ad.status
      })
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'already_published',
            message: 'Ad already published',
            details: {
              meta_ad_id: ad.meta_ad_id,
              current_status: ad.status
            }
          }
        },
        { status: 409 }
      )
    }

    // Update status to pending_review immediately
    console.log('[v1/ads/:id/publish] 📝 Updating ad status to pending_review...')
    const { error: updateError } = await supabaseServer
      .from('ads')
      .update({ 
        status: 'pending_review' as AdStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', adId)

    if (updateError) {
      console.error('[v1/ads/:id/publish] ❌ Failed to update ad status:', updateError)
    } else {
      console.log('[v1/ads/:id/publish] ✅ Ad status updated to pending_review')
    }

    // PRE-FLIGHT VALIDATION: Check all requirements before publishing
    console.log('[v1/ads/:id/publish] 🔍 Running pre-flight validation...')
    const validation = await validatePrePublish({
      campaignId: ad.campaign_id,
      adId,
      userId: user.id
    })

    if (!validation.valid) {
      console.error('[v1/ads/:id/publish] ❌ Pre-flight validation failed')
      
      // Revert status back to draft
      await supabaseServer
        .from('ads')
        .update({ 
          status: 'draft' as AdStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', adId)

      // Return first validation error
      const firstError = validation.errors[0]
      return NextResponse.json({
        success: false,
        error: {
          code: 'validation_failed',
          message: firstError || 'Validation failed',
          details: { validationErrors: validation.errors }
        }
      }, { status: 400 })
    }

    console.log('[v1/ads/:id/publish] ✅ Pre-flight validation passed')

    // Publish to Meta (async operation)
    console.log('[v1/ads/:id/publish] 🚀 Calling publishSingleAd...')
    try {
      const result = await publishSingleAd({
        campaignId: ad.campaign_id,
        adId,
        userId: user.id
      })
      
      console.log('[v1/ads/:id/publish] 📊 Publish result:', {
        success: result.success,
        metaAdId: result.metaAdId,
        status: result.status,
        hasError: !!result.error
      })

      if (!result.success) {
        console.error('[v1/ads/:id/publish] ❌ Publishing failed:', result.error)
        
        // Update status to failed
        await supabaseServer
          .from('ads')
          .update({ 
            status: 'failed' as AdStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', adId)

        console.log('[v1/ads/:id/publish] Ad status updated to failed')
        
        return NextResponse.json({
          success: false,
          error: {
            code: 'publish_failed',
            message: result.error || 'Publishing failed',
            details: result
          }
        }, { status: 500 })
      }

      // Success - update with Meta ad ID
      console.log('[v1/ads/:id/publish] ✅ Publishing succeeded, updating database...')
      const { error: successUpdateError } = await supabaseServer
        .from('ads')
        .update({
          meta_ad_id: result.metaAdId,
          status: result.status as AdStatus,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', adId)

      if (successUpdateError) {
        console.error('[v1/ads/:id/publish] ⚠️  Failed to update ad with Meta ID:', successUpdateError)
      } else {
        console.log('[v1/ads/:id/publish] ✅ Ad updated with Meta ID:', result.metaAdId)
      }

      console.log('[v1/ads/:id/publish] ========================================')
      console.log('[v1/ads/:id/publish] ✅ Publish complete!')
      console.log('[v1/ads/:id/publish] ========================================')

      return NextResponse.json({
        success: true,
        data: {
          meta_ad_id: result.metaAdId,
          status: result.status,
          message: 'Ad published successfully'
        }
      })

    } catch (publishError) {
      // Handle publishing errors
      const error = publishError instanceof Error ? publishError : new Error('Unknown error')
      
      console.error('[v1/ads/:id/publish] ❌ Exception during publishing:', {
        message: error.message,
        stack: error.stack
      })
      
      await supabaseServer
        .from('ads')
        .update({ 
          status: 'failed' as AdStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', adId)

      return NextResponse.json({
        success: false,
        error: {
          code: 'api_error',
          message: error.message,
          details: { userMessage: 'Failed to publish ad. Please try again.' }
        }
      }, { status: 500 })
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    console.error('[v1/ads/:id/publish] ========================================')
    console.error('[v1/ads/:id/publish] ❌ Unexpected error')
    console.error('[v1/ads/:id/publish] Error:', err.message)
    console.error('[v1/ads/:id/publish] Stack:', err.stack)
    console.error('[v1/ads/:id/publish] ========================================')
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error', details: err.message } },
      { status: 500 }
    )
  }
}

// GET endpoint to check publish status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params
    
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Get ad with ownership check
    const { data: ad } = await supabaseServer
      .from('ads')
      .select(`
        id,
        status,
        meta_ad_id,
        published_at,
        approved_at,
        rejected_at,
        campaigns!inner(user_id)
      `)
      .eq('id', adId)
      .single()

    if (!ad || ad.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Ad not found' } },
        { status: 404 }
      )
    }

    const { campaigns: _campaigns, ...adData } = ad

    return NextResponse.json({
      success: true,
      data: adData
    })

  } catch (error) {
    console.error('[v1/ads/:id/publish] GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

