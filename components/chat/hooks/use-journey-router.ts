/**
 * Feature: Enhanced Journey Router
 * Purpose: Dynamic journey routing with middleware and state management
 * Microservices: Thin orchestration layer using journey registry
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Journey Registry: lib/journeys/registry.ts
 *  - Microservices Architecture: /micro.plan.md
 */

"use client";

import { useEffect, useRef, useCallback } from 'react';
import { getJourneyRegistry } from '@/lib/journeys/registry';
import { getEventBus } from '@/lib/journeys/utils/event-emitter';
import { getStorage } from '@/lib/journeys/utils/state-manager';
import type { Journey, ToolPart, JourneyMiddleware } from '@/lib/journeys/types/journey-contracts';

interface JourneyMap {
  location: Journey;
  creative: Journey;
  copy: Journey;
  goal: Journey;
  campaign: Journey;
  [key: string]: Journey;
}

interface UseJourneyRouterOptions {
  /**
   * Enable state persistence
   */
  persistState?: boolean;

  /**
   * Enable event bus communication
   */
  enableEvents?: boolean;

  /**
   * Additional middleware to apply
   */
  middleware?: JourneyMiddleware[];

  /**
   * Callback when journey is not found for a tool
   */
  onJourneyNotFound?: (toolName: string) => void;
}

/**
 * Enhanced Journey Router Hook
 * 
 * Features:
 * - Dynamic journey registration from map or registry
 * - Middleware support (logging, error handling, etc.)
 * - State persistence via storage
 * - Event bus for cross-journey communication
 * 
 * @example
 * ```typescript
 * const { routeToJourney } = useJourneyRouter({
 *   location: LocationJourney(),
 *   creative: CreativeJourney(),
 * }, {
 *   persistState: true,
 *   enableEvents: true,
 * });
 * ```
 */
export function useJourneyRouter(
  journeys: JourneyMap,
  options: UseJourneyRouterOptions = {}
) {
  const {
    persistState = false,
    enableEvents = false,
    middleware = [],
    onJourneyNotFound,
  } = options;

  const registry = getJourneyRegistry();
  const eventBus = getEventBus();
  const storage = getStorage();
  const registeredJourneysRef = useRef(new Set<string>());

  // Register journeys on mount
  useEffect(() => {
    console.log('[JourneyRouter] Registering journeys:', Object.keys(journeys));

    for (const [id, journey] of Object.entries(journeys)) {
      // Skip if already registered
      if (registeredJourneysRef.current.has(id)) {
        continue;
      }

      // Register with registry for dynamic lookup
      try {
        registry.register({
          id,
          factory: () => journey,
          toolNames: extractToolNamesForJourney(id),
          priority: 1,
        });

        registeredJourneysRef.current.add(id);
        console.log(`[JourneyRouter] ✅ Registered journey: ${id}`);
      } catch (error) {
        console.error(`[JourneyRouter] Failed to register journey ${id}:`, error);
      }
    }

    // Add middleware
    for (const mw of middleware) {
      registry.addMiddleware(mw);
    }

    // Cleanup on unmount
    return () => {
      for (const id of registeredJourneysRef.current) {
        try {
          registry.unregister(id);
        } catch (error) {
          console.error(`[JourneyRouter] Failed to unregister journey ${id}:`, error);
        }
      }
      registeredJourneysRef.current.clear();

      // Remove middleware
      for (const mw of middleware) {
        registry.removeMiddleware(mw.name);
      }
    };
  }, [journeys, middleware, registry]);

  // Load persisted state for journeys
  useEffect(() => {
    if (!persistState) return;

    for (const [id, journey] of Object.entries(journeys)) {
      if (!journey.setState) continue;

      try {
        const savedState = storage.get(id);
        if (savedState) {
          journey.setState(savedState);
          console.log(`[JourneyRouter] Restored state for journey: ${id}`);
        }
      } catch (error) {
        console.error(`[JourneyRouter] Failed to restore state for ${id}:`, error);
      }
    }
  }, [journeys, persistState, storage]);

  // Save state when journeys change (if persistence enabled)
  useEffect(() => {
    if (!persistState) return;

    const interval = setInterval(() => {
      for (const [id, journey] of Object.entries(journeys)) {
        if (!journey.getState) continue;

        try {
          const state = journey.getState();
          if (state) {
            storage.set(id, state);
          }
        } catch (error) {
          console.error(`[JourneyRouter] Failed to save state for ${id}:`, error);
        }
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(interval);
  }, [journeys, persistState, storage]);

  /**
   * Route tool part to appropriate journey
   */
  const routeToJourney = useCallback((part: ToolPart): React.ReactNode => {
    // Extract tool name from type (remove 'tool-' prefix)
    const toolName = part.type.startsWith('tool-')
      ? part.type.slice(5)
      : part.type;

    console.debug(`[JourneyRouter] Routing tool: ${toolName}`, { type: part.type });

    // Try to get journey from registry first (most flexible)
    let journey = registry.getJourneyForTool(toolName);

    // Fallback to legacy hardcoded routing if not found in registry
    if (!journey) {
      journey = legacyRouteToJourney(toolName, journeys);
    }

    if (!journey) {
      console.warn(`[JourneyRouter] ⚠️ No journey found for tool: ${toolName}`);
      onJourneyNotFound?.(toolName);
      return null;
    }

    // Render through middleware (if any)
    try {
      const result = (registry as unknown as { applyMiddleware: (p: ToolPart, j: Journey, r: () => React.ReactNode) => React.ReactNode }).applyMiddleware(
        part,
        journey,
        () => journey.renderTool(part)
      );

      // Emit event if enabled
      if (enableEvents) {
        eventBus.emit('journey:tool-rendered', {
          journeyId: journey.id,
          toolName,
          toolCallId: part.toolCallId,
        }, journey.id);
      }

      return result;
    } catch (error) {
      console.error(`[JourneyRouter] Error rendering tool ${toolName}:`, error);

      // Emit error event
      if (enableEvents) {
        eventBus.emit('journey:tool-error', {
          journeyId: journey.id,
          toolName,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, journey.id);
      }

      return null;
    }
  }, [journeys, registry, eventBus, enableEvents, onJourneyNotFound]);

  /**
   * Get journey by ID
   */
  const getJourney = useCallback((journeyId: string): Journey | undefined => {
    return journeys[journeyId] || registry.getJourney(journeyId);
  }, [journeys, registry]);

  /**
   * Reset all journey states
   */
  const resetAllJourneys = useCallback(() => {
    for (const journey of Object.values(journeys)) {
      if (journey.reset) {
        journey.reset();
      }
    }

    if (persistState) {
      storage.clear();
    }

    console.log('[JourneyRouter] Reset all journeys');
  }, [journeys, persistState, storage]);

  return {
    routeToJourney,
    getJourney,
    resetAllJourneys,
  };
}

/**
 * Legacy routing logic (backward compatibility)
 * Maps tool names to journey IDs using hardcoded patterns
 */
function legacyRouteToJourney(toolName: string, journeys: JourneyMap): Journey | undefined {
  const lowerTool = toolName.toLowerCase();

  // Location journey
  if (lowerTool.includes('location') || toolName === 'addLocations' || toolName === 'removeLocation' || toolName === 'clearLocations') {
    return journeys.location;
  }

  // Creative journey
  if (lowerTool.includes('variation') || lowerTool.includes('image') || toolName === 'generateVariations' || toolName === 'selectVariation' || toolName === 'editVariation' || toolName === 'regenerateVariation' || toolName === 'deleteVariation') {
    return journeys.creative;
  }

  // Copy journey
  if (lowerTool.includes('copy') || toolName === 'editCopy' || toolName === 'generateCopyVariations' || toolName === 'selectCopyVariation' || toolName === 'refineHeadline' || toolName === 'refinePrimaryText' || toolName === 'refineDescription') {
    return journeys.copy;
  }

  // Goal journey
  if (lowerTool.includes('goal') || toolName === 'setupGoal') {
    return journeys.goal;
  }

  // Campaign journey (ad operations)
  if (lowerTool.includes('ad') || toolName === 'createAd' || toolName === 'deleteAd' || toolName === 'duplicateAd' || toolName === 'renameAd') {
    return journeys.campaign;
  }

  // Destination journey
  if (lowerTool.includes('destination') || toolName === 'setupDestination') {
    return journeys.destination;
  }

  // Budget journey
  if (lowerTool.includes('budget') || lowerTool.includes('schedule') || 
      toolName === 'setBudget' || toolName === 'setSchedule' || toolName === 'selectAdAccount') {
    return journeys.budget;
  }

  // Analytics journey
  if (lowerTool.includes('analytics') || lowerTool.includes('metrics') || 
      lowerTool.includes('demographics') || toolName === 'explainMetrics' || 
      toolName === 'comparePerformance' || toolName === 'analyzeDemographics') {
    return journeys.analytics;
  }

  // Results journey
  if (lowerTool.includes('results') || lowerTool.includes('interpret') || 
      lowerTool.includes('optimization') || lowerTool.includes('export') ||
      toolName === 'interpretResults' || toolName === 'suggestOptimizations' || toolName === 'exportLeads') {
    return journeys.results;
  }

  // Meta journey
  if (lowerTool.includes('meta') || lowerTool.includes('connect') || 
      lowerTool.includes('business') || lowerTool.includes('payment') ||
      toolName === 'connectMeta' || toolName === 'selectBusiness' || 
      toolName === 'selectPage' || toolName === 'verifyPayment') {
    return journeys.meta;
  }

  return undefined;
}

/**
 * Extract tool names based on journey ID
 * Used for registry registration
 */
function extractToolNamesForJourney(journeyId: string): string[] {
  const toolMap: Record<string, string[]> = {
    location: ['addLocations', 'removeLocation', 'clearLocations'],
    creative: ['generateVariations', 'selectVariation', 'editVariation', 'regenerateVariation', 'deleteVariation'],
    copy: ['generateCopyVariations', 'selectCopyVariation', 'editCopy', 'refineHeadline', 'refinePrimaryText', 'refineDescription'],
    goal: ['setupGoal'],
    campaign: ['createAd', 'renameAd', 'duplicateAd', 'deleteAd'],
    destination: ['setupDestination'],
    budget: ['setBudget', 'setSchedule', 'selectAdAccount'],
    analytics: ['explainMetrics', 'comparePerformance', 'analyzeDemographics'],
    results: ['interpretResults', 'suggestOptimizations', 'exportLeads'],
    meta: ['connectMeta', 'selectBusiness', 'selectPage', 'selectAdAccount', 'verifyPayment'],
  };

  return toolMap[journeyId] || [];
}

