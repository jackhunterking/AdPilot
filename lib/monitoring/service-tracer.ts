/**
 * Feature: Service Tracer
 * Purpose: Trace service calls for debugging and performance monitoring
 * References:
 *  - Service Contracts: lib/services/contracts/
 */

// ============================================================================
// Types
// ============================================================================

export interface ServiceTrace {
  serviceName: string;
  method: string;
  input: unknown;
  output?: unknown;
  error?: unknown;
  duration: number;
  timestamp: number;
  success: boolean;
}

// ============================================================================
// Service Tracer
// ============================================================================

export class ServiceTracer {
  private traces: ServiceTrace[] = [];
  private enabled = process.env.NODE_ENV === 'development';

  /**
   * Trace a service call
   */
  async trace<TInput, TOutput>(
    serviceName: string,
    method: string,
    input: TInput,
    fn: () => Promise<TOutput>
  ): Promise<TOutput> {
    if (!this.enabled) {
      return fn();
    }

    const startTime = Date.now();
    const timestamp = startTime;

    try {
      const output = await fn();
      const duration = Date.now() - startTime;

      this.recordTrace({
        serviceName,
        method,
        input,
        output,
        duration,
        timestamp,
        success: true,
      });

      console.log(`[ServiceTracer] ${serviceName}.${method}`, {
        duration: `${duration}ms`,
        success: true,
      });

      return output;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordTrace({
        serviceName,
        method,
        input,
        error,
        duration,
        timestamp,
        success: false,
      });

      console.error(`[ServiceTracer] ${serviceName}.${method}`, {
        duration: `${duration}ms`,
        success: false,
        error,
      });

      throw error;
    }
  }

  /**
   * Record a trace
   */
  private recordTrace(trace: ServiceTrace): void {
    this.traces.push(trace);

    // Keep only last 500 traces
    if (this.traces.length > 500) {
      this.traces.shift();
    }
  }

  /**
   * Get all traces
   */
  getTraces(): ServiceTrace[] {
    return [...this.traces];
  }

  /**
   * Get traces for specific service
   */
  getTracesForService(serviceName: string): ServiceTrace[] {
    return this.traces.filter(t => t.serviceName === serviceName);
  }

  /**
   * Get slow calls (> threshold ms)
   */
  getSlowCalls(threshold = 1000): ServiceTrace[] {
    return this.traces.filter(t => t.duration > threshold);
  }

  /**
   * Get failed calls
   */
  getFailedCalls(): ServiceTrace[] {
    return this.traces.filter(t => !t.success);
  }

  /**
   * Get average duration for a service
   */
  getAverageDuration(serviceName: string): number {
    const traces = this.getTracesForService(serviceName);
    
    if (traces.length === 0) return 0;

    const total = traces.reduce((sum, t) => sum + t.duration, 0);
    return total / traces.length;
  }

  /**
   * Export stats
   */
  exportStats(): Record<string, { calls: number; errors: number; avgDuration: number }> {
    const stats: Record<string, { calls: number; errors: number; avgDuration: number }> = {};

    for (const trace of this.traces) {
      const key = `${trace.serviceName}.${trace.method}`;
      
      if (!stats[key]) {
        stats[key] = { calls: 0, errors: 0, avgDuration: 0 };
      }

      stats[key].calls++;
      if (!trace.success) stats[key].errors++;
      stats[key].avgDuration = 
        (stats[key].avgDuration * (stats[key].calls - 1) + trace.duration) / stats[key].calls;
    }

    return stats;
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces = [];
  }

  /**
   * Enable/disable tracing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Export singleton
export const serviceTracer = new ServiceTracer();

