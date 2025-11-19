/**
 * Feature: Save Service
 * Purpose: Ad save workflows, draft management, snapshot creation
 * References:
 *  - Microservices: Extracted from components/campaign-workspace.tsx
 *  - API v1: /api/v1/ads/[id]/save
 */

import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Types
// ============================================================================

export interface SaveAdInput {
  campaignId: string;
  adId: string;
  adContent: {
    imageUrl?: string;
    imageVariations?: string[];
    baseImageUrl?: string;
    headline: string;
    body: string;
    cta: string;
  } | null;
  selectedImageIndex: number | null;
  adCopyState: {
    customCopyVariations?: Array<{
      headline: string;
      primaryText: string;
      description?: string;
      cta: string;
    }> | null;
    selectedCopyIndex: number | null;
    status: string;
  };
  destinationState: {
    type?: string;
    data?: Record<string, unknown>;
    status: string;
  };
  locationState: {
    locations: unknown[];
    status: string;
  };
  budgetState: {
    dailyBudget: number;
    currency: string;
    selectedAdAccount: string | null;
    schedule?: {
      startTime?: string | null;
      endTime?: string | null;
      timezone?: string | null;
    };
  };
}

export interface SaveAdResult {
  adId: string;
  success: boolean;
}

// ============================================================================
// Save Service
// ============================================================================

export class SaveService {
  /**
   * Save ad data to normalized tables
   */
  async saveAd(input: SaveAdInput): Promise<ServiceResult<SaveAdResult>> {
    try {
      console.log('📦 SaveService: Saving ad data', {
        adId: input.adId,
        campaignId: input.campaignId,
      });

      const response = await fetch(`/api/v1/ads/${input.adId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: input.campaignId,
          creative: {
            imageUrl: input.adContent?.imageUrl,
            imageVariations: input.adContent?.imageVariations,
            baseImageUrl: input.adContent?.baseImageUrl,
            selectedImageIndex: input.selectedImageIndex,
          },
          copy: {
            variations: input.adCopyState.customCopyVariations,
            selectedIndex: input.adCopyState.selectedCopyIndex,
            headline: input.adContent?.headline,
            primaryText: input.adContent?.body,
            cta: input.adContent?.cta,
          },
          destination: {
            type: input.destinationState.type,
            data: input.destinationState.data,
          },
          location: {
            locations: input.locationState.locations,
            status: input.locationState.status,
          },
          budget: {
            dailyBudget: input.budgetState.dailyBudget,
            currency: input.budgetState.currency,
            selectedAdAccount: input.budgetState.selectedAdAccount,
            schedule: input.budgetState.schedule,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('SaveService: Failed to save ad:', error);
        
        return {
          success: false,
          error: {
            code: 'save_failed',
            message: error.error || 'Failed to save ad',
          },
        };
      }

      await response.json();
      console.log('✅ SaveService: Ad saved successfully');

      return {
        success: true,
        data: {
          adId: input.adId,
          success: true,
        },
      };
    } catch (error) {
      console.error('SaveService: Unexpected error:', error);
      
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
   * Create draft ad
   */
  async createDraftAd(campaignId: string): Promise<ServiceResult<{ adId: string; name: string }>> {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/ads/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          error: {
            code: 'creation_failed',
            message: error.error || 'Failed to create draft ad',
          },
        };
      }

      const data = await response.json();
      
      if (!data?.ad?.id) {
        return {
          success: false,
          error: {
            code: 'invalid_response',
            message: 'Invalid response from server',
          },
        };
      }

      return {
        success: true,
        data: {
          adId: data.ad.id,
          name: data.ad.name,
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
  }

  /**
   * Delete draft ad
   */
  async deleteDraftAd(campaignId: string, adId: string): Promise<ServiceResult<void>> {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 404) {
        return {
          success: false,
          error: {
            code: 'deletion_failed',
            message: 'Failed to delete draft ad',
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
export const saveService = new SaveService();

