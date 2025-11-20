/**
 * Feature: Lovable Integration - Sync Service Implementation
 * Purpose: Enforce AdPilot as single source of truth for ALL data
 * References:
 *  - Contract: lib/services/lovable/contracts/lovable-sync-contract.ts
 *  - AdPilot owns all data, Lovable provides only AI generation
 *  - Images copied to AdPilot Storage (not referenced from Lovable)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LovableSyncServiceContract,
  ImportImageInput,
  ImageImportResult,
} from './contracts/lovable-sync-contract';
import type {
  ServiceResult,
  LovableProjectLink,
  LinkProjectInput,
  CampaignSnapshot,
  ValidationResult,
} from '@/lib/types/lovable';
import type { SyncResult, ImageImportRecord, ImportStatus } from '@/lib/types/lovable/sync-state';

/**
 * Lovable Sync Service
 * 
 * Core Principles:
 * 1. AdPilot database is ALWAYS source of truth
 * 2. NEVER read campaign data from Lovable
 * 3. Images copied to AdPilot Storage (ownership)
 * 4. Conflicts ALWAYS resolved to AdPilot data
 * 5. Lovable deletion doesn't affect AdPilot data
 */
export class LovableSyncService implements LovableSyncServiceContract {
  constructor(
    private readonly supabase: SupabaseClient
  ) {}

  /**
   * Import image from Lovable → AdPilot Storage
   * 
   * Flow:
   * 1. Validate input
   * 2. Download image from Lovable URL
   * 3. Upload to AdPilot Supabase Storage (source of truth)
   * 4. Create ad_creatives record
   * 5. Create import audit record
   * 6. Return AdPilot URL (NOT Lovable URL)
   */
  async importImageFromLovable(
    input: ImportImageInput
  ): Promise<ServiceResult<ImageImportResult>> {
    try {
      // 1. Validate input
      const validation = this.validateImportInput(input);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 2. Download image from Lovable URL
      console.log('[LovableSync] Downloading image from Lovable:', input.sourceUrl);
      const imageBlob = await this.downloadImage(input.sourceUrl);

      if (!imageBlob) {
        return {
          success: false,
          error: {
            code: 'download_failed',
            message: 'Failed to download image from Lovable Storage'
          }
        };
      }

      // 3. Upload to AdPilot Storage (source of truth)
      const fileName = this.generateFileName(input);
      console.log('[LovableSync] Uploading to AdPilot Storage:', fileName);
      
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('ad-creatives')
        .upload(fileName, imageBlob, {
          contentType: this.getContentType(imageBlob),
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('[LovableSync] Upload failed:', uploadError);
        return {
          success: false,
          error: {
            code: 'upload_failed',
            message: uploadError.message
          }
        };
      }

      // Get public URL from AdPilot Storage
      const { data: urlData } = this.supabase.storage
        .from('ad-creatives')
        .getPublicUrl(fileName);

      const adpilotImageUrl = urlData.publicUrl;

      // 4. Create ad_creatives record
      const { data: creative, error: creativeError } = await this.supabase
        .from('ad_creatives')
        .insert({
          ad_id: input.adId,
          image_url: adpilotImageUrl, // AdPilot URL (source of truth)
          creative_format: 'image',
          creative_style: input.metadata?.prompt || 'Imported from Lovable',
          is_base_image: true,
          sort_order: 0,
          metadata: {
            ...input.metadata,
            source: 'lovable',
            original_url: input.sourceUrl, // Reference only
            imported_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (creativeError) {
        console.error('[LovableSync] Creative creation failed:', creativeError);
        
        // Cleanup: Delete uploaded image
        await this.supabase.storage
          .from('ad-creatives')
          .remove([fileName]);

        return {
          success: false,
          error: {
            code: 'creative_creation_failed',
            message: creativeError.message
          }
        };
      }

      // 5. Create import audit record
      const importRecord: Partial<ImageImportRecord> = {
        user_id: input.userId,
        campaign_id: input.campaignId,
        creative_id: creative.id,
        lovable_image_url: input.sourceUrl,
        adpilot_image_url: adpilotImageUrl,
        import_status: 'completed' as ImportStatus,
        metadata: {
          original_bucket: this.extractBucket(input.sourceUrl),
          original_name: this.extractFileName(input.sourceUrl),
          file_size: imageBlob.size,
          mime_type: imageBlob.type,
          ...input.metadata
        },
        imported_at: new Date().toISOString()
      };

      const { error: importError } = await this.supabase
        .from('lovable_image_imports')
        .insert(importRecord);

      if (importError) {
        console.warn('[LovableSync] Import record creation failed:', importError);
        // Non-fatal: Continue even if audit record fails
      }

      console.log('[LovableSync] Import successful:', creative.id);

      // 6. Return result with AdPilot URL
      return {
        success: true,
        data: {
          creative: {
            id: creative.id,
            adId: creative.ad_id,
            imageUrl: adpilotImageUrl, // AdPilot URL (source of truth)
            creativeFormat: creative.creative_format,
            metadata: creative.metadata
          },
          importRecord: importRecord as ImageImportRecord,
          originalUrl: input.sourceUrl
        }
      };
    } catch (error) {
      console.error('[LovableSync] Import failed:', error);
      return {
        success: false,
        error: {
          code: 'import_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Link Lovable project to AdPilot user
   */
  async linkLovableProject(
    input: LinkProjectInput
  ): Promise<ServiceResult<LovableProjectLink>> {
    try {
      const { data, error } = await this.supabase
        .from('lovable_project_links')
        .insert({
          user_id: input.userId,
          lovable_project_id: input.lovableProjectId,
          supabase_url: input.supabaseUrl,
          status: 'active',
          metadata: input.metadata || {}
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505') {
          return {
            success: false,
            error: {
              code: 'already_linked',
              message: 'This Lovable project is already linked to your account'
            }
          };
        }

        return {
          success: false,
          error: {
            code: 'link_failed',
            message: error.message
          }
        };
      }

      return {
        success: true,
        data: {
          id: data.id,
          userId: data.user_id,
          lovableProjectId: data.lovable_project_id,
          supabaseUrl: data.supabase_url,
          status: data.status,
          metadata: data.metadata,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'link_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Unlink Lovable project (soft delete)
   */
  async unlinkLovableProject(
    projectId: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('lovable_project_links')
        .update({ status: 'inactive' })
        .eq('lovable_project_id', projectId)
        .eq('user_id', userId);

      if (error) {
        return {
          success: false,
          error: {
            code: 'unlink_failed',
            message: error.message
          }
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'unlink_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Load campaign data from AdPilot (source of truth)
   * 
   * NEVER reads from Lovable
   * ALWAYS reads from AdPilot database
   */
  async loadCampaignData(
    lovableProjectId: string,
    userId: string
  ): Promise<ServiceResult<CampaignSnapshot>> {
    try {
      // 1. Get campaigns for this Lovable project
      const { data: campaigns, error: campaignError } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .eq('metadata->>lovable_project_id', lovableProjectId)
        .order('updated_at', { ascending: false });

      if (campaignError) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: campaignError.message
          }
        };
      }

      if (!campaigns || campaigns.length === 0) {
        // No campaigns yet - return empty snapshot
        return {
          success: true,
          data: {
            campaigns: [],
            ads: [],
            creatives: [],
            imageStatus: {}
          }
        };
      }

      // 2. Get ads for these campaigns
      const campaignIds = campaigns.map(c => c.id);
      const { data: ads, error: adsError } = await this.supabase
        .from('ads')
        .select('id, campaign_id, name, status, created_at')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false });

      if (adsError) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: adsError.message
          }
        };
      }

      // 3. Get creatives for these ads
      const adIds = ads?.map(a => a.id) || [];
      let creatives: any[] = [];
      
      if (adIds.length > 0) {
        const { data: creativesData, error: creativesError } = await this.supabase
          .from('ad_creatives')
          .select('id, ad_id, image_url, creative_format, metadata')
          .in('ad_id', adIds);

        if (creativesError) {
          console.warn('[LovableSync] Failed to load creatives:', creativesError);
          // Non-fatal: Continue without creatives
        } else {
          creatives = creativesData || [];
        }
      }

      // 4. Check Lovable image status (optional, non-blocking)
      const imageStatus = await this.checkLovableImageStatus(creatives);

      return {
        success: true,
        data: {
          campaigns: campaigns.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            metadata: c.metadata,
            createdAt: c.created_at,
            updatedAt: c.updated_at
          })),
          ads: ads?.map(a => ({
            id: a.id,
            campaignId: a.campaign_id,
            name: a.name,
            status: a.status,
            createdAt: a.created_at
          })) || [],
          creatives: creatives.map(c => ({
            id: c.id,
            adId: c.ad_id,
            imageUrl: c.image_url,
            creativeFormat: c.creative_format,
            metadata: c.metadata
          })),
          imageStatus
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'load_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check if Lovable images still exist (non-blocking)
   * 
   * This is informational only - AdPilot has copies so it doesn't matter
   */
  async checkLovableImageStatus(
    creatives: Array<{ id: string; metadata: Record<string, unknown> }>
  ): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};

    // Check in parallel (but don't fail if any fail)
    await Promise.allSettled(
      creatives.map(async (creative) => {
        const originalUrl = creative.metadata?.original_url as string | undefined;
        
        if (!originalUrl) {
          status[creative.id] = true; // Assume exists if no original URL
          return;
        }

        try {
          const response = await fetch(originalUrl, { method: 'HEAD' });
          status[creative.id] = response.ok;
        } catch {
          status[creative.id] = false;
        }
      })
    );

    return status;
  }

  /**
   * Resolve conflict - AdPilot ALWAYS wins
   */
  resolveConflict<T>(adpilotData: T, lovableData: T): T {
    console.warn('[LovableSync] Conflict detected - using AdPilot data (source of truth)');
    return adpilotData;
  }

  /**
   * Get sync state (placeholder for future implementation)
   */
  async getSyncState(lovableProjectId: string): Promise<ServiceResult<SyncResult>> {
    return {
      success: true,
      data: {
        success: true,
        syncDurationMs: 0,
        changesApplied: 0,
        conflictsDetected: 0
      }
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateImportInput(input: ImportImageInput): ValidationResult {
    if (!input.sourceUrl) {
      return {
        valid: false,
        error: {
          code: 'missing_source_url',
          message: 'Source URL is required',
          field: 'sourceUrl'
        }
      };
    }

    if (!input.campaignId) {
      return {
        valid: false,
        error: {
          code: 'missing_campaign_id',
          message: 'Campaign ID is required',
          field: 'campaignId'
        }
      };
    }

    if (!input.adId) {
      return {
        valid: false,
        error: {
          code: 'missing_ad_id',
          message: 'Ad ID is required',
          field: 'adId'
        }
      };
    }

    if (!input.userId) {
      return {
        valid: false,
        error: {
          code: 'missing_user_id',
          message: 'User ID is required',
          field: 'userId'
        }
      };
    }

    return { valid: true };
  }

  private async downloadImage(url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('[LovableSync] Download failed:', response.status, response.statusText);
        return null;
      }

      return await response.blob();
    } catch (error) {
      console.error('[LovableSync] Download error:', error);
      return null;
    }
  }

  private generateFileName(input: ImportImageInput): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const projectId = input.metadata?.lovableProjectId || 'unknown';
    
    return `lovable/${projectId}/${timestamp}_${random}.png`;
  }

  private getContentType(blob: Blob): string {
    return blob.type || 'image/png';
  }

  private extractBucket(url: string): string {
    try {
      const match = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\//);
      return match ? match[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private extractFileName(url: string): string {
    try {
      const parts = url.split('/');
      return parts[parts.length - 1] || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

