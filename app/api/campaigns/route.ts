/**
 * Feature: Campaigns API
 * Purpose: List and create campaigns with linked conversations
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/database.types'
import { conversationManager } from '@/lib/services/conversation-manager'
import { generateCampaignNameAI } from '@/lib/ai/campaign-namer'

// GET /api/campaigns - List user's campaigns
export async function GET() {
  try {
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

    const { data: campaigns, error } = await supabaseServer
      .from('campaigns')
      .select(`
        *,
        campaign_states (*)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { name, tempPromptId, prompt, goalType } = body as { name?: string; tempPromptId?: string; prompt?: string; goalType?: string }

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
              audience_data: null,
              ad_copy_data: null,
              ad_preview_data: null,
              budget_data: null,
            })
          if (stateError) {
            console.error('Error creating campaign state:', stateError)
            await supabaseServer.from('campaigns').delete().eq('id', campaign!.id)
            return NextResponse.json({ error: 'Failed to initialize campaign state' }, { status: 500 })
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
            console.log(`Created conversation ${conversation.id} for campaign ${campaign!.id} with goal: ${initialGoal || 'none'}`)
          } catch (convError) {
            console.error('Error creating conversation:', convError)
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
              console.error('Failed to create initial draft ad:', draftError)
              // Don't fail campaign creation, but log the error
            } else {
              console.log(`Created initial draft ad ${draftAd.id} for campaign ${campaign!.id}`)
            }
          } catch (draftError) {
            console.error('Error creating initial draft ad:', draftError)
            // Continue - campaign is still valid without initial draft
          }

          return NextResponse.json({ campaign }, { status: 201 })
        }

        const code = (insert.error as unknown as { code?: string }).code
        if (code === '23505') {
          // unique violation → add to avoid list and retry
          avoid.push(nameToTry)
          continue
        }

        console.error('Error creating campaign:', insert.error)
        return NextResponse.json({ error: insert.error.message }, { status: 500 })
      }

      // If all attempts failed due to uniqueness churn
      return NextResponse.json({ error: 'Could not generate a unique campaign name. Please try again.' }, { status: 409 })
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
      return NextResponse.json({ error: manualErr.message }, { status })
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
        audience_data: null,
        ad_copy_data: null,
        ad_preview_data: null,
        budget_data: null,
      })

    if (manualStateErr) {
      console.error('Error creating campaign state:', manualStateErr)
      await supabaseServer.from('campaigns').delete().eq('id', (manualCampaign as Tables<'campaigns'>).id)
      return NextResponse.json({ error: 'Failed to initialize campaign state' }, { status: 500 })
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
      console.log(`Created conversation ${conversation.id} for campaign ${(manualCampaign as Tables<'campaigns'>).id} with goal: ${initialGoal || 'none'}`)
    } catch (convError) {
      console.error('Error creating conversation:', convError)
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
        console.error('Failed to create initial draft ad:', draftError)
        // Don't fail campaign creation, but log the error
      } else {
        console.log(`Created initial draft ad ${draftAd.id} for campaign ${(manualCampaign as Tables<'campaigns'>).id}`)
      }
    } catch (draftError) {
      console.error('Error creating initial draft ad:', draftError)
      // Continue - campaign is still valid without initial draft
    }

    return NextResponse.json({ campaign: manualCampaign }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
