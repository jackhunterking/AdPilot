/**
 * Feature: Lovable Integration - Sync Service Contract
 * Purpose: Contract for synchronization service (AdPilot is source of truth)
 * References:
 *  - Microservices: Contract-based service communication
 *  - AdPilot owns ALL data, Lovable provides only AI generation
 */

import type {
  ServiceResult,
  LovableProjectLink,
  LinkProjectInput,
  CampaignSnapshot,
  LovableImage,
} from '@/lib/types/lovable/project';
import type { ImageImportRecord, SyncResult } from '@/lib/types/lovable/sync-state';

/**
 * Service contract for Lovable synchronization
 * 
 * Responsibilities:
 * - Import images from Lovable Storage → AdPilot Storage (copy, don't reference)
 * - Link Lovable projects to AdPilot users
 * - Load campaign data from AdPilot (source of truth)
 * - Enforce AdPilot as single source of truth
 * - Handle conflict resolution (AdPilot always wins)
 */
export interface LovableSyncServiceContract {
  /**
   * Import image from Lovable to AdPilot Storage
   * 
   * Flow:
   * 1. Download image from Lovable URL
   * 2. Upload to AdPilot Supabase Storage
   * 3. Create ad_creatives record
   * 4. Return AdPilot URL (not Lovable URL)
   * 
   * Why: Lovable users might delete images, breaking ads.
   * We copy to our storage to maintain control and ownership.
   */
  importImageFromLovable(input: ImportImageInput): Promise<ServiceResult<ImageImportResult>>;
  
  /**
   * Link Lovable project to AdPilot user
   * 
   * Creates entry in lovable_project_links table
   * One user can link multiple Lovable projects
   */
  linkLovableProject(input: LinkProjectInput): Promise<ServiceResult<LovableProjectLink>>;
  
  /**
   * Unlink Lovable project
   * 
   * Sets status to 'inactive', doesn't delete (audit trail)
   */
  unlinkLovableProject(projectId: string, userId: string): Promise<ServiceResult<void>>;
  
  /**
   * Load campaign data for Lovable project
   * 
   * ALWAYS loads from AdPilot database (source of truth)
   * NEVER reads from Lovable Supabase
   * 
   * Returns: Campaigns, ads, creatives for this project
   */
  loadCampaignData(
    lovableProjectId: string,
    userId: string
  ): Promise<ServiceResult<CampaignSnapshot>>;
  
  /**
   * Check if Lovable images still exist (optional, non-blocking)
   * 
   * Used for showing warnings in UI if user deleted source images
   * Does NOT affect AdPilot functionality (we have copies)
   */
  checkLovableImageStatus(creatives: Array<{ id: string; metadata: Record<string, unknown> }>): Promise<Record<string, boolean>>;
  
  /**
   * Resolve conflict between AdPilot and Lovable data
   * 
   * Resolution: ALWAYS use AdPilot data
   * This should never happen in normal flow, but provides fallback
   */
  resolveConflict<T>(adpilotData: T, lovableData: T): T;
  
  /**
   * Get sync state for project
   */
  getSyncState(lovableProjectId: string): Promise<ServiceResult<SyncResult>>;
}

/**
 * Input for importing image from Lovable
 */
export interface ImportImageInput {
  sourceUrl: string; // Lovable Storage URL
  campaignId: string;
  adId?: string; // Optional: specific ad to attach to
  userId: string;
  metadata?: {
    lovableProjectId: string;
    prompt?: string;
    generatedBy?: 'lovable_ai' | 'user_upload';
    [key: string]: unknown;
  };
}

/**
 * Result of image import
 */
export interface ImageImportResult {
  creative: {
    id: string;
    adId: string;
    imageUrl: string; // AdPilot URL (source of truth)
    creativeFormat: string;
    metadata: Record<string, unknown>;
  };
  importRecord: ImageImportRecord;
  originalUrl: string; // Lovable URL (reference only)
}

