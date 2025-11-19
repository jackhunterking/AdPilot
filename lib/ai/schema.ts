/**
 * Feature: Chat Message Schemas
 * Purpose: Zod schemas for AI SDK v5 message validation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/streaming
 * 
 * Note: Sanitization removed - AI SDK v5 handles validation via safeValidateUIMessages()
 */

import { z } from 'zod';

// ============================================
// Zod Schemas (runtime validation when needed)
// ============================================

const TextPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1).catch(''),
}).strip();

const ReasoningPartSchema = z.object({
  type: z.literal('reasoning'),
  text: z.string().optional(),
}).strip();

// Generic tool part: type starts with "tool-" and must have a string toolCallId
const ToolBaseSchema = z.object({
  type: z.string().regex(/^tool-/),
  toolCallId: z.string().min(1),
  // Keep fields commonly used by UI/SDK
  input: z.any().optional(),
  output: z.any().optional(),
  result: z.any().optional(),
  state: z.string().optional(),
  errorText: z.string().optional(),
}).strip();

// For validation-only purposes we allow any specific tool-* type via regex above
export const UIPartSchema = z.union([
  TextPartSchema,
  ReasoningPartSchema,
  ToolBaseSchema,
]);

export const UIMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(UIPartSchema),
  metadata: z.record(z.any()).optional(),
}).strip();
