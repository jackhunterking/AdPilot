/**
 * Feature: AI Tools Master Export
 * Purpose: Centralized export point for all granular AI tools
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

// Export all tool categories
export * as creative from './creative';
export * as copy from './copy';
export * as targeting from './targeting';
export * as campaign from './campaign';
export * as goal from './goal';

// Re-export for backward compatibility (temporary during migration)
export { generateVariationsTool as generateImageTool } from './creative/generate-variations-tool';
export { editVariationTool as editImageTool } from './creative/edit-variation-tool';
export { regenerateVariationTool as regenerateImageTool } from './creative/regenerate-variation-tool';
export { editCopyTool as editAdCopyTool } from './copy/edit-copy-tool';
export { addLocationsTool as locationTargetingTool } from './targeting/add-locations-tool';
export { createAdTool } from './campaign/create-ad-tool';
export { setupGoalTool } from './goal/setup-goal-tool';

