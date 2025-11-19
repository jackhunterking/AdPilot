/**
 * Feature: Tool Part Utilities
 * Purpose: Extract tool names from AI SDK v5 tool parts
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

/**
 * Extract tool name from AI SDK v5 tool part type
 * 
 * AI SDK v5 has two types of tool parts:
 * 1. ToolUIPart: type is 'tool-{name}', no separate toolName field
 * 2. DynamicToolUIPart: type is 'dynamic-tool', has toolName field
 * 
 * @param part - Tool part with type 'tool-{name}' or 'dynamic-tool'
 * @returns Tool name string or 'unknown'
 */
export function extractToolName(part: { type: string; toolName?: string }): string {
  // DynamicToolUIPart has separate toolName field
  if (part.toolName && typeof part.toolName === 'string') {
    return part.toolName;
  }
  
  // ToolUIPart has name encoded in type: 'tool-{name}'
  if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
    return part.type.slice(5); // Remove 'tool-' prefix
  }
  
  return 'unknown';
}

/**
 * Check if a part is a tool part (either specific or dynamic)
 */
export function isToolPart(part: { type?: string }): boolean {
  return typeof part.type === 'string' && part.type.startsWith('tool-');
}

/**
 * Check if a tool part has output/result (is completed)
 */
export function hasToolOutput(part: unknown): boolean {
  const p = part as { output?: unknown; result?: unknown };
  return p.output !== undefined || p.result !== undefined;
}

