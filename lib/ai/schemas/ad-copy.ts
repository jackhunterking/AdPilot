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


