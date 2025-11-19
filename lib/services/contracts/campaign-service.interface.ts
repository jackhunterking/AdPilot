/**
 * Feature: Campaign Service Contract
 * Purpose: Interface for campaign management operations
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 *  - Microservices Architecture: /micro.plan.md
 */

import type { ServiceContract, ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Campaign Types
// ============================================================================

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  current_step?: number | null;
  initial_goal: 'leads' | 'calls' | 'website-visits' | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown; // Allow additional DB fields
}

export interface CreateCampaignInput {
  name?: string;
  tempPromptId?: string;
  prompt?: string;
  goalType?: 'leads' | 'calls' | 'website-visits';
}

export interface UpdateCampaignInput {
  id: string;
  name?: string;
  status?: Campaign['status'];
  currentStep?: number;
  metadata?: Record<string, unknown>;
}

export interface GoalConfiguration {
  goalType: 'leads' | 'calls' | 'website-visits';
  formData?: {
    // Lead form fields
    leadFormId?: string;
    leadFormType?: 'instant_form' | 'existing_form';
    
    // Phone call fields
    phoneNumber?: string;
    countryCode?: string;
    
    // Website fields
    websiteUrl?: string;
    displayLink?: string;
  };
}

// ============================================================================
// Campaign Service Interface
// ============================================================================

export interface CampaignService {
  /**
   * Create a new campaign
   */
  createCampaign: ServiceContract<CreateCampaignInput, ServiceResult<Campaign>>;

  /**
   * Get campaign by ID
   */
  getCampaign: ServiceContract<string, ServiceResult<Campaign>>;

  /**
   * Update campaign
   */
  updateCampaign: ServiceContract<UpdateCampaignInput, ServiceResult<Campaign>>;

  /**
   * Delete campaign (cascade delete ads)
   */
  deleteCampaign: ServiceContract<string, ServiceResult<void>>;

  /**
   * List user campaigns
   */
  listCampaigns: ServiceContract<{ userId: string; limit?: number }, ServiceResult<Campaign[]>>;

  /**
   * Configure campaign goal
   */
  configureGoal: ServiceContract<
    { campaignId: string } & GoalConfiguration,
    ServiceResult<Campaign>
  >;

  /**
   * Update campaign step
   */
  updateCurrentStep: ServiceContract<
    { campaignId: string; step: number },
    ServiceResult<Campaign>
  >;
}

