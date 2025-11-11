/**
 * Feature: AI-powered audience description translation
 * Purpose: Translate natural language customer descriptions into Meta targeting parameters
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 */

import { type NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'

const TargetingParametersSchema = z.object({
  demographics: z.object({
    ageMin: z.number().min(18).max(65),
    ageMax: z.number().min(18).max(65),
    gender: z.enum(['all', 'male', 'female']),
  }),
  detailedTargeting: z.object({
    interests: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
    behaviors: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: TargetingParametersSchema,
      prompt: `You are an expert in Meta (Facebook/Instagram) advertising targeting. 
      
Given the following audience description, generate appropriate targeting parameters including:
1. Demographics (age range 18-65, gender)
2. Interests (Meta interest categories - use realistic interest names like "Fitness and wellness", "Technology", "Entrepreneurship", etc.)
3. Behaviors (Meta behavior categories - use realistic behavior names like "Small business owners", "Technology early adopters", "Frequent travelers", etc.)

For interests and behaviors, generate IDs using a format like "interest_[name]" or "behavior_[name]" in snake_case.

Audience Description: "${description}"

Generate targeting parameters that would effectively reach this audience on Meta platforms.`,
    })

    return NextResponse.json(object)
  } catch (error) {
    console.error('[Translate Description] Error:', error)
    return NextResponse.json(
      { error: 'Failed to translate description' },
      { status: 500 }
    )
  }
}

