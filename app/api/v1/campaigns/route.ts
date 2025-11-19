/**
 * Feature: Campaigns API (v1)
 * Purpose: List and create campaigns with linked conversations
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/database.types'
import { conversationManager } from '@/lib/services/conversation-manager'
import { generateCampaignNameAI } from '@/lib/ai/campaign-namer'

// GET /api/v1/campaigns - List user's campaigns
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Get limit parameter from query string
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    // Fetch campaigns with their ads using authenticated client for RLS
    const supabase = await createServerClient()
    let query = supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        created_at,
        updated_at,
        initial_goal,
        campaign_budget_cents,
        currency_code,
        budget_status,
        ads (
          id,
          name,
          status,
          selected_creative_id,
          selected_copy_id,
          destination_type,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    // Apply limit if provided
    if (limit && limit > 0) {
      query = query.limit(limit)
    }

    const { data: campaigns, error } = await query

    if (error) {
      console.error('[GET /api/v1/campaigns] Error fetching campaigns:', error)
      throw new Error(error.message)
    }

    // Return with no-cache headers to prevent stale data
    const response = successResponse({ campaigns: campaigns || [] })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('[GET /api/v1/campaigns] Error:', error)
    return errorResponse(error as Error)
  }
}

// POST /api/v1/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Apply rate limiting (50 req/min for campaign creation)
    const { checkRateLimit } = await import('@/app/api/v1/_middleware');
    await checkRateLimit(user.id, 'POST /api/v1/campaigns', 50)

    const body: unknown = await request.json()
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body')
    }
    
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
      console.log('[POST /api/campaigns] No name provided, generating AI name from prompt:', source.substring(0, 100) + '...')
      
      const avoid: string[] = []
      // Try up to 3 times to avoid global conflicts
      for (let attempt = 0; attempt < 3; attempt++) {
        console.log(`[POST /api/campaigns] AI naming attempt ${attempt + 1}/3`)
        
        const proposed = await generateCampaignNameAI({
          prompt: source,
          ...(typeof initialGoal === 'string' ? { goalType: initialGoal } : {}),
          avoid,
        })
        const nameToTry = proposed && proposed.trim().length > 0 ? proposed : 'Campaign'
        
        console.log(`[POST /api/campaigns] AI proposed name: "${nameToTry}"`)

        // Attempt insert immediately to leverage DB unique index globally
        const insert = await supabaseServer
          .from('campaigns')
          .insert({
            user_id: user.id,
            name: nameToTry,
            status: 'draft',
            metadata,
            initial_goal: initialGoal || null,
          })
          .select()
          .single()

        if (!insert.error) {
          const campaign: Tables<'campaigns'> | null = insert.data as Tables<'campaigns'> | null
          console.log(`[POST /api/campaigns] ✅ Successfully created campaign "${campaign?.name}" (ID: ${campaign?.id})`)
          
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
          let draftAdId: string | undefined
          try {
            const { data: draftAd, error: draftError } = await supabaseServer
              .from('ads')
              .insert({
                campaign_id: campaign!.id,
                name: `${campaign!.name} - Draft`,
                status: 'draft'
              })
              .select()
              .single()
            
            if (draftError) {
              console.error('Failed to create initial draft ad:', draftError)
              // Don't fail campaign creation, but log the error
            } else {
              console.log(`Created initial draft ad ${draftAd.id} for campaign ${campaign!.id}`)
              draftAdId = draftAd.id
            }
          } catch (draftError) {
            console.error('Error creating initial draft ad:', draftError)
            // Continue - campaign is still valid without initial draft
          }

          return successResponse({ campaign, draftAdId }, undefined, 201)
        }

        const code = (insert.error as unknown as { code?: string }).code
        if (code === '23505') {
          // unique violation → add to avoid list and retry
          console.log(`[POST /api/campaigns] ⚠️  Name "${nameToTry}" already exists, retrying...`)
          avoid.push(nameToTry)
          continue
        }

        console.error('Error creating campaign:', insert.error)
        throw new Error(insert.error.message)
      }

      // If all attempts failed due to uniqueness churn
      throw new ValidationError('Could not generate a unique campaign name. Please try again.')
    }

    // If a manual name is provided, fall through to single insert path
    const { data: manualCampaign, error: manualErr } = await supabaseServer
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: finalName!,
        status: 'draft',
        metadata,
        initial_goal: initialGoal || null,
      })
      .select()
      .single()

    if (manualErr) {
      const status = (manualErr as unknown as { code?: string }).code === '23505' ? 409 : 500
      throw new Error(manualErr.message)
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
    let draftAdId: string | undefined
    try {
      const { data: draftAd, error: draftError } = await supabaseServer
        .from('ads')
        .insert({
          campaign_id: (manualCampaign as Tables<'campaigns'>).id,
          name: `${(manualCampaign as Tables<'campaigns'>).name} - Draft`,
          status: 'draft'
        })
        .select()
        .single()
      
      if (draftError) {
        console.error('Failed to create initial draft ad:', draftError)
        // Don't fail campaign creation, but log the error
      } else {
        console.log(`Created initial draft ad ${draftAd.id} for campaign ${(manualCampaign as Tables<'campaigns'>).id}`)
        draftAdId = draftAd.id
      }
    } catch (draftError) {
      console.error('Error creating initial draft ad:', draftError)
      // Continue - campaign is still valid without initial draft
    }

    return successResponse({ campaign: manualCampaign, draftAdId }, undefined, 201)
  } catch (error) {
    console.error('[POST /api/v1/campaigns] Error:', error)
    return errorResponse(error as Error)
  }
}
