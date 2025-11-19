/**
 * Feature: Budget Service Server Implementation
 * Purpose: Server-side budget configuration and recommendations
 * References:
 *  - Budget Service Contract: lib/services/contracts/budget-service.interface.ts
 *  - Supabase: https://supabase.com/docs
 */

import { supabaseServer } from '@/lib/supabase/server';
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
 * Budget Service Server Implementation
 * Handles budget configuration and schedule management
 */
class BudgetServiceServer implements BudgetService {
  setBudget = {
    async execute(input: SetBudgetInput): Promise<ServiceResult<void>> {
      try {
        // Store budget in ad_budgets table
        const { error } = await supabaseServer
          .from('ad_budgets')
          .upsert({
            ad_id: input.adId,
            daily_budget_cents: Math.round(input.dailyBudget * 100),
            currency_code: input.currency || 'USD',
          }, { onConflict: 'ad_id' });

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  getBudget = {
    async execute(adId: string): Promise<ServiceResult<BudgetConfiguration | null>> {
      try {
        const { data, error } = await supabaseServer
          .from('ad_budgets')
          .select('*')
          .eq('ad_id', adId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No budget set
            return {
              success: true,
              data: null,
            };
          }
          
          return {
            success: false,
            error: {
              code: 'fetch_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: {
            dailyBudget: data.daily_budget_cents / 100,
            currency: data.currency_code,
            selectedAdAccount: null, // TODO: Link to campaigns table
            schedule: {
              startTime: data.start_date || null,
              endTime: data.end_date || null,
              timezone: data.timezone || null,
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  setSchedule = {
    async execute(input: SetScheduleInput): Promise<ServiceResult<void>> {
      try {
        const { error } = await supabaseServer
          .from('ad_budgets')
          .upsert({
            ad_id: input.adId,
            start_date: input.startTime,
            end_date: input.endTime,
            timezone: input.timezone,
            daily_budget_cents: 1000, // Required field, default to $10
            currency_code: 'USD', // Required field
          }, { onConflict: 'ad_id' });

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  selectAdAccount = {
    async execute(input: SelectAdAccountInput): Promise<ServiceResult<void>> {
      try {
        const { error } = await supabaseServer
          .from('campaign_meta_connections')
          .update({ selected_ad_account_id: input.adAccountId })
          .eq('campaign_id', input.campaignId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  getRecommendations = {
    async execute(input: { adId: string; goal: string }): Promise<ServiceResult<BudgetRecommendation>> {
      try {
        // Basic budget recommendations based on goal
        const recommendations: Record<string, BudgetRecommendation> = {
          leads: {
            minDaily: 10,
            recommendedDaily: 25,
            maxDaily: 100,
            reasoning: 'For lead generation, Meta recommends $25-50/day for optimal results',
          },
          calls: {
            minDaily: 15,
            recommendedDaily: 35,
            maxDaily: 150,
            reasoning: 'Phone call campaigns require higher budgets for quality conversions',
          },
          'website-visits': {
            minDaily: 10,
            recommendedDaily: 20,
            maxDaily: 75,
            reasoning: 'Website traffic campaigns can start lower and scale up based on performance',
          },
        };

        return {
          success: true,
          data: recommendations[input.goal] || recommendations['website-visits'],
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'recommendation_failed',
            message: error instanceof Error ? error.message : 'Failed to get recommendations',
          },
        };
      }
    },
  };

  validateBudget = {
    async execute(input: { amount: number; currency: string }): Promise<ServiceResult<{ valid: boolean; error?: string }>> {
      try {
        // Meta minimum budgets by currency
        const minimums: Record<string, number> = {
          USD: 1,
          CAD: 1.5,
          EUR: 1,
          GBP: 1,
        };

        const minBudget = minimums[input.currency] || 1;

        if (input.amount < minBudget) {
          return {
            success: true,
            data: {
              valid: false,
              error: `Minimum budget for ${input.currency} is $${minBudget}`,
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
            code: 'validation_failed',
            message: error instanceof Error ? error.message : 'Budget validation failed',
          },
        };
      }
    },
  };

  estimateReach = {
    async execute(input: { dailyBudget: number; targeting: unknown }): Promise<ServiceResult<{ minReach: number; maxReach: number }>> {
      try {
        // TODO: Implement Meta Reach Estimate API call
        // Would query Meta's reach estimation endpoint
        
        // Simple formula for now (rough estimate)
        const estimatedCPM = 10; // $10 CPM
        const estimatedImpressions = (input.dailyBudget / estimatedCPM) * 1000;
        const reachFactor = 0.7; // Assume 70% unique reach

        const minReach = Math.floor(estimatedImpressions * reachFactor * 0.8);
        const maxReach = Math.ceil(estimatedImpressions * reachFactor * 1.2);

        return {
          success: true,
          data: { minReach, maxReach },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'estimation_failed',
            message: error instanceof Error ? error.message : 'Reach estimation failed',
          },
        };
      }
    },
  };
}

// Export singleton instance
export const budgetServiceServer = new BudgetServiceServer();

