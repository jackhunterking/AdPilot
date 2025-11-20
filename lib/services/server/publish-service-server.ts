/**
 * Feature: Publish Service
 * Purpose: Pre-publish validation, publishing orchestration, status tracking
 * References:
 *  - Microservices: Extracted from components/campaign-workspace.tsx
 *  - API v1: /api/v1/ads/[id]/publish
 */

import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';
// Validation imports - available for future use
// import { validateAdForPublish, formatValidationError } from '@/lib/utils/ad-validation';

// ============================================================================
// Types
// ============================================================================

export interface PublishAdInput {
  campaignId: string;
  adId: string;
}

export interface PublishAdResult {
  meta_ad_id: string;
  status: string;
  message: string;
}

export interface ValidationError {
  code: string;
  message: string;
  suggestedAction?: string;
}

// ============================================================================
// Publish Service
// ============================================================================

export class PublishService {
  /**
   * Validate ad before publishing
   * Checks all required components are present for Meta publishing
   */
  async validateAd(adId: string): Promise<ServiceResult<{ valid: boolean; errors?: ValidationError[] }>> {
    try {
      const supabase = await createServerClient();

      // Get ad with all related data
      const { data: ad, error } = await supabase
        .from('ads')
        .select(`
          *,
          ad_creatives(id),
          ad_copy_variations(id),
          ad_target_locations(id),
          ad_budgets(id),
          ad_destinations(id)
        `)
        .eq('id', adId)
        .single();

      if (error || !ad) {
        return {
          success: false,
          error: {
            code: 'ad_not_found',
            message: 'Ad not found',
          },
        };
      }

      const errors: ValidationError[] = [];

      // Check selected creative
      if (!ad.selected_creative_id) {
        errors.push({
          field: 'creative',
          message: 'No image selected. Please select an image variation.',
        });
      }

      // Check selected copy
      if (!ad.selected_copy_id) {
        errors.push({
          field: 'copy',
          message: 'No ad copy selected. Please select a copy variation.',
        });
      }

      // Check locations exist
      const locationCount = (ad.ad_target_locations as any[])?.length || 0;
      if (locationCount === 0) {
        errors.push({
          field: 'location',
          message: 'No target locations set. Please add at least one location.',
        });
      }

      // Check budget exists
      const budgetCount = (ad.ad_budgets as any[])?.length || 0;
      if (budgetCount === 0) {
        errors.push({
          field: 'budget',
          message: 'No budget configured. Please set daily budget and schedule.',
        });
      }

      // Check destination exists
      const destinationCount = (ad.ad_destinations as any[])?.length || 0;
      if (destinationCount === 0) {
        errors.push({
          field: 'destination',
          message: 'No destination configured. Please set up lead form, website, or phone.',
        });
      }

      return {
        success: true,
        data: {
          valid: errors.length === 0,
          errors: errors.length > 0 ? errors : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'validation_failed',
          message: error instanceof Error ? error.message : 'Validation failed',
        },
      };
    }
  }

  /**
   * Publish ad to Meta
   */
  async publishAd(input: PublishAdInput): Promise<ServiceResult<PublishAdResult>> {
    try {
      console.log('[PublishService] Publishing ad:', input.adId);

      const response = await fetch(`/api/v1/ads/${input.adId}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: { message: 'Unknown error' } 
        }));
        
        const userMessage = errorData?.error?.userMessage 
          || errorData?.error?.message 
          || errorData?.error 
          || 'Failed to publish ad';
        
        const suggestedAction = errorData?.error?.suggestedAction;

        return {
          success: false,
          error: {
            code: 'publish_failed',
            message: userMessage,
            details: suggestedAction ? { suggestedAction } : undefined,
          },
        };
      }

      const data = await response.json();
      console.log('[PublishService] Ad published successfully');

      return {
        success: true,
        data: {
          meta_ad_id: data.ad?.meta_ad_id || data.meta_ad_id,
          status: data.ad?.status || 'active',
          message: 'Ad published successfully',
        },
      };
    } catch (error) {
      console.error('[PublishService] Unexpected error:', error);
      
      return {
        success: false,
        error: {
          code: 'internal_error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Pause active ad
   */
  async pauseAd(campaignId: string, adId: string, token?: string): Promise<ServiceResult<void>> {
    try {
      const response = await fetch(`/api/v1/ads/${adId}/pause`, {
        method: 'POST',
        headers: token ? { 'Content-Type': 'application/json' } : undefined,
        body: token ? JSON.stringify({ token }) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[PublishService] Failed to pause ad:', errorData);
        
        return {
          success: false,
          error: {
            code: 'pause_failed',
            message: errorData.error || 'Failed to pause ad',
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
  }

  /**
   * Resume paused ad
   */
  async resumeAd(campaignId: string, adId: string, token?: string): Promise<ServiceResult<void>> {
    try {
      const response = await fetch(`/api/v1/ads/${adId}/resume`, {
        method: 'POST',
        headers: token ? { 'Content-Type': 'application/json' } : undefined,
        body: token ? JSON.stringify({ token }) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[PublishService] Failed to resume ad:', errorData);
        
        return {
          success: false,
          error: {
            code: 'resume_failed',
            message: errorData.error || 'Failed to resume ad',
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
  }
}

// Export singleton
export const publishService = new PublishService();

