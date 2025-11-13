/**
 * Feature: Budget Transformer
 * Purpose: Transform budget data to Meta API v24.0 budget specifications
 * References:
 *  - Budget Fields: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign#budget
 *  - AdSet Budgets: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign#daily-budget
 */

import { BUDGET_MINIMUMS, getMinimumBudget } from '../config/publishing-config';

// ============================================================================
// TYPES
// ============================================================================

export interface BudgetData {
  dailyBudget: number; // in dollars
  selectedAdAccount?: string | null;
  isConnected?: boolean;
  currency?: string; // "USD", "EUR", etc.
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
}

export interface BudgetTransformResult {
  daily_budget?: number; // in cents
  lifetime_budget?: number; // in cents
  currency: string;
  warnings: string[];
}

// ============================================================================
// BUDGET TRANSFORMER CLASS
// ============================================================================

export class BudgetTransformer {
  /**
   * Transform budget data to Meta format
   */
  transform(budgetData: unknown, accountCurrency?: string): BudgetTransformResult {
    const warnings: string[] = [];

    // Parse and validate budget data
    const parsed = this.parseBudgetData(budgetData);

    if (!parsed) {
      throw new Error('Invalid budget data');
    }

    // Determine currency (from account or budget data)
    const currency = accountCurrency || parsed.currency || 'USD';

    // Convert daily budget from dollars to cents
    const dailyBudgetCents = this.dollarsToCents(parsed.dailyBudget);

    // Check minimum budget
    const minimum = getMinimumBudget(currency);
    if (dailyBudgetCents < minimum) {
      warnings.push(
        `Daily budget ${this.formatCurrency(dailyBudgetCents / 100, currency)} is below minimum ` +
        `${this.formatCurrency(minimum / 100, currency)}. Will be adjusted to minimum.`
      );
    }

    // Ensure we meet minimum
    const finalDailyBudget = Math.max(dailyBudgetCents, minimum);

    // Determine if lifetime budget needed
    let lifetimeBudget: number | undefined;
    if (parsed.startTime && parsed.endTime) {
      // If specific end time, calculate lifetime budget
      const days = this.calculateDurationDays(parsed.startTime, parsed.endTime);

      if (days > 0 && days <= 365) {
        lifetimeBudget = finalDailyBudget * days;
        warnings.push(`Calculated lifetime budget: ${this.formatCurrency(lifetimeBudget / 100, currency)} for ${days} days`);
      } else if (days > 365) {
        warnings.push('Campaign duration exceeds 1 year. Using daily budget only.');
      }
    }

    return {
      daily_budget: lifetimeBudget ? undefined : finalDailyBudget,
      lifetime_budget: lifetimeBudget,
      currency,
      warnings
    };
  }

  /**
   * Parse budget_data from campaign_states
   */
  private parseBudgetData(data: unknown): BudgetData | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const obj = data as Partial<BudgetData>;

    // dailyBudget is required
    if (typeof obj.dailyBudget !== 'number') {
      return null;
    }

    return {
      dailyBudget: obj.dailyBudget,
      selectedAdAccount: obj.selectedAdAccount || null,
      isConnected: obj.isConnected || false,
      currency: obj.currency || 'USD',
      startTime: obj.startTime || null,
      endTime: obj.endTime || null,
      timezone: obj.timezone || null
    };
  }

  /**
   * Convert dollars to cents
   */
  private dollarsToCents(dollars: number): number {
    // Multiply by 100 and round to avoid floating point issues
    return Math.round(dollars * 100);
  }

  /**
   * Convert cents to dollars
   */
  private centsToDollars(cents: number): number {
    return cents / 100;
  }

  /**
   * Calculate duration in days between start and end times
   */
  private calculateDurationDays(startTime: string, endTime: string): number {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
      }

      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      // Fallback if currency is invalid
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  /**
   * Validate budget value
   */
  validate(budgetCents: number, currency: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const minimum = getMinimumBudget(currency);

    if (budgetCents < minimum) {
      errors.push(
        `Budget ${this.formatCurrency(budgetCents / 100, currency)} ` +
        `is below minimum ${this.formatCurrency(minimum / 100, currency)}`
      );
    }

    if (budgetCents < minimum * 5) {
      warnings.push(
        `Low budget may limit ad delivery and learning. ` +
        `Consider at least ${this.formatCurrency((minimum * 5) / 100, currency)} for better results.`
      );
    }

    // Warn if very high budget (potential accidental entry)
    if (budgetCents > 100000) { // > $1,000
      warnings.push(
        `Daily budget ${this.formatCurrency(budgetCents / 100, currency)} is very high. ` +
        `Please verify this is intentional.`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get minimum budget for currency
   */
  getMinimumBudget(currency: string): number {
    return getMinimumBudget(currency);
  }

  /**
   * Get recommended budget for currency
   */
  getRecommendedBudget(currency: string): number {
    const minimum = getMinimumBudget(currency);
    return minimum * 5; // 5x minimum as recommendation
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a budget transformer instance
 */
export function createBudgetTransformer(): BudgetTransformer {
  return new BudgetTransformer();
}

/**
 * Transform budget data to Meta format
 */
export function transformBudgetData(budgetData: unknown, currency?: string): BudgetTransformResult {
  const transformer = new BudgetTransformer();
  return transformer.transform(budgetData, currency);
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Check if budget meets minimum
 */
export function meetsMinimumBudget(budgetCents: number, currency: string): boolean {
  const minimum = getMinimumBudget(currency);
  return budgetCents >= minimum;
}

/**
 * Format budget for display
 */
export function formatBudget(cents: number, currency: string): string {
  const dollars = cents / 100;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(dollars);
  } catch {
    return `${dollars.toFixed(2)} ${currency}`;
  }
}

/**
 * Extract budget data from campaign_states
 */
export function extractBudgetData(campaignStates: unknown): unknown {
  if (!campaignStates || typeof campaignStates !== 'object') {
    return null;
  }

  const states = campaignStates as { budget_data?: unknown };
  return states.budget_data || null;
}

