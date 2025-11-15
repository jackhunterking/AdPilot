/**
 * Feature: Campaigns API v1
 * Purpose: List and create user campaigns
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/database.types'
import { conversationManager } from '@/lib/services/conversation-manager'
import { generateCampaignNameAI } from '@/lib/ai/campaign-namer'
import type { CreateCampaignRequest, ListCampaignsResponse } from '@/lib/types/api'

// ============================================================================
// Type Guards
// ============================================================================

function isCreateCampaignRequest(body: unknown): body is CreateCampaignRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    (!('name' in b) || typeof b.name === 'string') &&
    (!('tempPromptId' in b) || typeof b.tempPromptId === 'string') &&
    (!('prompt' in b) || typeof b.prompt === 'string') &&
    (!('goalType' in b) || typeof b.goalType === 'string')
  )
}

// ============================================================================
// GET /api/v1/campaigns - List user's campaigns
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    // Fetch campaigns with optimized query
    let query = supabaseServer
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        created_at,
        updated_at,
        campaign_states (
          ad_preview_data
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (limit && limit > 0) {
      query = query.limit(limit)
    }

    const { data: campaigns, error } = await query

    if (error) {
      console.error('[v1/campaigns] GET error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_failed', message: error.message } },
        { status: 500 }
      )
    }

    const response: ListCampaignsResponse = {
      campaigns: campaigns || []
    }

    return NextResponse.json(
      { success: true, data: response },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('[v1/campaigns] GET unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Failed to fetch campaigns' } },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/v1/campaigns - Create new campaign
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body: unknown = await request.json()
    if (!isCreateCampaignRequest(body)) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'Invalid request body' } },
        { status: 400 }
      )
    }

    const { name, tempPromptId, prompt, goalType } = body

    // Normalize provided name; treat empty/whitespace as missing to trigger auto-naming
    const requestedName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : null
    let initialPrompt = prompt
    let initialGoal = goalType

    // If tempPromptId is provided, fetch and use that prompt
    if (tempPromptId) {
      const { data: tempPrompt, error: promptError } = await supabaseServer
        .from('temp_prompts')
        .select('*')
        .eq('id', tempPromptId)
        .eq('used', false)
        .single()

      if (!promptError && tempPrompt) {
        // Check if not expired
        const expiresAt = new Date(tempPrompt.expires_at)
        if (expiresAt > new Date()) {
          initialPrompt = tempPrompt.prompt_text
          initialGoal = tempPrompt.goal_type || initialGoal
          
          // Mark as used
          await supabaseServer
            .from('temp_prompts')
            .update({ used: true })
            .eq('id', tempPromptId)
        }
      }
    }

    // Create campaign metadata with initial prompt if provided
    const metadata = initialPrompt ? { initialPrompt } : null

    // Determine campaign name (AI-generated, globally unique)
    let finalName = requestedName ?? null
    if (!finalName) {
      const source = (initialPrompt ?? prompt ?? '').slice(0, 500)
      const avoid: string[] = []
      // Try up to 3 times to avoid global conflicts
      for (let attempt = 0; attempt < 3; attempt++) {
        const proposed = await generateCampaignNameAI({
          prompt: source,
          ...(typeof initialGoal === 'string' ? { goalType: initialGoal } : {}),
          avoid,
        })
        const nameToTry = proposed && proposed.trim().length > 0 ? proposed : 'Campaign'

        // Attempt insert immediately to leverage DB unique index globally
        const insert = await supabaseServer
          .from('campaigns')
          .insert({
            user_id: user.id,
            name: nameToTry,
            status: 'draft',
            current_step: 1,
            total_steps: 6,
            metadata,
            initial_goal: initialGoal || null,
          })
          .select()
          .single()

        if (!insert.error) {
          const campaign: Tables<'campaigns'> | null = insert.data as Tables<'campaigns'> | null
          // Create campaign state with initial goal if provided
          const initialGoalData = initialGoal 
            ? { selectedGoal: initialGoal, status: 'idle', formData: null }
            : null
          const { error: stateError } = await supabaseServer
            .from('campaign_states')
            .insert({
              campaign_id: campaign!.id,
              goal_data: initialGoalData,
              location_data: null,
              ad_copy_data: null,
              ad_preview_data: null,
              budget_data: null,
            })
          if (stateError) {
            console.error('[v1/campaigns] Error creating campaign state:', stateError)
            await supabaseServer.from('campaigns').delete().eq('id', campaign!.id)
            return NextResponse.json(
              { success: false, error: { code: 'state_creation_failed', message: 'Failed to initialize campaign state' } },
              { status: 500 }
            )
          }

          // Conversation init
          try {
            const conversation = await conversationManager.createConversation(
              user.id,
              campaign!.id,
              {
                title: `Chat: ${campaign?.name ?? nameToTry}`,
                metadata: {
                  campaign_name: campaign?.name ?? nameToTry,
                  initial_prompt: initialPrompt,
                  current_goal: initialGoal || null,
                },
              }
            )
            console.log(`[v1/campaigns] Created conversation ${conversation.id} for campaign ${campaign!.id}`)
          } catch (convError) {
            console.error('[v1/campaigns] Error creating conversation:', convError)
          }

          // Create initial draft ad
          try {
            const { data: draftAd, error: draftError } = await supabaseServer
              .from('ads')
              .insert({
                campaign_id: campaign!.id,
                name: `${campaign!.name} - Draft`,
                status: 'draft',
                creative_data: null,
                copy_data: null,
                meta_ad_id: null,
                metrics_snapshot: null,
                setup_snapshot: null
              })
              .select()
              .single()
            
            if (draftError) {
              console.error('[v1/campaigns] Failed to create initial draft ad:', draftError)
            } else {
              console.log(`[v1/campaigns] Created initial draft ad ${draftAd.id}`)
            }
          } catch (draftError) {
            console.error('[v1/campaigns] Error creating initial draft ad:', draftError)
          }

          return NextResponse.json(
            { success: true, data: { campaign } },
            { status: 201 }
          )
        }

        const code = (insert.error as unknown as { code?: string }).code
        if (code === '23505') {
          // unique violation → add to avoid list and retry
          avoid.push(nameToTry)
          continue
        }

        console.error('[v1/campaigns] Error creating campaign:', insert.error)
        return NextResponse.json(
          { success: false, error: { code: 'creation_failed', message: insert.error.message } },
          { status: 500 }
        )
      }

      // If all attempts failed due to uniqueness churn
      return NextResponse.json(
        { success: false, error: { code: 'name_conflict', message: 'Could not generate a unique campaign name. Please try again.' } },
        { status: 409 }
      )
    }

    // If a manual name is provided, fall through to single insert path
    const { data: manualCampaign, error: manualErr } = await supabaseServer
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: finalName!,
        status: 'draft',
        current_step: 1,
        total_steps: 6,
        metadata,
        initial_goal: initialGoal || null,
      })
      .select()
      .single()

    if (manualErr) {
      const status = (manualErr as unknown as { code?: string }).code === '23505' ? 409 : 500
      return NextResponse.json(
        { success: false, error: { code: 'creation_failed', message: manualErr.message } },
        { status }
      )
    }

    // Create campaign state with initial goal if provided
    const manualGoalData = initialGoal 
      ? { selectedGoal: initialGoal, status: 'idle', formData: null }
      : null

    const { error: manualStateErr } = await supabaseServer
      .from('campaign_states')
      .insert({
        campaign_id: (manualCampaign as Tables<'campaigns'>).id,
        goal_data: manualGoalData,
        location_data: null,
        ad_copy_data: null,
        ad_preview_data: null,
        budget_data: null,
      })

    if (manualStateErr) {
      console.error('[v1/campaigns] Error creating campaign state:', manualStateErr)
      await supabaseServer.from('campaigns').delete().eq('id', (manualCampaign as Tables<'campaigns'>).id)
      return NextResponse.json(
        { success: false, error: { code: 'state_creation_failed', message: 'Failed to initialize campaign state' } },
        { status: 500 }
      )
    }

    try {
      const conversation = await conversationManager.createConversation(
        user.id,
        (manualCampaign as Tables<'campaigns'>).id,
        {
          title: `Chat: ${(manualCampaign as Tables<'campaigns'>).name}`,
          metadata: {
            campaign_name: (manualCampaign as Tables<'campaigns'>).name,
            initial_prompt: initialPrompt,
            current_goal: initialGoal || null,
          },
        }
      )
      console.log(`[v1/campaigns] Created conversation ${conversation.id}`)
    } catch (convError) {
      console.error('[v1/campaigns] Error creating conversation:', convError)
    }

    // Create initial draft ad
    try {
      const { data: draftAd, error: draftError } = await supabaseServer
        .from('ads')
        .insert({
          campaign_id: (manualCampaign as Tables<'campaigns'>).id,
          name: `${(manualCampaign as Tables<'campaigns'>).name} - Draft`,
          status: 'draft',
          creative_data: null,
          copy_data: null,
          meta_ad_id: null,
          metrics_snapshot: null,
          setup_snapshot: null
        })
        .select()
        .single()
      
      if (draftError) {
        console.error('[v1/campaigns] Failed to create initial draft ad:', draftError)
      } else {
        console.log(`[v1/campaigns] Created initial draft ad ${draftAd.id}`)
      }
    } catch (draftError) {
      console.error('[v1/campaigns] Error creating initial draft ad:', draftError)
    }

    return NextResponse.json(
      { success: true, data: { campaign: manualCampaign } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[v1/campaigns] POST unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Failed to create campaign' } },
      { status: 500 }
    )
  }
}

