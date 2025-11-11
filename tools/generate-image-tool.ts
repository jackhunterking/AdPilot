import { tool } from 'ai';
import { z } from 'zod';

export const generateImageTool = tool({
  description: 'Generate 3 plan-driven creative variations for a Meta ad. Use after a CreativePlan is available. Variations can include: people/no-people, product/service focus, and text densities up to text-only. Keep edges clean (no frames/labels) and produce both square and vertical; vertical reuses the same base image with extended canvas (blur/gradient/solid) and reflowed overlays. No brand logos/colors.',
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

