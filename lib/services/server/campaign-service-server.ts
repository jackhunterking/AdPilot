/**
 * Feature: Campaign Service Implementation
 * Purpose: Campaign CRUD operations and goal management
 * References:
 *  - Campaign Service Contract: lib/services/contracts/campaign-service.interface.ts
 *  - Supabase: https://supabase.com/docs
 */

import { createServerClient } from '@/lib/supabase/server';
import type {
  CampaignService,
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
  GoalConfiguration,
} from '../contracts/campaign-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Campaign Service Implementation
 * Handles all campaign-related operations
 */
class CampaignServiceImpl implements CampaignService {
  createCampaign = {
    async execute(input: CreateCampaignInput): Promise<ServiceResult<Campaign>> {
      try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return {
            success: false,
            error: {
              code: 'unauthorized',
              message: 'User not authenticated',
            },
          };
        }

        const { data, error } = await supabase
          .from('campaigns')
          .insert({
            user_id: user.id,
            name: input.name || 'Untitled Campaign',
            status: 'draft',
            current_step: 1,
            initial_goal: input.goalType || null,
          })
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'creation_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: data as Campaign,
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

  getCampaign = {
    async execute(campaignId: string): Promise<ServiceResult<Campaign>> {
      try {
        const supabase = await createServerClient();
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'not_found',
              message: 'Campaign not found',
            },
          };
        }

        return {
          success: true,
          data: data as Campaign,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'fetch_failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  updateCampaign = {
    async execute(input: UpdateCampaignInput): Promise<ServiceResult<Campaign>> {
      try {
        const supabase = await createServerClient();
        const updates: Record<string, unknown> = {};

        if (input.name !== undefined) updates.name = input.name;
        if (input.status !== undefined) updates.status = input.status;
        if (input.currentStep !== undefined) updates.current_step = input.currentStep;
        if (input.metadata !== undefined) updates.metadata = input.metadata;

        const { data, error } = await supabase
          .from('campaigns')
          .update(updates)
          .eq('id', input.id)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: data as Campaign,
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

  deleteCampaign = {
    async execute(campaignId: string): Promise<ServiceResult<void>> {
      try {
        const supabase = await createServerClient();
        const { error } = await supabase
          .from('campaigns')
          .delete()
          .eq('id', campaignId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'deletion_failed',
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

  listCampaigns = {
    async execute(input: { userId: string; limit?: number }): Promise<ServiceResult<Campaign[]>> {
      try {
        const supabase = await createServerClient();
        let query = supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', input.userId)
          .order('updated_at', { ascending: false });

        if (input.limit) {
          query = query.limit(input.limit);
        }

        const { data, error } = await query;

        if (error) {
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
          data: (data || []) as Campaign[],
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

  configureGoal = {
    async execute(
      input: { campaignId: string } & GoalConfiguration
    ): Promise<ServiceResult<Campaign>> {
      try {
        const supabase = await createServerClient();
        
        // Update campaign goal
        const { data, error } = await supabase
          .from('campaigns')
          .update({
            initial_goal: input.goalType,
            metadata: {
              formData: input.formData,
            },
          })
          .eq('id', input.campaignId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: data as Campaign,
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

  updateCurrentStep = {
    async execute(input: {
      campaignId: string;
      step: number;
    }): Promise<ServiceResult<Campaign>> {
      try {
        const supabase = await createServerClient();
        const { data, error } = await supabase
          .from('campaigns')
          .update({ updated_at: new Date().toISOString() }) // current_step removed from schema
          .eq('id', input.campaignId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: data as Campaign,
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
}

// Export singleton instance
export const campaignService = new CampaignServiceImpl();

