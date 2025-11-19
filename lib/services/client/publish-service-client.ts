/**
 * Feature: Publish Service Client
 * Purpose: Client-side ad publishing operations via API routes
 * Microservices: Client service layer calling API routes
 * References:
 *  - API v1: app/api/v1/ads/[id]/publish
 *  - Original: lib/services/publish-service.ts
 *  - Service Pattern: /journey-ui.plan.md
 */

"use client";

import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

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

/**
 * Publish Service Client
 * 
 * Client-side implementation for ad publishing operations.
 * Calls /api/v1/ads/[id]/publish endpoint.
 */
export class PublishServiceClient {
  /**
   * Validate ad before publishing (client-side checks)
   */
  async validateAd(adId: string): Promise<ServiceResult<{ valid: boolean; errors?: ValidationError[] }>> {
    try {
      // Basic client-side validation
      // Full validation happens on server
      if (!adId) {
        return {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Ad ID is required',
          },
        };
      }

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
   * Publish ad to Meta via API
   */
  async publishAd(input: PublishAdInput): Promise<ServiceResult<PublishAdResult>> {
    try {
      console.log('[PublishServiceClient] Publishing ad:', input.adId);

      const response = await fetch(`/api/v1/ads/${input.adId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaignId: input.campaignId }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorResult = result as { success: false; error: { code: string; message: string; details?: unknown } };
        console.error('[PublishServiceClient] Publish failed:', errorResult.error);
        
        return {
          success: false,
          error: errorResult.error,
        };
      }

      const successResult = result as { success: true; data: PublishAdResult };
      console.log('[PublishServiceClient] ✅ Ad published successfully');
      
      return {
        success: true,
        data: successResult.data,
      };
    } catch (error) {
      console.error('[PublishServiceClient] Network error:', error);
      return {
        success: false,
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Failed to publish ad',
        },
      };
    }
  }

  /**
   * Pause ad via API
   */
  async pauseAd(adId: string): Promise<ServiceResult<{ status: string }>> {
    try {
      const response = await fetch(`/api/v1/ads/${adId}/pause`, {
        method: 'POST',
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

      return {
        success: true,
        data: { status: 'paused' },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Failed to pause ad',
        },
      };
    }
  }

  /**
   * Resume ad via API
   */
  async resumeAd(adId: string): Promise<ServiceResult<{ status: string }>> {
    try {
      const response = await fetch(`/api/v1/ads/${adId}/resume`, {
        method: 'POST',
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

      return {
        success: true,
        data: { status: 'active' },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Failed to resume ad',
        },
      };
    }
  }
}

export const publishServiceClient = new PublishServiceClient();

