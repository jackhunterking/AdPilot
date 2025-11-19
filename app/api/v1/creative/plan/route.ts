/**
 * Feature: Creative Plan API (v1)
 * Purpose: Generate and persist a CreativePlan for a campaign
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway/getting-started
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { createServerClient } from '@/lib/supabase/server'
import { createCreativePlan } from '@/lib/ai/system/creative-guardrails'

export const maxDuration = 30

const BodySchema = z.object({
  campaignId: z.string().uuid().optional(),
  goal: z.enum(['calls', 'leads', 'website-visits', 'unknown']).default('unknown'),
  inferredCategory: z.string().optional(),
  offerText: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    const bodyUnknown: unknown = await req.json()
    const body = BodySchema.parse(bodyUnknown)

    // If campaignId provided, verify ownership
    if (body.campaignId) {
      await requireCampaignOwnership(body.campaignId, user.id)
    }

    const plan = await createCreativePlan({
      goal: body.goal,
      inferredCategory: body.inferredCategory,
      offerText: body.offerText,
    })

    // Store plan in campaign metadata if campaignId provided
    if (body.campaignId) {
      const supabase = await createServerClient()
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('metadata')
        .eq('id', body.campaignId)
        .single()

      const currentMetadata = (campaign?.metadata as Record<string, unknown>) || {}
      
      const { error } = await supabase
        .from('campaigns')
        .update({
          metadata: {
            ...currentMetadata,
            creative_plan: plan,
            creative_plan_status: 'generated',
          }
        })
        .eq('id', body.campaignId)
        
      if (error) {
        console.error('[POST /api/v1/creative/plan] Metadata update error:', error)
        throw error
      }
    }

    return successResponse({ plan })
  } catch (err) {
    console.error('[POST /api/v1/creative/plan] Error:', err)
    return errorResponse(err as Error)
  }
}
