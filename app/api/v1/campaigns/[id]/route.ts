import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError, NotFoundError } from '@/app/api/v1/_middleware'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { generateNameCandidates, pickUniqueFromCandidates } from '@/lib/utils/campaign-naming'
import type { Database } from '@/lib/supabase/database.types'

// GET /api/v1/campaigns/[id] - Get a specific campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    
    // Verify ownership
    await requireCampaignOwnership(id, user.id)

    // Use authenticated client for RLS
    const supabase = await createServerClient()
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        ads (
          id,
          name,
          status,
          selected_creative_id,
          selected_copy_id,
          created_at,
          updated_at,
          ad_creatives!ad_creatives_ad_id_fkey (*),
          ad_copy_variations!ad_copy_variations_ad_id_fkey (*),
          ad_target_locations!ad_target_locations_ad_id_fkey (*),
          ad_destinations!ad_destinations_ad_id_fkey (*),
          ad_budgets!ad_budgets_ad_id_fkey (*)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !campaign) {
      console.error('[GET /api/v1/campaigns/:id] Campaign fetch error:', error)
      throw new NotFoundError('Campaign not found')
    }

    console.log('[GET /api/v1/campaigns/:id] Campaign loaded:', {
      id: campaign.id,
      name: campaign.name,
      adsCount: campaign.ads?.length || 0
    })

    return successResponse({ campaign })
  } catch (error) {
    console.error('[GET /api/v1/campaigns/:id] Error:', error)
    return errorResponse(error as Error)
  }
}

// PATCH /api/v1/campaigns/[id] - Rename campaign with uniqueness per user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const campaignId = id
    
    // Verify ownership
    await requireCampaignOwnership(campaignId, user.id)

    // Verify campaign exists and get metadata
    const supabase = await createServerClient()
    const { data: campaign, error: fetchErr } = await supabase
      .from('campaigns')
      .select('id,user_id,name,metadata')
      .eq('id', campaignId)
      .single()
      
    if (fetchErr || !campaign) {
      throw new NotFoundError('Campaign not found')
    }

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body')
    }
    
    const { name } = body as { name?: string }
    const nextNameRaw = (name || '').trim()
    
    if (!nextNameRaw) {
      throw new ValidationError('Name is required')
    }

    // If client provides a manual name, we respect it but must be unique
    let desiredName = nextNameRaw

    // Attempt update, on conflict generate alternative using existing metadata.initialPrompt if available
    const attemptUpdate = async (proposed: string) => {
      return await supabase
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
      const { data: rows } = await supabase
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
      const status = (result.error as unknown as { code?: string }).code === '23505' ? 409 : 500
      throw new Error(result.error.message)
    }

    return successResponse({ campaign: result.data })
  } catch (error) {
    console.error('[PATCH /api/v1/campaigns/:id] Error:', error)
    return errorResponse(error as Error)
  }
}

// DELETE /api/v1/campaigns/[id] - Delete campaign and all related data
// Idempotent: Returns success even if campaign doesn't exist (REST best practice)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const campaignId = id

    console.log('[DELETE /api/v1/campaigns/:id] Starting deletion:', campaignId)

    // Verify ownership (will throw if not found or unauthorized)
    await requireCampaignOwnership(campaignId, user.id)

    // Delete campaign (cascade will handle ads, conversations, and related data)
    const supabase = await createServerClient()
    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)
    
    if (deleteError) {
      console.error('[DELETE /api/v1/campaigns/:id] Delete error:', deleteError)
      throw new Error('Failed to delete campaign')
    }

    console.log('[DELETE /api/v1/campaigns/:id] ✅ Campaign deleted:', campaignId)

    // Return success with no-cache headers
    const response = successResponse({ 
      message: 'Campaign deleted successfully' 
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('[DELETE /api/v1/campaigns/:id] Error:', error)
    return errorResponse(error as Error)
  }
}
