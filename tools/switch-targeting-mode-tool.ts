/**
 * Feature: Switch Targeting Mode Tool
 * Purpose: AI Chat tool for switching between AI Advantage+ and Manual targeting modes
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const switchTargetingModeTool = tool({
  description: `Switch between AI Advantage+ and Manual targeting modes with conversational guidance.
  
  Use this tool when:
  - User clicks "Switch to Manual Targeting" button from AI Advantage+ mode
  - User clicks "Switch to AI Advantage+" button from Manual targeting mode
  - User explicitly requests to change their targeting mode
  
  The tool will:
  1. Acknowledge the mode switch
  2. Inform user that previous targeting data will be cleared
  3. Provide appropriate guidance for the new mode:
     - For AI Advantage+: Explain automatic optimization benefits
     - For Manual: Start conversational targeting flow with first question
  
  IMPORTANT: This tool provides guidance only. The actual state change is handled by the audience context via event listener.`,
  
  inputSchema: z.object({
    newMode: z.enum(['ai', 'manual']).describe('The targeting mode to switch to'),
    currentMode: z.enum(['ai', 'manual']).describe('The current targeting mode'),
  }),
  
  execute: async (input, { toolCallId }) => {
    if (input.newMode === 'ai') {
      // Switching to AI Advantage+
      return {
        success: true,
        newMode: 'ai',
        currentMode: input.currentMode,
        toolCallId,
        message: `Switching to AI Advantage+ targeting! Your manual targeting parameters will be cleared. Meta's AI will now automatically find and show your ads to people most likely to engage, optimizing for the best results. This typically delivers 22% better ROAS. You're all set!`,
      };
    } else {
      // Switching to Manual targeting
      return {
        success: true,
        newMode: 'manual',
        currentMode: input.currentMode,
        toolCallId,
        message: `I'll help you set up manual targeting. Your AI Advantage+ settings will be cleared. Let's start by defining the age range for your ideal customers. What age group would you like to target? (e.g., 18-25, 26-35)`,
      };
    }
  },
});

