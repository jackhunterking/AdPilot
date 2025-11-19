/**
 * Feature: AI Tool Registry Service
 * Purpose: Dynamic tool loading, filtering, and locking
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Microservices: Extracted from app/api/v1/chat/route.ts
 */

import type { Tool } from 'ai';
import * as creativeTools from '@/lib/ai/tools/creative';
import * as copyTools from '@/lib/ai/tools/copy';
import * as targetingTools from '@/lib/ai/tools/targeting';
import * as campaignTools from '@/lib/ai/tools/campaign';
import * as goalTools from '@/lib/ai/tools/goal';

// ============================================================================
// Types
// ============================================================================

export interface ToolContext {
  currentStep?: string | null;
  isEditMode?: boolean;
  editingReference?: {
    variationIndex?: number;
    imageUrl?: string;
    sessionId?: string;
  };
}

export type ToolRegistry = Record<string, Tool<unknown, unknown>>;

// ============================================================================
// Tool Registry Service
// ============================================================================

export class ToolRegistryService {
  /**
   * Get all available tools
   */
  getAllTools(): ToolRegistry {
    return {
      // Creative operations
      generateVariations: creativeTools.generateVariationsTool as unknown as Tool<unknown, unknown>,
      selectVariation: creativeTools.selectVariationTool as unknown as Tool<unknown, unknown>,
      editVariation: creativeTools.editVariationTool as unknown as Tool<unknown, unknown>,
      regenerateVariation: creativeTools.regenerateVariationTool as unknown as Tool<unknown, unknown>,
      deleteVariation: creativeTools.deleteVariationTool as unknown as Tool<unknown, unknown>,
      
      // Copy operations  
      generateCopyVariations: copyTools.generateCopyVariationsTool as unknown as Tool<unknown, unknown>,
      selectCopyVariation: copyTools.selectCopyVariationTool as unknown as Tool<unknown, unknown>,
      editCopy: copyTools.editCopyTool as unknown as Tool<unknown, unknown>,
      refineHeadline: copyTools.refineHeadlineTool as unknown as Tool<unknown, unknown>,
      refinePrimaryText: copyTools.refinePrimaryTextTool as unknown as Tool<unknown, unknown>,
      refineDescription: copyTools.refineDescriptionTool as unknown as Tool<unknown, unknown>,
      
      // Targeting operations
      addLocations: targetingTools.addLocationsTool as unknown as Tool<unknown, unknown>,
      removeLocation: targetingTools.removeLocationTool as unknown as Tool<unknown, unknown>,
      clearLocations: targetingTools.clearLocationsTool as unknown as Tool<unknown, unknown>,
      
      // Campaign operations
      createAd: campaignTools.createAdTool as unknown as Tool<unknown, unknown>,
      renameAd: campaignTools.renameAdTool as unknown as Tool<unknown, unknown>,
      duplicateAd: campaignTools.duplicateAdTool as unknown as Tool<unknown, unknown>,
      deleteAd: campaignTools.deleteAdTool as unknown as Tool<unknown, unknown>,
      
      // Goal operations
      setupGoal: goalTools.setupGoalTool as unknown as Tool<unknown, unknown>,
    };
  }

  /**
   * Get tools filtered by context
   */
  getTools(context: ToolContext): ToolRegistry {
    const allTools = this.getAllTools();

    // If in edit mode, apply tool locking
    if (context.isEditMode && context.editingReference) {
      return this.applyEditModeLocks(allTools, context.editingReference);
    }

    return allTools;
  }

  /**
   * Apply edit mode locks to tools
   * Locks variationIndex and imageUrl to prevent accidents
   */
  private applyEditModeLocks(
    tools: ToolRegistry,
    locked: {
      variationIndex?: number;
      imageUrl?: string;
      sessionId?: string;
    }
  ): ToolRegistry {
    const lockedTools = { ...tools };

    if (typeof locked.variationIndex === 'number') {
      // Override editVariation execution
      lockedTools.editVariation = {
        ...creativeTools.editVariationTool,
        execute: async (input: unknown, ctx: unknown) => {
          const provided = input as { variationIndex?: number; imageUrl?: string };
          const enforced = { 
            ...provided, 
            variationIndex: locked.variationIndex, 
            imageUrl: locked.imageUrl 
          };
          
          console.log('[LOCK] editVariation enforced:', { locked, provided });
          
          const exec = (creativeTools.editVariationTool as unknown as { 
            execute: (i: unknown, c: unknown) => Promise<unknown> 
          }).execute;
          
          const result = await exec(enforced, ctx);
          return { 
            ...(result as object), 
            variationIndex: locked.variationIndex, 
            sessionId: locked.sessionId 
          };
        }
      } as unknown as Tool<unknown, unknown>;

      // Override regenerateVariation execution
      lockedTools.regenerateVariation = {
        ...creativeTools.regenerateVariationTool,
        execute: async (input: unknown, ctx: unknown) => {
          const provided = input as { variationIndex?: number };
          const enforced = { ...provided, variationIndex: locked.variationIndex };
          
          console.log('[LOCK] regenerateVariation enforced:', locked.variationIndex);
          
          const exec = (creativeTools.regenerateVariationTool as unknown as { 
            execute: (i: unknown, c: unknown) => Promise<unknown> 
          }).execute;
          
          const result = await exec(enforced, ctx);
          return { 
            ...(result as object), 
            variationIndex: locked.variationIndex, 
            sessionId: locked.sessionId 
          };
        }
      } as unknown as Tool<unknown, unknown>;

      // Override editCopy execution
      lockedTools.editCopy = {
        ...copyTools.editCopyTool,
        execute: async (input: unknown, ctx: unknown) => {
          const provided = input as { variationIndex?: number };
          const enforced = { ...provided, variationIndex: locked.variationIndex };
          
          const exec = (copyTools.editCopyTool as unknown as { 
            execute: (i: unknown, c: unknown) => Promise<unknown> 
          }).execute;
          
          const result = await exec(enforced, ctx);
          return { 
            ...(result as object), 
            variationIndex: locked.variationIndex, 
            sessionId: locked.sessionId 
          };
        }
      } as unknown as Tool<unknown, unknown>;
    }

    return lockedTools;
  }

  /**
   * Build core behavior instructions
   */
  private buildCoreBehavior(): string {
    return `## Core Behavior: Smart Conversation, Then Action
- Ask ONE helpful question that gathers details
- Be decisive - use tools when you have context
- Be friendly, brief, enthusiastic`;
  }

  /**
   * Build tool usage rules
   */
  private buildToolUsageRules(): string {
    return `## Tool Usage Rules
- NEVER mix creative and build tools
- ONE tool category per response
- Use granular tools for specific operations`;
  }
}

// Export singleton
export const toolRegistryService = new ToolRegistryService();

