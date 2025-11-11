/**
 * Feature: Ad Copy Schemas
 * Purpose: Shared zod schemas for ad copy generation and editing (route and tools)
 * References:
 *  - AI SDK Core Structured Output: https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 */

import { z } from 'zod'

export const CopyItemSchema = z.object({
  primaryText: z.string().min(12).max(125),
  headline: z.string().min(3).max(40),
  description: z.string().min(3).max(30),
  // Optional metadata for analysis
  angle: z.string().optional(),
  usesEmojis: z.boolean().optional(),
  // Optional overlay-ready fields
  overlay: z
    .object({
      headline: z.string().max(40).optional(),
      offer: z.string().max(40).optional(),
      body: z.string().max(80).optional(),
      density: z.enum(['none','light','medium','heavy','text-only']).optional(),
    })
    .optional(),
})

export const CopySchema = z.object({
  variations: z.array(CopyItemSchema).length(3),
})

export const SingleCopySchema = CopyItemSchema

/**
 * Relaxed schema for edit operations - allows longer text that will be clamped
 * This prevents validation errors when AI returns over-length text
 */
export const RelaxedCopyItemSchema = z.object({
  primaryText: z.string().min(1).max(500), // Relaxed limit, will be clamped to 125
  headline: z.string().min(1).max(200), // Relaxed limit, will be clamped to 40
  description: z.string().min(1).max(200), // Relaxed limit, will be clamped to 30
  // Optional metadata for analysis
  angle: z.string().optional(),
  usesEmojis: z.boolean().optional(),
  // Optional overlay-ready fields
  overlay: z
    .object({
      headline: z.string().max(200).optional(), // Relaxed, will be clamped to 40
      offer: z.string().max(200).optional(), // Relaxed, will be clamped to 40
      body: z.string().max(500).optional(), // Relaxed, will be clamped to 80
      density: z.enum(['none','light','medium','heavy','text-only']).optional(),
    })
    .optional(),
})

/**
 * Clamp copy text to Meta's character limits
 * Preserves word boundaries when possible
 */
export function clampCopy(copy: z.infer<typeof RelaxedCopyItemSchema>): z.infer<typeof CopyItemSchema> {
  const clampText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    
    // Try to cut at word boundary
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    // If we have a word boundary and it's not too far back, use it
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace).trim()
    }
    
    // Otherwise just hard cut and trim
    return truncated.trim()
  }

  return {
    primaryText: clampText(copy.primaryText, 125),
    headline: clampText(copy.headline, 40),
    description: clampText(copy.description, 30),
    angle: copy.angle,
    usesEmojis: copy.usesEmojis,
    overlay: copy.overlay ? {
      headline: copy.overlay.headline ? clampText(copy.overlay.headline, 40) : undefined,
      offer: copy.overlay.offer ? clampText(copy.overlay.offer, 40) : undefined,
      body: copy.overlay.body ? clampText(copy.overlay.body, 80) : undefined,
      density: copy.overlay.density,
    } : undefined,
  }
}


