/**
 * Feature: Journey Registry
 * Purpose: Central registry for managing all journey implementations
 * References:
 *  - Microservices Architecture: /micro.plan.md
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

import type {
  Journey,
  JourneyRegistry,
  JourneyRegistration,
  JourneyMiddleware,
  ToolPart,
} from './types/journey-contracts';

/**
 * Journey Registry Implementation
 * 
 * Manages lifecycle of all journeys in the application.
 * Provides dynamic journey loading, middleware support, and tool routing.
 */
class JourneyRegistryImpl implements JourneyRegistry {
  private journeys: Map<string, Journey> = new Map();
  private registrations: Map<string, JourneyRegistration> = new Map();
  private toolToJourneyMap: Map<string, string> = new Map();
  private middlewares: JourneyMiddleware[] = [];

  /**
   * Register a journey
   */
  register(registration: JourneyRegistration): void {
    // Validate registration
    if (!registration.id) {
      throw new Error('Journey registration must have an id');
    }

    if (!registration.factory) {
      throw new Error(`Journey ${registration.id} must have a factory function`);
    }

    // Check for duplicate registration
    if (this.registrations.has(registration.id)) {
      console.warn(`[JourneyRegistry] Journey ${registration.id} already registered, overwriting`);
    }

    // Store registration
    this.registrations.set(registration.id, registration);

    // Create journey instance
    const journey = registration.factory();
    journey.id = registration.id; // Ensure ID is set
    this.journeys.set(registration.id, journey);

    // Map tool names to journey
    if (registration.toolNames) {
      for (const toolName of registration.toolNames) {
        this.toolToJourneyMap.set(toolName, registration.id);
      }
    }

    console.log(`[JourneyRegistry] ✅ Registered journey: ${registration.id}`, {
      tools: registration.toolNames,
      dependencies: registration.dependencies,
      priority: registration.priority,
    });
  }

  /**
   * Unregister a journey
   */
  unregister(journeyId: string): void {
    const registration = this.registrations.get(journeyId);
    
    if (!registration) {
      console.warn(`[JourneyRegistry] Journey ${journeyId} not found for unregistration`);
      return;
    }

    // Remove tool mappings
    if (registration.toolNames) {
      for (const toolName of registration.toolNames) {
        this.toolToJourneyMap.delete(toolName);
      }
    }

    // Call deactivate if journey supports it
    const journey = this.journeys.get(journeyId);
    if (journey?.onDeactivate) {
      try {
        journey.onDeactivate();
      } catch (error) {
        console.error(`[JourneyRegistry] Error deactivating journey ${journeyId}:`, error);
      }
    }

    // Remove journey
    this.journeys.delete(journeyId);
    this.registrations.delete(journeyId);

    console.log(`[JourneyRegistry] ❌ Unregistered journey: ${journeyId}`);
  }

  /**
   * Get journey by ID
   */
  getJourney(journeyId: string): Journey | undefined {
    return this.journeys.get(journeyId);
  }

  /**
   * Get journey by tool name
   */
  getJourneyForTool(toolName: string): Journey | undefined {
    // Extract base tool name (remove 'tool-' prefix if present)
    const baseToolName = toolName.startsWith('tool-')
      ? toolName.slice(5)
      : toolName;

    const journeyId = this.toolToJourneyMap.get(baseToolName);
    
    if (!journeyId) {
      console.debug(`[JourneyRegistry] No journey found for tool: ${toolName}`);
      return undefined;
    }

    return this.journeys.get(journeyId);
  }

  /**
   * Get all registered journeys
   */
  getAllJourneys(): Journey[] {
    return Array.from(this.journeys.values());
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware: JourneyMiddleware): void {
    if (!middleware.name) {
      throw new Error('Middleware must have a name');
    }

    // Check for duplicate
    const existing = this.middlewares.find(m => m.name === middleware.name);
    if (existing) {
      console.warn(`[JourneyRegistry] Middleware ${middleware.name} already exists, overwriting`);
      this.removeMiddleware(middleware.name);
    }

    this.middlewares.push(middleware);
    console.log(`[JourneyRegistry] ✅ Added middleware: ${middleware.name}`);
  }

  /**
   * Remove middleware
   */
  removeMiddleware(middlewareName: string): void {
    const index = this.middlewares.findIndex(m => m.name === middlewareName);
    
    if (index === -1) {
      console.warn(`[JourneyRegistry] Middleware ${middlewareName} not found`);
      return;
    }

    this.middlewares.splice(index, 1);
    console.log(`[JourneyRegistry] ❌ Removed middleware: ${middlewareName}`);
  }

  /**
   * Apply middleware to tool rendering
   * Internal method used by journey router
   */
  applyMiddleware(part: ToolPart, journey: Journey, renderFn: () => React.ReactNode): React.ReactNode {
    // Apply beforeRender middleware
    let modifiedPart = part;
    for (const middleware of this.middlewares) {
      if (middleware.beforeRender) {
        try {
          const result = middleware.beforeRender(modifiedPart, journey);
          if (result === null) {
            // Middleware blocked rendering
            console.debug(`[JourneyRegistry] Middleware ${middleware.name} blocked rendering`);
            return null;
          }
          modifiedPart = result;
        } catch (error) {
          console.error(`[JourneyRegistry] Error in beforeRender middleware ${middleware.name}:`, error);
          if (middleware.onError) {
            middleware.onError(error as Error, journey, { phase: 'beforeRender', part });
          }
        }
      }
    }

    // Render tool
    let result: React.ReactNode;
    try {
      result = renderFn();
    } catch (error) {
      console.error(`[JourneyRegistry] Error rendering tool:`, error);
      
      // Call error middleware
      for (const middleware of this.middlewares) {
        if (middleware.onError) {
          middleware.onError(error as Error, journey, { phase: 'render', part: modifiedPart });
        }
      }
      
      throw error;
    }

    // Apply afterRender middleware
    for (const middleware of this.middlewares) {
      if (middleware.afterRender) {
        try {
          result = middleware.afterRender(modifiedPart, journey, result);
        } catch (error) {
          console.error(`[JourneyRegistry] Error in afterRender middleware ${middleware.name}:`, error);
          if (middleware.onError) {
            middleware.onError(error as Error, journey, { phase: 'afterRender', part: modifiedPart });
          }
        }
      }
    }

    return result;
  }

  /**
   * Activate a journey
   * Calls onActivate and middleware hooks
   */
  activateJourney(journeyId: string): void {
    const journey = this.journeys.get(journeyId);
    
    if (!journey) {
      console.warn(`[JourneyRegistry] Cannot activate journey ${journeyId}: not found`);
      return;
    }

    // Call journey's onActivate
    if (journey.onActivate) {
      try {
        journey.onActivate();
      } catch (error) {
        console.error(`[JourneyRegistry] Error activating journey ${journeyId}:`, error);
      }
    }

    // Call middleware onActivate
    for (const middleware of this.middlewares) {
      if (middleware.onActivate) {
        try {
          middleware.onActivate(journey);
        } catch (error) {
          console.error(`[JourneyRegistry] Error in middleware ${middleware.name} onActivate:`, error);
        }
      }
    }

    console.log(`[JourneyRegistry] ✅ Activated journey: ${journeyId}`);
  }

  /**
   * Deactivate a journey
   * Calls onDeactivate and middleware hooks
   */
  deactivateJourney(journeyId: string): void {
    const journey = this.journeys.get(journeyId);
    
    if (!journey) {
      console.warn(`[JourneyRegistry] Cannot deactivate journey ${journeyId}: not found`);
      return;
    }

    // Call journey's onDeactivate
    if (journey.onDeactivate) {
      try {
        journey.onDeactivate();
      } catch (error) {
        console.error(`[JourneyRegistry] Error deactivating journey ${journeyId}:`, error);
      }
    }

    // Call middleware onDeactivate
    for (const middleware of this.middlewares) {
      if (middleware.onDeactivate) {
        try {
          middleware.onDeactivate(journey);
        } catch (error) {
          console.error(`[JourneyRegistry] Error in middleware ${middleware.name} onDeactivate:`, error);
        }
      }
    }

    console.log(`[JourneyRegistry] ✅ Deactivated journey: ${journeyId}`);
  }

  /**
   * Get middleware list (for debugging)
   */
  getMiddlewares(): readonly JourneyMiddleware[] {
    return this.middlewares;
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    // Deactivate all journeys
    for (const journeyId of this.journeys.keys()) {
      this.deactivateJourney(journeyId);
    }

    this.journeys.clear();
    this.registrations.clear();
    this.toolToJourneyMap.clear();
    this.middlewares = [];

    console.log(`[JourneyRegistry] 🔄 Cleared all registrations`);
  }
}

// Singleton instance
const journeyRegistry = new JourneyRegistryImpl();

/**
 * Get the global journey registry instance
 */
export function getJourneyRegistry(): JourneyRegistry {
  return journeyRegistry;
}

/**
 * Convenience function to register a journey
 */
export function registerJourney(registration: JourneyRegistration): void {
  journeyRegistry.register(registration);
}

/**
 * Convenience function to unregister a journey
 */
export function unregisterJourney(journeyId: string): void {
  journeyRegistry.unregister(journeyId);
}

/**
 * Create a journey registration helper
 */
export function createJourneyRegistration(
  id: string,
  factory: () => Journey,
  options?: Partial<Omit<JourneyRegistration, 'id' | 'factory'>>
): JourneyRegistration {
  return {
    id,
    factory,
    ...options,
  };
}

// Export singleton instance
export { journeyRegistry };

