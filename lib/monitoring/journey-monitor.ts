/**
 * Feature: Journey Monitoring
 * Purpose: Track journey completion, errors, and performance
 * References:
 *  - Event Bus: lib/journeys/utils/event-emitter.ts
 */

import { getEventBus } from '@/lib/journeys/utils/event-emitter';
import type { JourneyEvent } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Types
// ============================================================================

export interface JourneyMetric {
  journeyId: string;
  event: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface JourneyStats {
  journeyId: string;
  completions: number;
  errors: number;
  avgDuration: number;
  lastCompleted?: number;
}

// ============================================================================
// Journey Monitor
// ============================================================================

export class JourneyMonitor {
  private metrics: JourneyMetric[] = [];
  private stats: Map<string, JourneyStats> = new Map();
  private startTimes: Map<string, number> = new Map();

  constructor() {
    this.setupListeners();
  }

  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    const eventBus = getEventBus();

    // Track journey activations
    eventBus.on('journey:activated', (event: JourneyEvent) => {
      this.startTimes.set(event.journeyId, Date.now());
      this.recordMetric(event.journeyId, 'activated');
    });

    // Track journey completions
    eventBus.on('journey:completed', (event: JourneyEvent) => {
      const startTime = this.startTimes.get(event.journeyId);
      const duration = startTime ? Date.now() - startTime : undefined;
      
      this.recordMetric(event.journeyId, 'completed', duration);
      this.updateStats(event.journeyId, 'completion', duration);
      
      this.startTimes.delete(event.journeyId);
    });

    // Track journey errors
    eventBus.on('journey:error', (event: JourneyEvent) => {
      this.recordMetric(event.journeyId, 'error', undefined, {
        error: event.payload,
      });
      this.updateStats(event.journeyId, 'error');
    });

    // Track tool renderings
    eventBus.on('journey:tool-rendered', (event: JourneyEvent) => {
      this.recordMetric(event.journeyId, 'tool-rendered', undefined, {
        toolName: (event.payload as { toolName?: string }).toolName,
      });
    });
  }

  /**
   * Record a metric
   */
  private recordMetric(
    journeyId: string,
    event: string,
    duration?: number,
    metadata?: Record<string, unknown>
  ): void {
    const metric: JourneyMetric = {
      journeyId,
      event,
      timestamp: Date.now(),
      duration,
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    console.log('[JourneyMonitor]', event, { journeyId, duration, metadata });
  }

  /**
   * Update statistics
   */
  private updateStats(
    journeyId: string,
    type: 'completion' | 'error',
    duration?: number
  ): void {
    let stats = this.stats.get(journeyId);

    if (!stats) {
      stats = {
        journeyId,
        completions: 0,
        errors: 0,
        avgDuration: 0,
      };
      this.stats.set(journeyId, stats);
    }

    if (type === 'completion') {
      stats.completions++;
      stats.lastCompleted = Date.now();
      
      if (duration !== undefined) {
        // Update rolling average
        stats.avgDuration = 
          (stats.avgDuration * (stats.completions - 1) + duration) / stats.completions;
      }
    } else if (type === 'error') {
      stats.errors++;
    }
  }

  /**
   * Track journey activation
   */
  trackActivation(journeyId: string): void {
    this.startTimes.set(journeyId, Date.now());
    const metric: JourneyMetric = {
      journeyId,
      event: 'activated',
      timestamp: Date.now(),
    };
    this.metrics.push(metric);
  }

  /**
   * Track journey completion
   */
  trackCompletion(journeyId: string): void {
    const startTime = this.startTimes.get(journeyId);
    const duration = startTime ? Date.now() - startTime : undefined;
    
    const metric: JourneyMetric = {
      journeyId,
      event: 'completed',
      timestamp: Date.now(),
      duration,
    };
    this.metrics.push(metric);
    
    if (startTime) {
      this.startTimes.delete(journeyId);
    }
  }

  /**
   * Get stats for a journey
   */
  getStats(journeyId: string): JourneyStats | null {
    return this.stats.get(journeyId) || null;
  }

  /**
   * Get all stats
   */
  getAllStats(): JourneyStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit = 100): JourneyMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Export stats for analytics
   */
  exportStats(): Record<string, JourneyStats> {
    const exported: Record<string, JourneyStats> = {};
    
    for (const [journeyId, stats] of this.stats.entries()) {
      exported[journeyId] = { ...stats };
    }

    return exported;
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metrics = [];
    this.stats.clear();
    this.startTimes.clear();
  }
}

// Export singleton
export const journeyMonitor = new JourneyMonitor();

