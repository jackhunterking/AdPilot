/**
 * Feature: Budget Service Client (Full Implementation)
 * Purpose: Client-side budget and schedule configuration
 * Microservices: Client service layer calling API routes
 * References:
 *  - Contract: lib/services/contracts/budget-service.interface.ts
 */

"use client";

import type { 
  BudgetService,
  BudgetConfiguration,
  SetBudgetInput,
  SetScheduleInput,
  SelectAdAccountInput,
  BudgetRecommendation,
} from '../contracts/budget-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Budget Service Client (Full Implementation)
 * 
 * Client-side implementation that calls API v1 endpoints for budget configuration.
 * 
 * Architecture:
 * - Uses fetch to call /api/v1/campaigns/[id]/state endpoint
 * - Validates budget amounts (min $1, max $100,000 daily)
 * - Returns standardized ServiceResult<T>
 * - Type-safe request/response handling
 */
class BudgetServiceClient implements BudgetService {
  setBudget = {
    async execute(input: SetBudgetInput): Promise<ServiceResult<void>> {
      try {
        // Get campaign ID from ad
        const adResponse = await fetch(`/api/v1/ads/${input.adId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!adResponse.ok) {
          return {
            success: false,
            error: {
              code: 'fetch_failed',
              message: 'Failed to fetch ad details',
            },
          };
        }
        
        const adResult: unknown = await adResponse.json();
        const adData = adResult as { success: true; data: { ad: { campaign_id: string } } };
        const campaignId = adData.data.ad.campaign_id;
        
        // Update campaign state with budget
        const response = await fetch(`/api/v1/campaigns/${campaignId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            budget_data: {
              dailyBudget: input.dailyBudget,
              currency: input.currency || 'USD',
            },
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to set budget',
          },
        };
      }
    }
  };

  getBudget = {
    async execute(adId: string): Promise<ServiceResult<BudgetConfiguration | null>> {
      try {
        const response = await fetch(`/api/v1/ads/${adId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { 
          success: true; 
          data: { ad: { setup_snapshot?: { budget?: BudgetConfiguration } } } 
        };
        const budget = successResult.data.ad.setup_snapshot?.budget || null;
        
        return {
          success: true,
          data: budget,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to get budget',
          },
        };
      }
    }
  };

  setSchedule = {
    async execute(input: SetScheduleInput): Promise<ServiceResult<void>> {
      try {
        // Get campaign ID from ad
        const adResponse = await fetch(`/api/v1/ads/${input.adId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!adResponse.ok) {
          return {
            success: false,
            error: {
              code: 'fetch_failed',
              message: 'Failed to fetch ad details',
            },
          };
        }
        
        const adResult: unknown = await adResponse.json();
        const adData = adResult as { success: true; data: { ad: { campaign_id: string } } };
        const campaignId = adData.data.ad.campaign_id;
        
        // Update campaign state with schedule
        const response = await fetch(`/api/v1/campaigns/${campaignId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            budget_data: {
              schedule: {
                startTime: input.startTime,
                endTime: input.endTime,
                timezone: input.timezone,
              },
            },
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to set schedule',
          },
        };
      }
    }
  };

  selectAdAccount = {
    async execute(input: SelectAdAccountInput): Promise<ServiceResult<void>> {
      try {
        const response = await fetch(`/api/v1/campaigns/${input.campaignId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            budget_data: {
              selectedAdAccount: input.adAccountId,
            },
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to select ad account',
          },
        };
      }
    }
  };

  getRecommendations = {
    async execute(input: { adId: string; goal: 'leads' | 'calls' | 'website-visits' }): Promise<ServiceResult<BudgetRecommendation>> {
      try {
        // Calculate recommendations based on goal
        const recommendations: Record<string, BudgetRecommendation> = {
          leads: {
            minDaily: 20,
            recommendedDaily: 50,
            maxDaily: 500,
            reasoning: 'For lead generation, $50/day allows Meta to optimize for quality leads and reach sufficient audience.',
          },
          calls: {
            minDaily: 30,
            recommendedDaily: 75,
            maxDaily: 750,
            reasoning: 'Phone call campaigns require higher budgets to reach motivated prospects ready to call.',
          },
          'website-visits': {
            minDaily: 15,
            recommendedDaily: 40,
            maxDaily: 400,
            reasoning: 'Website traffic campaigns can start lower and scale based on conversion rates.',
          },
        };
        
        return {
          success: true,
          data: recommendations[input.goal],
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'recommendation_error',
            message: error instanceof Error ? error.message : 'Failed to get recommendations',
          },
        };
      }
    }
  };

  validateBudget = {
    async execute(input: { amount: number; currency: string }): Promise<ServiceResult<{ valid: boolean; error?: string }>> {
      try {
        const minBudget = 1; // $1 minimum
        const maxBudget = 100000; // $100,000 maximum
        
        if (input.amount < minBudget) {
          return {
            success: true,
            data: {
              valid: false,
              error: `Budget must be at least $${minBudget}`,
            },
          };
        }
        
        if (input.amount > maxBudget) {
          return {
            success: true,
            data: {
              valid: false,
              error: `Budget cannot exceed $${maxBudget}`,
            },
          };
        }
        
        return {
          success: true,
          data: { valid: true },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'validation_error',
            message: error instanceof Error ? error.message : 'Failed to validate budget',
          },
        };
      }
    }
  };

  estimateReach = {
    async execute(input: { dailyBudget: number; targeting: unknown }): Promise<ServiceResult<{ minReach: number; maxReach: number }>> {
      try {
        // Simple estimation formula: $1 = 1,000-2,000 reach for most campaigns
        const baseReachMin = input.dailyBudget * 1000;
        const baseReachMax = input.dailyBudget * 2000;
        
        return {
          success: true,
          data: {
            minReach: Math.floor(baseReachMin),
            maxReach: Math.floor(baseReachMax),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'estimation_error',
            message: error instanceof Error ? error.message : 'Failed to estimate reach',
          },
        };
      }
    }
  };
}

export const budgetServiceClient = new BudgetServiceClient();
