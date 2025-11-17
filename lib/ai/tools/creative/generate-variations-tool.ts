/**
 * Feature: Generate Image Tool
 * Purpose: Generate 3 creative variations for Meta ads
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-definition
 *  - AI Elements: https://ai-sdk.dev/elements/tool#overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway#usage
 */

import { tool } from 'ai';
import { z } from 'zod';

export const generateVariationsTool = tool({
  description: 'Generate 3 creative variations for Meta ad. Creates diverse visual styles with different approaches. Use when user wants new creatives from scratch or is on creative step. Variations include people/no-people, product/service focus, and text densities. Keep edges clean (no frames/labels). Produce both square and vertical formats.',
  inputSchema: z.object({
    prompt: z.string().describe('Detailed visual description for the Meta ad creative. Focus on subject, setting, mood, and composition. Be specific about desired realism and authenticity. The AI will automatically create 3 unique variations from this prompt.'),
    brandName: z.string().optional().describe('Brand name to display in the social media preview (not burned into the image)'),
    caption: z.string().optional().describe('Caption text for the social media post preview (not burned into the image)'),
  }),
  // No execute function - tool execution is handled client-side
  // Per AI SDK docs: "execute is optional because you might want to forward 
  // tool calls to the client or to a queue instead of executing them in the same process"
  // This keeps the tool in 'input-available' state until client calls addToolResult
});

