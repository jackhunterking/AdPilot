/**
 * Feature: Switch Targeting Mode Tool
 * Purpose: AI Chat tool for switching between AI Advantage+ and Manual targeting modes
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const switchTargetingModeTool = tool({
  description: `Provide feedback when the user switches between AI Advantage+ and Manual targeting modes.
  
  Use this tool when:
  - User switches targeting modes via the canvas button
  - The mode switch has already been completed by the canvas component
  
  The tool provides:
  - Acknowledgment of the mode switch
  - Information about what the new mode means
  - Next steps guidance for the user
  
  IMPORTANT: This tool is INFORMATIONAL ONLY. The actual state change is handled by the canvas button 
  calling the audience context directly. This tool does NOT mutate state - it only provides conversational feedback.`,
  
  inputSchema: z.object({
    newMode: z.enum(['ai', 'manual']).describe('The targeting mode that was switched to'),
    currentMode: z.enum(['ai', 'manual']).describe('The previous targeting mode'),
  }),
  
  execute: async (input, { toolCallId }) => {
    // INFORMATIONAL ONLY - State already updated by canvas
    if (input.newMode === 'ai') {
      // Switched to AI Advantage+
      return {
        success: true,
        message: `Switched to AI Advantage+! Meta's AI will now automatically find and show your ads to people most likely to engage, optimizing for the best results. This typically delivers 22% better ROAS. You're all set!`,
        toolCallId,
      };
    } else {
      // Switched to Manual targeting
      return {
        success: true,
        message: `Switched to manual targeting! I'll help you build your audience. Let's start by defining the age range for your ideal customers. What age group would you like to target? (e.g., 18-25, 26-35)`,
        toolCallId,
      };
    }
  },
});

