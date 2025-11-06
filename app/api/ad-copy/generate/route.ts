/**
 * Feature: Ad Copy Generation API
 * Purpose: Generate three ad copy variations from selected creative images and goal
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 *  - AI SDK Core Vision: https://ai-sdk.dev/docs/ai-sdk-core/vision
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway/getting-started
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateObject } from 'ai'
import { getModel } from '@/lib/ai/gateway-provider'
import { createServerClient } from '@/lib/supabase/server'
import { CopySchema, SingleCopySchema } from '@/lib/ai/schemas/ad-copy'

const BatchRequestSchema = z.object({
  campaignId: z.string().optional(),
  goalType: z.string().nullable().optional(),
  imageUrls: z.array(z.string().url()).min(1).max(3),
  businessContext: z.string().optional(),
})

const SingleRequestSchema = z.object({
  campaignId: z.string().optional(),
  goalType: z.string().nullable().optional(),
  imageUrls: z.array(z.string().url()).min(1).max(3),
  targetIndex: z.number().int().min(0).max(2),
  selectedImageIndex: z.number().int().min(0).max(2).optional(),
  preferEmojis: z.boolean().optional(),
  current: z
    .object({
      primaryText: z.string().optional(),
      headline: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  businessContext: z.string().optional(),
})

// Schemas are shared from lib/ai/schemas to avoid Next.js route export validation issues

const SYSTEM_INSTRUCTIONS = `You are an expert Meta ads copywriter. Write three unique ad copy variations for the same creative.

Rules:
- Each variation must use a different angle: benefit-led, offer/urgency, social proof.
- EXACTLY 1 of the 3 variations MUST include tasteful emojis (1–2) in the primaryText only; the other 2 MUST NOT include emojis.
- Never put emojis in the headline or description unless explicitly requested.
- Align tone and CTA with the campaign goal if given (leads, calls, website-visits).
- Keep copy concise and platform-native.
- HARD LIMITS: primaryText ≤ 125 chars, headline ≤ 40 chars, description ≤ 30 chars. You MUST respect these limits and shorten text if needed.
- For each variation, set usesEmojis=true if emojis were used, otherwise false.
`

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // Single variation rewrite
    if (typeof body?.targetIndex === 'number') {
      const { goalType, imageUrls, targetIndex, selectedImageIndex, preferEmojis, current: _current, businessContext } = SingleRequestSchema.parse(body)

      const idx = (typeof selectedImageIndex === 'number' ? selectedImageIndex : targetIndex)
      const selectedImage = imageUrls[idx] || imageUrls[0]
      const singleContent = [
        {
          type: 'text' as const,
          text: `Rewrite one ad copy variation for index ${targetIndex + 1}.
Keep the same campaign context.${goalType ? ` Goal: ${goalType}.` : ''} ${businessContext ? `Context: ${businessContext}` : ''}
Use the following image URL as visual context (do not attempt to analyze the image, just consider it conceptually): ${selectedImage}
${preferEmojis === false ? 'Do NOT include any emojis.' : 'Include tasteful emojis (1–2) in primaryText only; do not put emojis in headline/description.'}
If current copy is provided, improve it while changing the persuasion angle. Also return usesEmojis=true/false accordingly.`,
        },
      ]

      const { object: rawVariation } = await generateObject({
        model: getModel('openai/gpt-4o'),
        system: SYSTEM_INSTRUCTIONS,
        schema: SingleCopySchema,
        messages: [{ role: 'user', content: singleContent }],
      })

      const clamp = (s: string, max: number) => (s.length > max ? s.slice(0, max).trim() : s)
      const variation = {
        ...rawVariation,
        primaryText: clamp(rawVariation.primaryText, 125),
        headline: clamp(rawVariation.headline, 40),
        description: clamp(rawVariation.description, 30),
        overlay: rawVariation.overlay ? {
          ...rawVariation.overlay,
          headline: rawVariation.overlay.headline ? clamp(rawVariation.overlay.headline, 40) : undefined,
          offer: rawVariation.overlay.offer ? clamp(rawVariation.overlay.offer, 40) : undefined,
          body: rawVariation.overlay.body ? clamp(rawVariation.overlay.body, 80) : undefined,
        } : undefined,
      }

      return NextResponse.json({ variation })
    }

    // Batch (three) variations
    const { goalType, imageUrls, businessContext } = BatchRequestSchema.parse(body)
    const userContent = [
      {
        type: 'text' as const,
        text: `Create three different ad copy variations for this campaign.${goalType ? ` Goal: ${goalType}.` : ''} ${businessContext ? ` Context: ${businessContext}` : ''}
Use these image URLs as context only (do not attempt to analyze the images directly, just infer likely themes): ${imageUrls.join(', ')}

Additionally, for each variation return optional overlay-ready fields (when applicable):
- overlay.headline (≤40 chars)
- overlay.offer (≤40 chars)
- overlay.body (≤80 chars)
- overlay.density (one of none|light|medium|heavy|text-only)
Trim texts to limits. Avoid brand names. Align CTAs to goal.`,
      },
    ]

  const { object: raw } = await generateObject({
      model: getModel('openai/gpt-4o'),
      system: SYSTEM_INSTRUCTIONS,
      schema: CopySchema,
      messages: [
        { role: 'user', content: userContent },
      ],
    })

    const clamp = (s: string, max: number) => (s.length > max ? s.slice(0, max).trim() : s)
    const object = {
      variations: raw.variations.map((v) => ({
        ...v,
        primaryText: clamp(v.primaryText, 125),
        headline: clamp(v.headline, 40),
        description: clamp(v.description, 30),
        overlay: v.overlay ? {
          ...v.overlay,
          headline: v.overlay.headline ? clamp(v.overlay.headline, 40) : undefined,
          offer: v.overlay.offer ? clamp(v.overlay.offer, 40) : undefined,
          body: v.overlay.body ? clamp(v.overlay.body, 80) : undefined,
        } : undefined,
      }))
    }

    return NextResponse.json(object)
  } catch (err) {
    console.error('[ad-copy] generation error', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


