/**
 * Feature: Creative Plan API
 * Purpose: Generate and persist a CreativePlan for a campaign
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway/getting-started
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = BodySchema.parse(await req.json())
    const plan = await createCreativePlan({
      goal: body.goal,
      inferredCategory: body.inferredCategory,
      offerText: body.offerText,
    })

    // Persist plan if campaignId provided
    if (body.campaignId) {
      const { error } = await supabase
        .from('creative_plans')
        .insert({
          campaign_id: body.campaignId,
          plan,
          status: 'generated',
          created_by: user.id,
        })
      if (error) throw error
    }

    return NextResponse.json({ plan })
  } catch (err) {
    console.error('[creative-plan] error', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


