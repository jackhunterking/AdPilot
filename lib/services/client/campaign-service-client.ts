/**
 * Feature: Campaign Service Client Implementation
 * Purpose: Client-side campaign operations via API v1 routes
 * Microservices: Client service layer calling API routes
 * References:
 *  - API v1: app/api/v1/campaigns/
 *  - Contract: lib/services/contracts/campaign-service.interface.ts
 *  - Service Pattern: /journey-ui.plan.md
 */

"use client";

import type { 
  CampaignService, 
  Campaign, 
  CreateCampaignInput,
  UpdateCampaignInput,
  GoalConfiguration 
} from '../contracts/campaign-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Campaign Service Client
 * 
 * Client-side implementation that calls API v1 routes.
 * Maintains same contract as server implementation but uses fetch instead of direct Supabase access.
 * 
 * Architecture:
 * - Uses fetch to call /api/v1/campaigns endpoints
 * - Handles network errors gracefully
 * - Returns standardized ServiceResult<T>
 * - Type-safe request/response handling
 */
class CampaignServiceClient implements CampaignService {
  createCampaign = {
    async execute(input: CreateCampaignInput): Promise<ServiceResult<Campaign>> {
      try {
        const response = await fetch('/api/v1/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include auth cookies
          body: JSON.stringify(input),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { campaign: Campaign } };
        return {
          success: true,
          data: successResult.data.campaign,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Network request failed',
          },
        };
      }
    }
  };

  getCampaign = {
    async execute(campaignId: string): Promise<ServiceResult<Campaign>> {
      try {
        const response = await fetch(`/api/v1/campaigns/${campaignId}`, {
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
        
        const successResult = result as { success: true; data: { campaign: Campaign } };
        return {
          success: true,
          data: successResult.data.campaign,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to fetch campaign',
          },
        };
      }
    }
  };

  updateCampaign = {
    async execute(input: UpdateCampaignInput): Promise<ServiceResult<Campaign>> {
      try {
        const { id, ...updateData } = input;
        const response = await fetch(`/api/v1/campaigns/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updateData),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { campaign: Campaign } };
        return {
          success: true,
          data: successResult.data.campaign,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to update campaign',
          },
        };
      }
    }
  };

  deleteCampaign = {
    async execute(campaignId: string): Promise<ServiceResult<void>> {
      try {
        const response = await fetch(`/api/v1/campaigns/${campaignId}`, {
          method: 'DELETE',
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
        
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to delete campaign',
          },
        };
      }
    }
  };

  listCampaigns = {
    async execute(input: { userId: string; limit?: number }): Promise<ServiceResult<Campaign[]>> {
      try {
        const params = new URLSearchParams();
        if (input.limit) params.append('limit', input.limit.toString());
        
        const response = await fetch(`/api/v1/campaigns?${params}`, {
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
        
        const successResult = result as { success: true; data: { campaigns: Campaign[] } };
        return {
          success: true,
          data: successResult.data.campaigns,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to list campaigns',
          },
        };
      }
    }
  };

  configureGoal = {
    async execute(input: { campaignId: string } & GoalConfiguration): Promise<ServiceResult<Campaign>> {
      try {
        const { campaignId, ...goalData } = input;
        const response = await fetch(`/api/v1/campaigns/${campaignId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ goal_data: goalData }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { campaign: Campaign } };
        return {
          success: true,
          data: successResult.data.campaign,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to configure goal',
          },
        };
      }
    }
  };

  updateCurrentStep = {
    async execute(input: { campaignId: string; step: number }): Promise<ServiceResult<Campaign>> {
      try {
        const response = await fetch(`/api/v1/campaigns/${input.campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ current_step: input.step }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { campaign: Campaign } };
        return {
          success: true,
          data: successResult.data.campaign,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to update step',
          },
        };
      }
    }
  };
}

export const campaignServiceClient = new CampaignServiceClient();

