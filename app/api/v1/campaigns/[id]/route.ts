/**
 * Feature: Campaign Detail API v1
 * Purpose: Get, update, and delete specific campaigns
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 *  - Next.js Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { generateNameCandidates, pickUniqueFromCandidates } from '@/lib/utils/campaign-naming'
import type { Database } from '@/lib/supabase/database.types'
import type { UpdateCampaignRequest } from '@/lib/types/api'

// ============================================================================
// Type Guards
// ============================================================================

function isUpdateCampaignRequest(body: unknown): body is UpdateCampaignRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    (!('name' in b) || typeof b.name === 'string') &&
    (!('status' in b) || typeof b.status === 'string')
  )
}

// ============================================================================
// GET /api/v1/campaigns/[id] - Get a specific campaign
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params // MUST await (Next.js 15+)
    
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Fetch campaign with state
    const { data: campaign, error } = await supabaseServer
      .from('campaigns')
      .select(`
        *,
        campaign_states (*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !campaign) {
      console.error(`[v1/campaigns/:id] GET error:`, error)
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    // DEBUG: Log what Supabase returned
    console.log(`[v1/campaigns/:id] Campaign loaded:`, {
      id: campaign.id,
      name: campaign.name,
      hasCampaignStates: !!campaign.campaign_states,
      campaignStatesType: Array.isArray(campaign.campaign_states) ? 'array' : typeof campaign.campaign_states,
    })

    return NextResponse.json({
      success: true,
      data: { campaign }
    })
  } catch (error) {
    console.error('[v1/campaigns/:id] GET unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Failed to fetch campaign' } },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH /api/v1/campaigns/[id] - Update campaign
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campaignId = id

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: campaign, error: fetchErr } = await supabaseServer
      .from('campaigns')
      .select('id,user_id,name,metadata')
      .eq('id', campaignId)
      .single()
    if (fetchErr || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body: unknown = await request.json()
    if (!isUpdateCampaignRequest(body)) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'Invalid request body' } },
        { status: 400 }
      )
    }

    const { name, status } = body

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) {
      updates.status = status
    }

    // Handle name update with uniqueness check
    if (name !== undefined) {
      const nextNameRaw = (name || '').trim()
      if (!nextNameRaw) {
        return NextResponse.json(
          { success: false, error: { code: 'validation_error', message: 'Name is required' } },
          { status: 400 }
        )
      }

      // Attempt update, on conflict generate alternative
      let desiredName = nextNameRaw
      const attemptUpdate = async (proposed: string) => {
        return await supabaseServer
          .from('campaigns')
          .update({ name: proposed, updated_at: new Date().toISOString() })
          .eq('id', campaignId)
          .select()
          .single()
      }

      let result = await attemptUpdate(desiredName)
      if (result.error && (result.error as unknown as { code?: string }).code === '23505') {
        // Conflict: generate a new variant but without digits
        const prompt = (campaign.metadata as { initialPrompt?: string } | null)?.initialPrompt || ''
        const candidates = generateNameCandidates(prompt)
        // Build existing set including the colliding desiredName
        const { data: rows } = await supabaseServer
          .from('campaigns')
          .select('name')
          .eq('user_id', user.id)
        const existing = new Set<string>((rows || []).map(r => r.name.toLowerCase()))
        existing.add(desiredName.toLowerCase())
        const alt = pickUniqueFromCandidates(candidates, existing)
        result = await attemptUpdate(alt)
      }

      if (result.error) {
        // If still failing due to uniqueness and no prompt to derive a variant, return conflict
        const statusCode = (result.error as unknown as { code?: string }).code === '23505' ? 409 : 500
        return NextResponse.json(
          { success: false, error: { code: 'update_failed', message: result.error.message } },
          { status: statusCode }
        )
      }

      return NextResponse.json({
        success: true,
        data: { campaign: result.data }
      })
    }

    // If only status update (no name), do simple update
    if (Object.keys(updates).length === 1) { // only updated_at
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'No valid fields to update' } },
        { status: 400 }
      )
    }

    const { data: updatedCampaign, error: updateErr } = await supabaseServer
      .from('campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single()

    if (updateErr) {
      console.error('[v1/campaigns/:id] PATCH error:', updateErr)
      return NextResponse.json(
        { success: false, error: { code: 'update_failed', message: updateErr.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { campaign: updatedCampaign }
    })
  } catch (error) {
    console.error('[v1/campaigns/:id] PATCH unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Failed to update campaign' } },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE /api/v1/campaigns/[id] - Delete campaign and all related data
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // No-cache headers to prevent stale data
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }

  try {
    const { id } = await params
    const campaignId = id

    console.log('[v1/campaigns/:id] DELETE - Starting deletion for campaign:', campaignId)

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[v1/campaigns/:id] DELETE - Auth error:', authError)
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401, headers: noCacheHeaders }
      )
    }

    console.log('[v1/campaigns/:id] DELETE - User authenticated:', user.id)

    // Verify ownership
    const { data: campaign, error: fetchErr } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    
    console.log('[v1/campaigns/:id] DELETE - Campaign lookup result:', { campaign, fetchErr })
    
    // Idempotent behavior: If campaign doesn't exist, deletion succeeded (desired state achieved)
    if (fetchErr || !campaign) {
      console.log('[v1/campaigns/:id] DELETE - Campaign already deleted or never existed:', campaignId)
      return NextResponse.json(
        { success: true, message: 'Campaign deleted' },
        { status: 200, headers: noCacheHeaders }
      )
    }
    
    // Check ownership - only case where we return error
    if (campaign.user_id !== user.id) {
      console.error('[v1/campaigns/:id] DELETE - Ownership mismatch:', { campaignUserId: campaign.user_id, requestUserId: user.id })
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Unauthorized - not campaign owner' } },
        { status: 403, headers: noCacheHeaders }
      )
    }

    console.log('[v1/campaigns/:id] DELETE - Ownership verified, proceeding with deletion')

    // Delete campaign_states (cascade should handle this, but being explicit)
    const { error: stateError } = await supabaseServer
      .from('campaign_states')
      .delete()
      .eq('campaign_id', campaignId)
    
    if (stateError) {
      console.error('[v1/campaigns/:id] DELETE - Error deleting campaign states:', stateError)
    } else {
      console.log('[v1/campaigns/:id] DELETE - Campaign states deleted successfully')
    }

    // Delete ads associated with this campaign
    const { error: adsError } = await supabaseServer
      .from('ads')
      .delete()
      .eq('campaign_id', campaignId)
    
    if (adsError) {
      console.error('[v1/campaigns/:id] DELETE - Error deleting ads:', adsError)
    } else {
      console.log('[v1/campaigns/:id] DELETE - Ads deleted successfully')
    }

    // Delete conversations (if conversation table has campaign_id)
    const { error: convError } = await supabaseServer
      .from('conversations')
      .delete()
      .eq('campaign_id', campaignId)
    
    if (convError) {
      console.error('[v1/campaigns/:id] DELETE - Error deleting conversations:', convError)
    } else {
      console.log('[v1/campaigns/:id] DELETE - Conversations deleted successfully')
    }

    // Finally, delete the campaign itself
    const { error: deleteError } = await supabaseServer
      .from('campaigns')
      .delete()
      .eq('id', campaignId)
    
    if (deleteError) {
      console.error('[v1/campaigns/:id] DELETE - Error deleting campaign:', deleteError)
      return NextResponse.json(
        { success: false, error: { code: 'deletion_failed', message: `Failed to delete campaign: ${deleteError.message}` } },
        { status: 500, headers: noCacheHeaders }
      )
    }

    console.log('[v1/campaigns/:id] DELETE - ✅ Campaign deleted successfully:', campaignId)
    return NextResponse.json(
      { success: true, message: 'Campaign deleted successfully' },
      { status: 200, headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('[v1/campaigns/:id] DELETE - Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete campaign'
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: errorMessage } },
      { status: 500, headers: noCacheHeaders }
    )
  }
}

