/**
 * Feature: Chat Message Schemas & Sanitizers
 * Purpose: Enforce AI SDK v5 message part invariants and provide safe sanitization utilities
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/streaming
 */

import { z } from 'zod';
import type { UIMessage } from 'ai';

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

// ============================================
// Sanitizers (drop-invalid, never-throw)
// ============================================

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function sanitizePart(raw: unknown): { type: string; [k: string]: unknown } | null {
  // Guard: must have a string type
  const r = raw as { type?: unknown };
  if (!isString(r?.type as unknown as string)) return null;

  // Non-tool parts
  if (!(r.type as string).startsWith('tool-')) {
    if (r.type === 'text') {
      const text = isString((raw as { text?: unknown }).text as string) ? (raw as { text?: string }).text! : '';
      if (!text) return null;
      return { type: 'text', text };
    }
    if (r.type === 'reasoning') {
      const text = isString((raw as { text?: unknown }).text as string) ? (raw as { text?: string }).text : undefined;
      return { type: 'reasoning', ...(text ? { text } : {}) };
    }
    // Unknown non-tool types are dropped
    return null;
  }

  // Tool parts must have a toolCallId
  if (!isString((raw as { toolCallId?: unknown }).toolCallId as string)) return null;

  const hasOutputOrResult = (raw as { output?: unknown; result?: unknown }).output !== undefined || (raw as { output?: unknown; result?: unknown }).result !== undefined;
  const isToolResult = (r.type as string) === 'tool-result';

  // Only keep complete tool invocations or valid tool-result parts
  if (!(hasOutputOrResult || isToolResult)) return null;

  const part: { type: string; toolCallId: string; [k: string]: unknown } = {
    type: r.type as string,
    toolCallId: (raw as { toolCallId: string }).toolCallId,
  };

  if ((raw as { input?: unknown }).input !== undefined) part.input = (raw as { input?: unknown }).input;
  if ((raw as { output?: unknown }).output !== undefined) part.output = (raw as { output?: unknown }).output;
  if ((raw as { result?: unknown }).result !== undefined) part.result = (raw as { result?: unknown }).result;
  if (isString((raw as { state?: unknown }).state as string)) part.state = (raw as { state?: string }).state;
  if (isString((raw as { errorText?: unknown }).errorText as string)) part.errorText = (raw as { errorText?: string }).errorText;
  // Preserve toolName for tool identification in UI rendering (critical for location cards, etc.)
  if (isString((raw as { toolName?: unknown }).toolName as string)) part.toolName = (raw as { toolName?: string }).toolName;
  // Also preserve 'name' as fallback (some tools use this property)
  if (isString((raw as { name?: unknown }).name as string)) part.name = (raw as { name?: string }).name;

  return part;
}

export function sanitizeParts(parts: unknown): Array<{ type: string; [k: string]: unknown }> {
  const array = Array.isArray(parts) ? parts : [];
  const sanitized: Array<{ type: string; [k: string]: unknown }> = [];
  for (const raw of array) {
    const safe = sanitizePart(raw);
    if (safe) sanitized.push(safe);
  }
  return sanitized;
}

export function sanitizeMessages(messages: UIMessage[]): UIMessage[] {
  const list = Array.isArray(messages) ? messages : [];
  return list.map((m) => {
    const safeParts = sanitizeParts((m as { parts?: unknown }).parts);
    const metadata = (m as { metadata?: unknown }).metadata && typeof (m as { metadata?: unknown }).metadata === 'object' ? (m as { metadata?: Record<string, unknown> }).metadata : undefined;
    return {
      id: String((m as { id?: unknown }).id || ''),
      role: (m as { role: 'user' | 'assistant' | 'system' }).role,
      parts: safeParts,
      ...(metadata ? { metadata } : {}),
    } as UIMessage;
  }).filter((m) => isString(m.id) && (m.role === 'user' || m.role === 'assistant' || m.role === 'system'));
}

// Optional gate (default enabled) for rollout
export function isSanitizerEnabled(): boolean {
  const flag = process.env.CHAT_V5_SANITIZER ?? process.env.NEXT_PUBLIC_CHAT_V5_SANITIZER;
  if (flag === '0' || flag === 'false') return false;
  return true;
}


