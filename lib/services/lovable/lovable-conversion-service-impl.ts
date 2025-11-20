/**
 * Feature: Lovable Integration - Conversion Service Implementation
 * Purpose: Track conversions (signups, purchases) from Lovable projects
 * References:
 *  - Contract: lib/services/lovable/contracts/lovable-conversion-contract.ts
 *  - Webhook endpoint: /api/v1/webhooks/lovable/[projectId]/signup
 *  - Edge Function: User's Lovable project calls our webhook
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LovableConversionServiceContract,
} from './contracts/lovable-conversion-contract';
import type {
  ServiceResult,
} from '@/lib/types/lovable';
import type {
  LovableConversion,
  ConversionInput,
  ConversionQueryOptions,
  ConversionRate,
  DateRange,
  EdgeFunctionTemplate,
  ConversionSummary,
  ConversionType,
} from '@/lib/types/lovable/conversions';

/**
 * Lovable Conversion Service
 * 
 * Handles conversion tracking from Lovable projects
 * Receives webhooks from user's Edge Functions
 */
export class LovableConversionService implements LovableConversionServiceContract {
  constructor(
    private readonly supabase: SupabaseClient
  ) {}

  /**
   * Record conversion from Lovable webhook
   * 
   * Flow:
   * 1. Find active campaign for Lovable project
   * 2. Record conversion in database
   * 3. Update campaign metrics
   */
  async recordConversion(
    input: ConversionInput
  ): Promise<ServiceResult<LovableConversion>> {
    try {
      // 1. Find active campaign for this Lovable project
      const { data: campaign, error: campaignError } = await this.supabase
        .from('campaigns')
        .select('id, user_id')
        .eq('metadata->>lovable_project_id', input.lovableProjectId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (campaignError || !campaign) {
        return {
          success: false,
          error: {
            code: 'campaign_not_found',
            message: 'No active campaign found for this Lovable project'
          }
        };
      }

      // 2. Record conversion
      const { data: conversion, error: conversionError } = await this.supabase
        .from('campaign_conversions')
        .insert({
          campaign_id: campaign.id,
          user_id: campaign.user_id,
          conversion_type: input.conversionType,
          conversion_data: input.conversionData,
          source: input.source,
          timestamp: input.timestamp || new Date().toISOString()
        })
        .select()
        .single();

      if (conversionError) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: conversionError.message
          }
        };
      }

      // 3. Update campaign metrics (async - don't wait)
      this.updateCampaignMetrics(campaign.id).catch(error => {
        console.error('[LovableConversion] Failed to update metrics:', error);
      });

      return {
        success: true,
        data: {
          id: conversion.id,
          campaignId: conversion.campaign_id,
          userId: conversion.user_id,
          conversionType: conversion.conversion_type,
          conversionData: conversion.conversion_data,
          source: conversion.source,
          timestamp: conversion.timestamp,
          createdAt: conversion.created_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'record_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get conversions for campaign
   */
  async getCampaignConversions(
    campaignId: string,
    options?: ConversionQueryOptions
  ): Promise<ServiceResult<LovableConversion[]>> {
    try {
      let query = this.supabase
        .from('campaign_conversions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('timestamp', { ascending: false });

      // Apply filters
      if (options?.startDate) {
        query = query.gte('timestamp', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('timestamp', options.endDate);
      }

      if (options?.conversionType) {
        query = query.eq('conversion_type', options.conversionType);
      }

      if (options?.source) {
        query = query.eq('source', options.source);
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: error.message
          }
        };
      }

      return {
        success: true,
        data: data.map(c => ({
          id: c.id,
          campaignId: c.campaign_id,
          userId: c.user_id,
          conversionType: c.conversion_type,
          conversionData: c.conversion_data,
          source: c.source,
          timestamp: c.timestamp,
          createdAt: c.created_at
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'query_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Calculate conversion rate
   */
  async getConversionRate(
    campaignId: string,
    dateRange: DateRange
  ): Promise<ServiceResult<ConversionRate>> {
    try {
      // Get conversion count
      const { count: conversions, error: conversionError } = await this.supabase
        .from('campaign_conversions')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .gte('timestamp', dateRange.startDate)
        .lte('timestamp', dateRange.endDate);

      if (conversionError) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: conversionError.message
          }
        };
      }

      // Get click count from metrics
      const { data: metrics, error: metricsError } = await this.supabase
        .from('campaign_metrics_cache')
        .select('clicks')
        .eq('campaign_id', campaignId)
        .gte('date_start', dateRange.startDate)
        .lte('date_end', dateRange.endDate)
        .order('cached_at', { ascending: false })
        .limit(1)
        .single();

      if (metricsError && metricsError.code !== 'PGRST116') {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: metricsError.message
          }
        };
      }

      const totalClicks = metrics?.clicks || 0;
      const totalConversions = conversions || 0;
      const rate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      return {
        success: true,
        data: {
          totalClicks,
          totalConversions,
          rate: Math.round(rate * 100) / 100, // Round to 2 decimals
          period: dateRange
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'calculation_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get conversion summary
   */
  async getConversionSummary(
    campaignId: string,
    dateRange: DateRange
  ): Promise<ServiceResult<ConversionSummary>> {
    try {
      // Get all conversions for period
      const { data: conversions, error: conversionError } = await this.supabase
        .from('campaign_conversions')
        .select('conversion_type, source, timestamp')
        .eq('campaign_id', campaignId)
        .gte('timestamp', dateRange.startDate)
        .lte('timestamp', dateRange.endDate);

      if (conversionError) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: conversionError.message
          }
        };
      }

      // Aggregate by type and source
      const byType: Record<ConversionType, number> = {
        signup: 0,
        purchase: 0,
        call: 0,
        form_submit: 0,
        custom: 0
      };

      const bySource: Record<string, number> = {};
      let lastConversionAt: string | null = null;

      conversions?.forEach(c => {
        byType[c.conversion_type as ConversionType] = (byType[c.conversion_type as ConversionType] || 0) + 1;
        bySource[c.source] = (bySource[c.source] || 0) + 1;
        
        if (!lastConversionAt || c.timestamp > lastConversionAt) {
          lastConversionAt = c.timestamp;
        }
      });

      // Get conversion rate
      const rateResult = await this.getConversionRate(campaignId, dateRange);
      const conversionRate = rateResult.success ? rateResult.data!.rate : 0;

      return {
        success: true,
        data: {
          campaignId,
          totalConversions: conversions?.length || 0,
          conversionsByType: byType,
          conversionsBySource: bySource,
          conversionRate,
          lastConversionAt,
          dateRange
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'summary_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Generate Edge Function template for user
   */
  async generateEdgeFunctionTemplate(
    lovableProjectId: string,
    goalType: 'signup' | 'purchase' | 'custom'
  ): Promise<ServiceResult<EdgeFunctionTemplate>> {
    try {
      const webhookUrl = `https://api.adpilot.com/v1/webhooks/lovable/${lovableProjectId}/${goalType}`;

      const code = this.getEdgeFunctionCode(webhookUrl, goalType);
      const instructions = this.getSetupInstructions(goalType);

      return {
        success: true,
        data: {
          functionName: `adpilot-${goalType}-tracking`,
          webhookUrl,
          code,
          instructions
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'template_generation_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async updateCampaignMetrics(campaignId: string): Promise<void> {
    // Get conversion count
    const { count } = await this.supabase
      .from('campaign_conversions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);

    // Update campaign metadata
    await this.supabase
      .from('campaigns')
      .update({
        metadata: {
          total_conversions: count || 0,
          last_conversion_sync: new Date().toISOString()
        }
      })
      .eq('id', campaignId);
  }

  private getEdgeFunctionCode(webhookUrl: string, goalType: string): string {
    return `// AdPilot ${goalType} tracking - Deno Edge Function
// This function sends ${goalType} events to AdPilot for conversion tracking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Parse request body
    const { email, name, phone, ...customData } = await req.json();

    // Send to AdPilot webhook
    const response = await fetch('${webhookUrl}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: '${goalType}',
        email,
        name,
        phone,
        customData,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(\`AdPilot webhook failed: \${response.statusText}\`);
    }

    return new Response(
      JSON.stringify({ success: true, message: '${goalType} tracked' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error tracking ${goalType}:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});`;
  }

  private getSetupInstructions(goalType: string): string[] {
    return [
      '1. Go to Lovable Cloud → Edge Functions',
      `2. Click "New Function" and name it: adpilot-${goalType}-tracking`,
      '3. Copy and paste the code above',
      '4. Deploy the function',
      `5. Call this function when a user ${goalType}s in your app`,
      '6. Pass user data: { email, name, phone, customData }',
      '7. AdPilot will track the conversion automatically'
    ];
  }
}

