/**
 * Feature: Schedule Transformer
 * Purpose: Transform schedule data to Meta API v24.0 timestamp format
 * References:
 *  - AdSet Scheduling: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign#Creating
 *  - Time Format: Unix timestamp in UTC
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduleData {
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
}

export interface ScheduleTransformResult {
  start_time?: string; // Unix timestamp
  end_time?: string; // Unix timestamp
  warnings: string[];
}

// ============================================================================
// SCHEDULE TRANSFORMER CLASS
// ============================================================================

export class ScheduleTransformer {
  /**
   * Transform schedule data to Meta format
   */
  transform(scheduleData: ScheduleData | null): ScheduleTransformResult {
    const warnings: string[] = [];

    // If no schedule data, run continuously (no start/end time)
    if (!scheduleData || (!scheduleData.startTime && !scheduleData.endTime)) {
      return {
        warnings: ['No schedule specified - campaign will run continuously']
      };
    }

    const result: ScheduleTransformResult = {
      warnings
    };

    // Process start time
    if (scheduleData.startTime) {
      const startTimestamp = this.toUnixTimestamp(scheduleData.startTime);

      // Validate start time is in future (with 5-minute buffer)
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutesFromNow = now + (5 * 60);

      if (startTimestamp < now) {
        warnings.push('Start time is in the past. Campaign will start immediately.');
        // Don't set start_time, let it start immediately
      } else if (startTimestamp < fiveMinutesFromNow) {
        warnings.push('Start time is very soon (< 5 minutes). Campaign may start immediately.');
        result.start_time = String(startTimestamp);
      } else {
        result.start_time = String(startTimestamp);
      }
    }

    // Process end time
    if (scheduleData.endTime) {
      const endTimestamp = this.toUnixTimestamp(scheduleData.endTime);
      const now = Math.floor(Date.now() / 1000);

      // Validate end time is in future
      if (endTimestamp <= now) {
        throw new Error('End time must be in the future');
      }

      // Validate end time is after start time
      if (result.start_time && endTimestamp <= parseInt(result.start_time)) {
        throw new Error('End time must be after start time');
      }

      // Validate campaign duration
      const startTimestamp = result.start_time ? parseInt(result.start_time) : now;
      const durationDays = (endTimestamp - startTimestamp) / (24 * 60 * 60);

      if (durationDays < 1) {
        warnings.push('Campaign duration is less than 1 day. Consider running longer for better results.');
      }

      if (durationDays > 180) {
        warnings.push('Campaign duration exceeds 6 months. Consider shorter campaigns with periodic reviews.');
      }

      result.end_time = String(endTimestamp);
    }

    return result;
  }

  /**
   * Convert ISO date string to Unix timestamp
   */
  private toUnixTimestamp(dateString: string): number {
    try {
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateString}`);
      }

      // Return Unix timestamp (seconds since epoch)
      return Math.floor(date.getTime() / 1000);
    } catch (error) {
      throw new Error(`Failed to parse date: ${dateString}`);
    }
  }

  /**
   * Convert Unix timestamp to ISO string
   */
  private toISOString(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString();
  }

  /**
   * Calculate campaign duration in days
   */
  calculateDuration(scheduleData: ScheduleData | null): number {
    if (!scheduleData || !scheduleData.startTime || !scheduleData.endTime) {
      return 0; // Continuous
    }

    try {
      const start = new Date(scheduleData.startTime);
      const end = new Date(scheduleData.endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
      }

      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      return Math.ceil(diffDays);
    } catch {
      return 0;
    }
  }

  /**
   * Validate schedule data
   */
  validate(scheduleData: ScheduleData | null): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // No schedule is valid (runs continuously)
    if (!scheduleData || (!scheduleData.startTime && !scheduleData.endTime)) {
      return { isValid: true, errors, warnings };
    }

    // If start time specified, validate it
    if (scheduleData.startTime) {
      try {
        const startTimestamp = this.toUnixTimestamp(scheduleData.startTime);
        const now = Math.floor(Date.now() / 1000);

        if (startTimestamp < now - (24 * 60 * 60)) {
          errors.push('Start time is more than 24 hours in the past');
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Invalid start time format');
      }
    }

    // If end time specified, validate it
    if (scheduleData.endTime) {
      try {
        const endTimestamp = this.toUnixTimestamp(scheduleData.endTime);
        const now = Math.floor(Date.now() / 1000);

        if (endTimestamp <= now) {
          errors.push('End time must be in the future');
        }

        // Check duration if both start and end specified
        if (scheduleData.startTime) {
          const startTimestamp = this.toUnixTimestamp(scheduleData.startTime);
          const durationDays = (endTimestamp - startTimestamp) / (24 * 60 * 60);

          if (durationDays < 1) {
            errors.push('Campaign duration must be at least 1 day');
          }

          if (durationDays > 365) {
            warnings.push('Campaign duration exceeds 1 year');
          }
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Invalid end time format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if schedule is immediate
   */
  isImmediate(scheduleData: ScheduleData | null): boolean {
    if (!scheduleData || !scheduleData.startTime) {
      return true;
    }

    const startTimestamp = this.toUnixTimestamp(scheduleData.startTime);
    const now = Math.floor(Date.now() / 1000);

    return startTimestamp <= now;
  }

  /**
   * Check if schedule is continuous
   */
  isContinuous(scheduleData: ScheduleData | null): boolean {
    return !scheduleData || !scheduleData.endTime;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a schedule transformer instance
 */
export function createScheduleTransformer(): ScheduleTransformer {
  return new ScheduleTransformer();
}

/**
 * Transform schedule data to Meta format
 */
export function transformScheduleData(scheduleData: ScheduleData | null): ScheduleTransformResult {
  const transformer = new ScheduleTransformer();
  return transformer.transform(scheduleData);
}

/**
 * Calculate campaign duration from schedule
 */
export function calculateDuration(scheduleData: ScheduleData | null): number {
  const transformer = new ScheduleTransformer();
  return transformer.calculateDuration(scheduleData);
}

/**
 * Check if campaign starts immediately
 */
export function startsImmediately(scheduleData: ScheduleData | null): boolean {
  const transformer = new ScheduleTransformer();
  return transformer.isImmediate(scheduleData);
}

/**
 * Check if campaign runs continuously
 */
export function runsContinuously(scheduleData: ScheduleData | null): boolean {
  const transformer = new ScheduleTransformer();
  return transformer.isContinuous(scheduleData);
}

/**
 * Convert ISO date to Unix timestamp
 */
export function isoToUnixTimestamp(isoString: string): number {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${isoString}`);
  }
  return Math.floor(date.getTime() / 1000);
}

/**
 * Convert Unix timestamp to ISO string
 */
export function unixTimestampToISO(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Extract schedule data from budget_data
 */
export function extractScheduleData(budgetData: unknown): ScheduleData | null {
  if (!budgetData || typeof budgetData !== 'object') {
    return null;
  }

  const obj = budgetData as Partial<ScheduleData>;

  return {
    startTime: obj.startTime || null,
    endTime: obj.endTime || null,
    timezone: obj.timezone || null
  };
}

