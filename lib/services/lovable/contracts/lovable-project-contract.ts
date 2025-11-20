/**
 * Feature: Lovable Integration - Project Service Contract
 * Purpose: Contract for Lovable project management service
 * References:
 *  - AdPilot owns all project links and campaign associations
 *  - Manages subscription status per project
 */

import type {
  ServiceResult,
  LovableProjectLink,
  LinkProjectInput,
} from '@/lib/types/lovable/project';

/**
 * Service contract for Lovable project management
 * 
 * Responsibilities:
 * - Manage project links (create, update, deactivate)
 * - Get project metadata and stats
 * - Validate project ownership
 */
export interface LovableProjectServiceContract {
  /**
   * Create new project link
   */
  createProjectLink(input: LinkProjectInput): Promise<ServiceResult<LovableProjectLink>>;
  
  /**
   * Get project link by Lovable project ID
   */
  getProjectLink(
    lovableProjectId: string,
    userId: string
  ): Promise<ServiceResult<LovableProjectLink | null>>;
  
  /**
   * Get all project links for user
   */
  getUserProjectLinks(userId: string): Promise<ServiceResult<LovableProjectLink[]>>;
  
  /**
   * Update project metadata
   */
  updateProjectMetadata(
    lovableProjectId: string,
    userId: string,
    metadata: Record<string, unknown>
  ): Promise<ServiceResult<LovableProjectLink>>;
  
  /**
   * Deactivate project link (soft delete)
   */
  deactivateProjectLink(
    lovableProjectId: string,
    userId: string
  ): Promise<ServiceResult<void>>;
  
  /**
   * Check if user owns project
   */
  validateProjectOwnership(
    lovableProjectId: string,
    userId: string
  ): Promise<boolean>;
  
  /**
   * Get project statistics
   */
  getProjectStats(
    lovableProjectId: string,
    userId: string
  ): Promise<ServiceResult<ProjectStats>>;
}

/**
 * Project statistics
 */
export interface ProjectStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalAds: number;
  totalConversions: number;
  totalSpend: number;
  conversionRate: number;
  lastActivityAt: string | null;
}

