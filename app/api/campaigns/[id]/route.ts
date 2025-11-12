import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { generateNameCandidates, pickUniqueFromCandidates } from '@/lib/utils/campaign-naming'
import type { Database } from '@/lib/supabase/database.types'

// GET /api/campaigns/[id] - Get a specific campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Create client that reads user session from cookies
    const supabase = await createServerClient()
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
      console.error(`[API] Campaign fetch error:`, error);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // DEBUG: Log what Supabase returned
    console.log(`[API] Campaign loaded:`, {
      id: campaign.id,
      name: campaign.name,
      hasCampaignStates: !!campaign.campaign_states,
      campaignStatesType: Array.isArray(campaign.campaign_states) ? 'array' : typeof campaign.campaign_states,
      campaignStatesKeys: campaign.campaign_states ? Object.keys(campaign.campaign_states) : []
    });
    
    if (campaign.campaign_states && typeof campaign.campaign_states === 'object') {
      console.log(`[API] ✅ campaign_states exists as object:`, {
        hasAdPreviewData: Boolean((campaign.campaign_states as Database['public']['Tables']['campaign_states']['Row']).ad_preview_data),
        hasGoalData: Boolean((campaign.campaign_states as Database['public']['Tables']['campaign_states']['Row']).goal_data),
        hasLocationData: Boolean((campaign.campaign_states as Database['public']['Tables']['campaign_states']['Row']).location_data),
        adPreviewDataSample: (campaign.campaign_states as Database['public']['Tables']['campaign_states']['Row']).ad_preview_data ? 
          JSON.stringify((campaign.campaign_states as Database['public']['Tables']['campaign_states']['Row']).ad_preview_data).substring(0, 200) : null
      });
    } else {
      console.warn(`[API] ⚠️ campaign_states is NULL or wrong type!`);
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

// PATCH /api/campaigns/[id] - Rename campaign with uniqueness per user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campaignId = id

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: campaign, error: fetchErr } = await supabaseServer
      .from('campaigns')
      .select('id,user_id,name,metadata')
      .eq('id', campaignId)
      .single()
    if (fetchErr || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const body = (await request.json()) as { name?: string }
    const nextNameRaw = (body.name || '').trim()
    if (!nextNameRaw) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // If client provides a manual name, we respect it but must be unique
    let desiredName = nextNameRaw

    // Attempt update, on conflict generate alternative using existing metadata.initialPrompt if available
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
      const status = (result.error as unknown as { code?: string }).code === '23505' ? 409 : 500
      return NextResponse.json({ error: result.error.message }, { status })
    }

    return NextResponse.json({ campaign: result.data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to rename campaign' }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id] - Delete campaign and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campaignId = id

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: campaign, error: fetchErr } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    
    if (fetchErr || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Delete campaign_states (cascade should handle this, but being explicit)
    const { error: stateError } = await supabaseServer
      .from('campaign_states')
      .delete()
      .eq('campaign_id', campaignId)
    
    if (stateError) {
      console.error('Error deleting campaign states:', stateError)
    }

    // Delete ads associated with this campaign
    const { error: adsError } = await supabaseServer
      .from('ads')
      .delete()
      .eq('campaign_id', campaignId)
    
    if (adsError) {
      console.error('Error deleting ads:', adsError)
    }

    // Delete conversations (if conversation table has campaign_id)
    const { error: convError } = await supabaseServer
      .from('conversations')
      .delete()
      .eq('campaign_id', campaignId)
    
    if (convError) {
      console.error('Error deleting conversations:', convError)
    }

    // Finally, delete the campaign itself
    const { error: deleteError } = await supabaseServer
      .from('campaigns')
      .delete()
      .eq('id', campaignId)
    
    if (deleteError) {
      console.error('Error deleting campaign:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
