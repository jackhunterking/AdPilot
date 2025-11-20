/**
 * Feature: Lovable Integration - Project Service Implementation
 * Purpose: Manage Lovable project links and metadata
 * References:
 *  - Contract: lib/services/lovable/contracts/lovable-project-contract.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LovableProjectServiceContract,
  ProjectStats,
} from './contracts/lovable-project-contract';
import type {
  ServiceResult,
  LovableProjectLink,
  LinkProjectInput,
} from '@/lib/types/lovable';

/**
 * Lovable Project Service
 * 
 * Manages project links, metadata, and stats
 */
export class LovableProjectService implements LovableProjectServiceContract {
  constructor(
    private readonly supabase: SupabaseClient
  ) {}

  /**
   * Create new project link
   */
  async createProjectLink(
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
        if (error.code === '23505') {
          return {
            success: false,
            error: {
              code: 'already_linked',
              message: 'This project is already linked'
            }
          };
        }

        return {
          success: false,
          error: {
            code: 'db_error',
            message: error.message
          }
        };
      }

      return {
        success: true,
        data: this.mapToProjectLink(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'create_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get project link by Lovable project ID
   */
  async getProjectLink(
    lovableProjectId: string,
    userId: string
  ): Promise<ServiceResult<LovableProjectLink | null>> {
    try {
      const { data, error } = await this.supabase
        .from('lovable_project_links')
        .select('*')
        .eq('lovable_project_id', lovableProjectId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }

        return {
          success: false,
          error: {
            code: 'db_error',
            message: error.message
          }
        };
      }

      return {
        success: true,
        data: this.mapToProjectLink(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'get_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get all project links for user
   */
  async getUserProjectLinks(
    userId: string
  ): Promise<ServiceResult<LovableProjectLink[]>> {
    try {
      const { data, error } = await this.supabase
        .from('lovable_project_links')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: error.message
          }
        };
      }

      return {
        success: true,
        data: data.map(d => this.mapToProjectLink(d))
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'list_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Update project metadata
   */
  async updateProjectMetadata(
    lovableProjectId: string,
    userId: string,
    metadata: Record<string, unknown>
  ): Promise<ServiceResult<LovableProjectLink>> {
    try {
      const { data, error } = await this.supabase
        .from('lovable_project_links')
        .update({ metadata })
        .eq('lovable_project_id', lovableProjectId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: error.message
          }
        };
      }

      return {
        success: true,
        data: this.mapToProjectLink(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'update_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Deactivate project link (soft delete)
   */
  async deactivateProjectLink(
    lovableProjectId: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('lovable_project_links')
        .update({ status: 'inactive' })
        .eq('lovable_project_id', lovableProjectId)
        .eq('user_id', userId);

      if (error) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: error.message
          }
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'deactivate_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check if user owns project
   */
  async validateProjectOwnership(
    lovableProjectId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('lovable_project_links')
        .select('id')
        .eq('lovable_project_id', lovableProjectId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(
    lovableProjectId: string,
    userId: string
  ): Promise<ServiceResult<ProjectStats>> {
    try {
      // Get campaigns for project
      const { data: campaigns, error: campaignError } = await this.supabase
        .from('campaigns')
        .select('id, status, created_at')
        .eq('user_id', userId)
        .eq('metadata->>lovable_project_id', lovableProjectId);

      if (campaignError) {
        return {
          success: false,
          error: {
            code: 'db_error',
            message: campaignError.message
          }
        };
      }

      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;

      // Get ads count
      const campaignIds = campaigns?.map(c => c.id) || [];
      let totalAds = 0;

      if (campaignIds.length > 0) {
        const { count } = await this.supabase
          .from('ads')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds);

        totalAds = count || 0;
      }

      // Get conversions count
      let totalConversions = 0;
      
      if (campaignIds.length > 0) {
        const { count } = await this.supabase
          .from('campaign_conversions')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds);

        totalConversions = count || 0;
      }

      // Get total spend from metrics
      let totalSpend = 0;
      
      if (campaignIds.length > 0) {
        const { data: metrics } = await this.supabase
          .from('campaign_metrics_cache')
          .select('spend')
          .in('campaign_id', campaignIds);

        totalSpend = metrics?.reduce((sum, m) => sum + (Number(m.spend) || 0), 0) || 0;
      }

      // Calculate conversion rate
      const { data: metricsData } = await this.supabase
        .from('campaign_metrics_cache')
        .select('clicks')
        .in('campaign_id', campaignIds);

      const totalClicks = metricsData?.reduce((sum, m) => sum + (Number(m.clicks) || 0), 0) || 0;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      // Get last activity
      const lastActivityAt = campaigns?.length
        ? campaigns.reduce((latest, c) => {
            return !latest || c.created_at > latest ? c.created_at : latest;
          }, null as string | null)
        : null;

      return {
        success: true,
        data: {
          totalCampaigns,
          activeCampaigns,
          totalAds,
          totalConversions,
          totalSpend: Math.round(totalSpend * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          lastActivityAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'stats_failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private mapToProjectLink(data: any): LovableProjectLink {
    return {
      id: data.id,
      userId: data.user_id,
      lovableProjectId: data.lovable_project_id,
      supabaseUrl: data.supabase_url,
      status: data.status,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

