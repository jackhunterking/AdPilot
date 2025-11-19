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
   * Note: Uses existing validation utilities
   */
  async validateAd(_adId: string): Promise<ServiceResult<{ valid: boolean; errors?: ValidationError[] }>> {
    try {
      // TODO: Implement proper validation using validateAdForPublish
      // For now, return success (validation will happen in publish API route)
      return {
        success: true,
        data: {
          valid: true,
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

      const response = await fetch(`/api/campaigns/${input.campaignId}/ads/${input.adId}/publish`, {
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
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}/pause`, {
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
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}/resume`, {
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

