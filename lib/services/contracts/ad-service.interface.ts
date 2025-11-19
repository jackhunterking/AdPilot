/**
 * Feature: Ad Service Contract
 * Purpose: Interface for ad management and publishing operations
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 *  - Microservices Architecture: /micro.plan.md
 */

import type { ServiceContract, ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Ad Types
// ============================================================================

export interface Ad {
  id: string;
  campaign_id: string;
  name: string;
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'archived';
  meta_ad_id?: string | null;
  creative_data?: Record<string, unknown>;
  copy_data?: Record<string, unknown>;
  setup_snapshot?: AdSnapshot;
  destination_type?: 'instant_form' | 'website_url' | 'phone';
  destination_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdSnapshot {
  creative?: {
    imageUrl?: string;
    imageVariations?: string[];
    baseImageUrl?: string;
    selectedImageIndex?: number;
  };
  copy?: {
    headline?: string;
    primaryText?: string;
    description?: string;
    cta?: string;
    variations?: Array<{
      headline: string;
      primaryText: string;
      description?: string;
      cta: string;
    }>;
    selectedIndex?: number;
  };
  location?: {
    locations: Array<{
      id: string;
      name: string;
      coordinates: [number, number];
      radius?: number;
      type: 'city' | 'region' | 'country' | 'radius';
      mode: 'include' | 'exclude';
    }>;
    status: string;
  };
  destination?: {
    type: 'instant_form' | 'website_url' | 'phone';
    data: Record<string, unknown>;
  };
  budget?: {
    dailyBudget: number;
    currency: string;
    schedule?: {
      startTime?: string;
      endTime?: string;
      timezone?: string;
    };
  };
}

export interface CreateAdInput {
  campaignId: string;
  name: string;
  status?: Ad['status'];
}

export interface UpdateAdInput {
  id: string;
  name?: string;
  status?: Ad['status'];
  creative_data?: Record<string, unknown>;
  copy_data?: Record<string, unknown>;
  destination_type?: Ad['destination_type'];
  destination_data?: Record<string, unknown>;
}

export interface SaveAdSnapshotInput {
  adId: string;
  snapshot: Partial<AdSnapshot>;
}

export interface PublishAdInput {
  adId: string;
  campaignId: string;
}

export interface PublishAdResult {
  meta_ad_id: string;
  status: string;
  message: string;
}

// ============================================================================
// Ad Service Interface
// ============================================================================

export interface AdService {
  /**
   * Create a new ad (draft)
   */
  createAd: ServiceContract<CreateAdInput, ServiceResult<Ad>>;

  /**
   * Get ad by ID
   */
  getAd: ServiceContract<string, ServiceResult<Ad>>;

  /**
   * Update ad
   */
  updateAd: ServiceContract<UpdateAdInput, ServiceResult<Ad>>;

  /**
   * Delete ad
   */
  deleteAd: ServiceContract<string, ServiceResult<void>>;

  /**
   * List ads for campaign
   */
  listAds: ServiceContract<
    { campaignId: string; status?: Ad['status'] },
    ServiceResult<Ad[]>
  >;

  /**
   * Save ad snapshot (complete setup data)
   */
  saveSnapshot: ServiceContract<SaveAdSnapshotInput, ServiceResult<Ad>>;

  /**
   * Get ad snapshot
   */
  getSnapshot: ServiceContract<string, ServiceResult<AdSnapshot>>;

  /**
   * Publish ad to Meta
   */
  publishAd: ServiceContract<PublishAdInput, ServiceResult<PublishAdResult>>;

  /**
   * Pause active ad
   */
  pauseAd: ServiceContract<string, ServiceResult<Ad>>;

  /**
   * Resume paused ad
   */
  resumeAd: ServiceContract<string, ServiceResult<Ad>>;

  /**
   * Duplicate ad
   */
  duplicateAd: ServiceContract<string, ServiceResult<Ad>>;
}

