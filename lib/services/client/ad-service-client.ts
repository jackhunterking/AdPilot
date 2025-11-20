/**
 * Feature: Ad Service Client Implementation
 * Purpose: Client-side ad operations via API v1 routes
 * Microservices: Client service layer calling API routes
 * References:
 *  - API v1: app/api/v1/ads/
 *  - Contract: lib/services/contracts/ad-service.interface.ts
 *  - Service Pattern: /journey-ui.plan.md
 */

"use client";

import type {
  AdService,
  Ad,
  CreateAdInput,
  UpdateAdInput,
  SaveAdSnapshotInput,
  PublishAdInput,
  PublishAdResult,
  AdSnapshot,
} from '../contracts/ad-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Ad Service Client
 * 
 * Client-side implementation that calls API v1 routes.
 * Handles ad CRUD operations, snapshots, and publishing.
 * 
 * Architecture:
 * - Uses fetch to call /api/v1/ads endpoints
 * - Maintains same contract as server implementation
 * - Type-safe request/response handling
 */
class AdServiceClient implements AdService {
  createAd = {
    async execute(input: CreateAdInput): Promise<ServiceResult<Ad>> {
      try {
        const response = await fetch('/api/v1/ads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
        
        const successResult = result as { success: true; data: { ad: Ad } };
        return {
          success: true,
          data: successResult.data.ad,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to create ad',
          },
        };
      }
    }
  };

  getAd = {
    async execute(adId: string): Promise<ServiceResult<Ad>> {
      try {
        const response = await fetch(`/api/v1/ads/${adId}`, {
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
        
        const successResult = result as { success: true; data: { ad: Ad } };
        return {
          success: true,
          data: successResult.data.ad,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to fetch ad',
          },
        };
      }
    }
  };

  updateAd = {
    async execute(input: UpdateAdInput): Promise<ServiceResult<Ad>> {
      try {
        const { id, ...updateData } = input;
        const response = await fetch(`/api/v1/ads/${id}`, {
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
        
        const successResult = result as { success: true; data: { ad: Ad } };
        return {
          success: true,
          data: successResult.data.ad,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to update ad',
          },
        };
      }
    }
  };

  deleteAd = {
    async execute(adId: string): Promise<ServiceResult<void>> {
      try {
        const response = await fetch(`/api/v1/ads/${adId}`, {
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
            message: error instanceof Error ? error.message : 'Failed to delete ad',
          },
        };
      }
    }
  };

  listAds = {
    async execute(input: { campaignId: string; status?: Ad['status'] }): Promise<ServiceResult<Ad[]>> {
      try {
        const params = new URLSearchParams({ campaignId: input.campaignId });
        if (input.status) params.append('status', input.status);
        
        const response = await fetch(`/api/v1/ads?${params}`, {
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
        
        const successResult = result as { success: true; data: { ads: Ad[] } };
        return {
          success: true,
          data: successResult.data.ads,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to list ads',
          },
        };
      }
    }
  };

  saveSnapshot = {
    async execute(input: SaveAdSnapshotInput): Promise<ServiceResult<Ad>> {
      try {
        const response = await fetch(`/api/v1/ads/${input.adId}/save`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(input.snapshot),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { ad: Ad } };
        return {
          success: true,
          data: successResult.data.ad,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to save snapshot',
          },
        };
      }
    }
  };

  getSnapshot = {
    async execute(adId: string): Promise<ServiceResult<AdSnapshot>> {
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
        
        const successResult = result as { success: true; data: { snapshot: AdSnapshot } };
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
  };

  publishAd = {
    async execute(input: PublishAdInput): Promise<ServiceResult<PublishAdResult>> {
      try {
        const response = await fetch(`/api/v1/ads/${input.adId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ campaignId: input.campaignId }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: PublishAdResult };
        return {
          success: true,
          data: successResult.data,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to publish ad',
          },
        };
      }
    }
  };

  pauseAd = {
    async execute(adId: string): Promise<ServiceResult<Ad>> {
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
        
        const successResult = result as { success: true; data: { ad: Ad } };
        return {
          success: true,
          data: successResult.data.ad,
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
  };

  resumeAd = {
    async execute(adId: string): Promise<ServiceResult<Ad>> {
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
        
        const successResult = result as { success: true; data: { ad: Ad } };
        return {
          success: true,
          data: successResult.data.ad,
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
  };

  duplicateAd = {
    async execute(adId: string): Promise<ServiceResult<Ad>> {
      // TODO: Implement duplicate ad endpoint
      // Route /api/v1/ads/[id]/duplicate does not exist yet
      // Options:
      // 1. Create the route in app/api/v1/ads/[id]/duplicate/route.ts
      // 2. Implement client-side duplication using getAd + createAd
      return {
        success: false,
        error: {
          code: 'not_implemented',
          message: 'Duplicate ad endpoint not yet implemented',
        },
      };
      
      /* Commented out until endpoint is created
      try {
        const response = await fetch(`/api/v1/ads/${adId}/duplicate`, {
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
        
        const successResult = result as { success: true; data: { ad: Ad } };
        return {
          success: true,
          data: successResult.data.ad,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to duplicate ad',
          },
        };
      }
    }
  };
}

export const adServiceClient = new AdServiceClient();

