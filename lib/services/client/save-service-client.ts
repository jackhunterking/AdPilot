/**
 * Feature: Save Service Client
 * Purpose: Client-side ad save operations via API routes
 * Microservices: Client service layer calling API routes
 * References:
 *  - API v1: app/api/v1/ads/[id]/save
 *  - Original: lib/services/save-service.ts
 *  - Service Pattern: /journey-ui.plan.md
 */

"use client";

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

/**
 * Save Service Client
 * 
 * Client-side implementation for ad save operations.
 * Calls /api/v1/ads/[id]/save endpoint.
 */
export class SaveServiceClient {
  /**
   * Save ad data to database via API
   */
  async saveAd(input: SaveAdInput): Promise<ServiceResult<SaveAdResult>> {
    try {
      console.log('📦 SaveServiceClient: Saving ad data', {
        adId: input.adId,
        campaignId: input.campaignId,
      });

      const response = await fetch(`/api/v1/ads/${input.adId}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
          },
          budget: input.budgetState,
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const errorResult = result as { success: false; error: { code: string; message: string } };
        console.error('❌ SaveServiceClient: Save failed', errorResult.error);
        return {
          success: false,
          error: errorResult.error,
        };
      }

      console.log('✅ SaveServiceClient: Ad saved successfully');
      return {
        success: true,
        data: {
          adId: input.adId,
          success: true,
        },
      };
    } catch (error) {
      console.error('❌ SaveServiceClient: Network error', error);
      return {
        success: false,
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Failed to save ad',
        },
      };
    }
  }

  /**
   * Get ad snapshot from API
   */
  async getSnapshot(adId: string): Promise<ServiceResult<unknown>> {
    try {
      const response = await fetch(`/api/v1/ads/${adId}/save`, {
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

      const successResult = result as { success: true; data: { snapshot: unknown } };
      return {
        success: true,
        data: successResult.data.snapshot,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Failed to get snapshot',
        },
      };
    }
  }
}

export const saveServiceClient = new SaveServiceClient();

