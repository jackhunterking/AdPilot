/**
 * Feature: Ad Service Server Implementation
 * Purpose: Server-side ad CRUD operations with direct Supabase access
 * References:
 *  - Ad Service Contract: lib/services/contracts/ad-service.interface.ts
 *  - Supabase: https://supabase.com/docs
 *  - Microservices: Server-side service layer
 */

import { createServerClient } from '@/lib/supabase/server';
import { publishSingleAd } from '@/lib/meta/publisher-single-ad';
import { adDataService } from '@/lib/services/ad-data-service';
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
 * Ad Service Server Implementation
 * Direct Supabase access for server-side operations
 */
class AdServiceServer implements AdService {
  createAd = {
    async execute(input: CreateAdInput): Promise<ServiceResult<Ad>> {
      try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return {
            success: false,
            error: {
              code: 'unauthorized',
              message: 'User not authenticated',
            },
          };
        }

        const { data, error } = await supabase
          .from('ads')
          .insert({
            campaign_id: input.campaignId,
            name: input.name,
            status: input.status || 'draft',
          })
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'creation_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: data as Ad,
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
    },
  };

  getAd = {
    async execute(adId: string): Promise<ServiceResult<Ad>> {
      try {
        const supabase = await createServerClient();
        const { data, error } = await supabase
          .from('ads')
          .select('*')
          .eq('id', adId)
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'not_found',
              message: 'Ad not found',
            },
          };
        }

        return {
          success: true,
          data: data as Ad,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'fetch_failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  updateAd = {
    async execute(input: UpdateAdInput): Promise<ServiceResult<Ad>> {
      try {
        const supabase = await createServerClient();
        const updates: Record<string, unknown> = {};

        if (input.name !== undefined) updates.name = input.name;
        if (input.status !== undefined) updates.status = input.status;
        if (input.destination_type !== undefined) updates.destination_type = input.destination_type;
        
        // NOTE: creative_data, copy_data, destination_data columns removed
        // Use normalized tables instead: ad_creatives, ad_copy_variations, ad_destinations

        const { data, error } = await supabase
          .from('ads')
          .update(updates)
          .eq('id', input.id)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: data as Ad,
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
    },
  };

  deleteAd = {
    async execute(adId: string): Promise<ServiceResult<void>> {
      try {
        const supabase = await createServerClient();
        const { error } = await supabase
          .from('ads')
          .delete()
          .eq('id', adId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'deletion_failed',
              message: error.message,
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
    },
  };

  listAds = {
    async execute(input: { campaignId: string; status?: Ad['status'] }): Promise<ServiceResult<Ad[]>> {
      try {
        const supabase = await createServerClient();
        let query = supabase
          .from('ads')
          .select('*')
          .eq('campaign_id', input.campaignId)
          .order('created_at', { ascending: false });

        if (input.status) {
          query = query.eq('status', input.status);
        }

        const { data, error } = await query;

        if (error) {
          return {
            success: false,
            error: {
              code: 'fetch_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: (data || []) as Ad[],
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
    },
  };

  saveSnapshot = {
    async execute(input: SaveAdSnapshotInput): Promise<ServiceResult<Ad>> {
      try {
        // NOTE: setup_snapshot column no longer exists
        // Snapshot data now stored in normalized tables (ad_creatives, ad_copy_variations, etc.)
        // This method is a stub for backwards compatibility
        
        console.warn('[ad-service-server] saveSnapshot called but setup_snapshot column removed');
        console.warn('[ad-service-server] Use normalized tables: ad_creatives, ad_copy_variations, ad_target_locations');
        
        // Return the ad without modification
        const supabase = await createServerClient();
        const { data: ad, error } = await supabase
          .from('ads')
          .select('*')
          .eq('id', input.adId)
          .single();

        if (error || !ad) {
          return {
            success: false,
            error: {
              code: 'not_found',
              message: 'Ad not found',
            },
          };
        }

        return {
          success: true,
          data: ad as Ad,
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
    },
  };

  getSnapshot = {
    async execute(adId: string): Promise<ServiceResult<AdSnapshot>> {
      try {
        // Use adDataService (single source of truth)
        const adData = await adDataService.getCompleteAdData(adId)
        
        if (!adData) {
          return {
            success: false,
            error: {
              code: 'not_found',
              message: 'Ad not found',
            },
          }
        }
        
        // Build snapshot from normalized tables
        const snapshot = adDataService.buildSnapshot(adData)
        
        return {
          success: true,
          data: snapshot as AdSnapshot,
        }
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'fetch_failed',
            message: error instanceof Error ? error.message : 'Failed to fetch snapshot',
          },
        }
      }
    },
  };

  publishAd = {
    async execute(input: PublishAdInput): Promise<ServiceResult<PublishAdResult>> {
      try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return {
            success: false,
            error: {
              code: 'unauthorized',
              message: 'User not authenticated',
            },
          };
        }

        // Use existing publisher
        const result = await publishSingleAd({
          campaignId: input.campaignId,
          adId: input.adId,
          userId: user.id,
        });

        if (!result.success) {
          return {
            success: false,
            error: {
              code: result.error?.code || 'publish_failed',
              message: result.error?.userMessage || result.error?.message || 'Failed to publish ad',
              details: result.error,
            },
          };
        }

        return {
          success: true,
          data: {
            meta_ad_id: result.metaAdId || '',
            status: result.status || 'pending_review',
            message: 'Ad published successfully',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'publish_failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  pauseAd = {
    async execute(adId: string): Promise<ServiceResult<Ad>> {
      try {
        const supabase = await createServerClient();
        const { data, error } = await supabase
          .from('ads')
          .update({ status: 'paused' })
          .eq('id', adId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: data as Ad,
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
    },
  };

  resumeAd = {
    async execute(adId: string): Promise<ServiceResult<Ad>> {
      try {
        const supabase = await createServerClient();
        const { data, error } = await supabase
          .from('ads')
          .update({ status: 'active' })
          .eq('id', adId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return {
          success: true,
          data: data as Ad,
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
    },
  };

  duplicateAd = {
    async execute(adId: string): Promise<ServiceResult<Ad>> {
      try {
        const supabase = await createServerClient();
        
        // Get original ad
        const { data: originalAd, error: fetchError } = await supabase
          .from('ads')
          .select('*')
          .eq('id', adId)
          .single();

        if (fetchError || !originalAd) {
          return {
            success: false,
            error: {
              code: 'not_found',
              message: 'Original ad not found',
            },
          };
        }

        // Create duplicate (only core fields - normalized data not duplicated)
        const { data: duplicated, error: createError } = await supabase
          .from('ads')
          .insert({
            campaign_id: originalAd.campaign_id,
            name: `${originalAd.name} (Copy)`,
            status: 'draft',
            destination_type: originalAd.destination_type,
          })
          .select()
          .single();
        
        // NOTE: creative_data, copy_data, setup_snapshot, destination_data columns removed
        // To fully duplicate an ad, also copy from normalized tables:
        // - ad_creatives, ad_copy_variations, ad_target_locations, ad_destinations, ad_budgets

        if (createError) {
          return {
            success: false,
            error: {
              code: 'creation_failed',
              message: createError.message,
            },
          };
        }

        return {
          success: true,
          data: duplicated as Ad,
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
    },
  };
}

// Export singleton instance
export const adServiceServer = new AdServiceServer();

