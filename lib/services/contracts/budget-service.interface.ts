/**
 * Feature: Budget Service Contract
 * Purpose: Interface for budget configuration and schedule management
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 */

import type { ServiceContract, ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Budget Types
// ============================================================================

export interface BudgetConfiguration {
  dailyBudget: number; // In dollars
  currency: string; // ISO currency code (USD, CAD, etc.)
  selectedAdAccount: string | null;
  schedule?: {
    startTime?: string | null; // ISO 8601
    endTime?: string | null; // ISO 8601
    timezone?: string | null; // IANA timezone
  };
}

export interface SetBudgetInput {
  adId: string;
  dailyBudget: number;
  currency?: string;
}

export interface SetScheduleInput {
  adId: string;
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
}

export interface SelectAdAccountInput {
  campaignId: string;
  adAccountId: string;
}

export interface BudgetRecommendation {
  minDaily: number;
  recommendedDaily: number;
  maxDaily: number;
  reasoning: string;
}

// ============================================================================
// Budget Service Interface
// ============================================================================

export interface BudgetService {
  /**
   * Set daily budget for ad
   */
  setBudget: ServiceContract<SetBudgetInput, ServiceResult<void>>;

  /**
   * Get current budget configuration
   */
  getBudget: ServiceContract<string, ServiceResult<BudgetConfiguration | null>>;

  /**
   * Set schedule (start/end time)
   */
  setSchedule: ServiceContract<SetScheduleInput, ServiceResult<void>>;

  /**
   * Select ad account to use
   */
  selectAdAccount: ServiceContract<SelectAdAccountInput, ServiceResult<void>>;

  /**
   * Get budget recommendations based on goal and targeting
   */
  getRecommendations: ServiceContract<
    { adId: string; goal: 'leads' | 'calls' | 'website-visits' },
    ServiceResult<BudgetRecommendation>
  >;

  /**
   * Validate budget amount
   */
  validateBudget: ServiceContract<
    { amount: number; currency: string },
    ServiceResult<{ valid: boolean; error?: string }>
  >;

  /**
   * Calculate estimated reach
   */
  estimateReach: ServiceContract<
    { dailyBudget: number; targeting: unknown },
    ServiceResult<{ minReach: number; maxReach: number }>
  >;
}

