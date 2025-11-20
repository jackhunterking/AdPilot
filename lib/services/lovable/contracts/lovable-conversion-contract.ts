/**
 * Feature: Lovable Integration - Conversion Service Contract
 * Purpose: Contract for conversion tracking service (webhooks from Lovable projects)
 * References:
 *  - Webhook endpoint: /api/v1/webhooks/lovable/[projectId]/signup
 *  - Edge Function: User's Lovable project calls our webhook on signup
 */

import type {
  ServiceResult,
} from '@/lib/types/lovable/project';
import type {
  LovableConversion,
  ConversionInput,
  ConversionQueryOptions,
  ConversionRate,
  DateRange,
  EdgeFunctionTemplate,
  ConversionSummary,
} from '@/lib/types/lovable/conversions';

/**
 * Service contract for conversion tracking
 * 
 * Responsibilities:
 * - Record conversions from Lovable webhooks
 * - Calculate conversion rates
 * - Generate Edge Function templates for users
 * - Provide conversion analytics
 */
export interface LovableConversionServiceContract {
  /**
   * Record conversion from Lovable webhook
   * 
   * Flow:
   * 1. Webhook receives signup/conversion event
   * 2. Find active campaign for Lovable project
   * 3. Record conversion in campaign_conversions table
   * 4. Update campaign metrics
   */
  recordConversion(input: ConversionInput): Promise<ServiceResult<LovableConversion>>;
  
  /**
   * Get conversions for campaign
   * 
   * Supports pagination, filtering by date/type
   */
  getCampaignConversions(
    campaignId: string,
    options?: ConversionQueryOptions
  ): Promise<ServiceResult<LovableConversion[]>>;
  
  /**
   * Calculate conversion rate for campaign
   * 
   * Rate = (conversions / clicks) * 100
   */
  getConversionRate(
    campaignId: string,
    dateRange: DateRange
  ): Promise<ServiceResult<ConversionRate>>;
  
  /**
   * Get conversion summary (analytics)
   * 
   * Returns:
   * - Total conversions
   * - Breakdown by type
   * - Breakdown by source
   * - Conversion rate
   */
  getConversionSummary(
    campaignId: string,
    dateRange: DateRange
  ): Promise<ServiceResult<ConversionSummary>>;
  
  /**
   * Generate Edge Function template for user
   * 
   * Returns copy-paste code for their Lovable project
   * Includes:
   * - Full Deno Edge Function code
   * - Webhook URL with project ID
   * - Step-by-step instructions
   */
  generateEdgeFunctionTemplate(
    lovableProjectId: string,
    goalType: 'signup' | 'purchase' | 'custom'
  ): Promise<ServiceResult<EdgeFunctionTemplate>>;
}

