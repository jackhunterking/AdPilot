/**
 * Feature: Lovable Integration - Project Types
 * Purpose: Type definitions for Lovable project linking and management
 * References:
 *  - AdPilot Microservices: Lovable service layer types
 *  - Chrome Extension Bridge: postMessage contract types
 */

/**
 * Lovable project link stored in AdPilot database
 * This links a Lovable project to an AdPilot user account
 */
export interface LovableProjectLink {
  id: string;
  userId: string;
  lovableProjectId: string;
  supabaseUrl?: string;
  status: 'active' | 'inactive' | 'suspended';
  metadata: LovableProjectMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface LovableProjectMetadata {
  projectName?: string;
  projectUrl?: string;
  lastSyncedAt?: string;
  totalCampaigns?: number;
  totalConversions?: number;
  [key: string]: unknown;
}

/**
 * Input for linking a Lovable project to AdPilot
 */
export interface LinkProjectInput {
  userId: string;
  lovableProjectId: string;
  supabaseUrl?: string;
  metadata?: Partial<LovableProjectMetadata>;
}

/**
 * Lovable project context detected by extension
 */
export interface LovableProjectContext {
  lovableProjectId: string;
  lovableProjectUrl: string;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  timestamp: number;
}

/**
 * Lovable image detected in user's Supabase Storage
 * Temporary staging - will be copied to AdPilot storage
 */
export interface LovableImage {
  bucket: string;
  name: string;
  url: string;
  createdAt: string;
  size?: number;
  metadata?: {
    prompt?: string;
    generatedBy?: 'lovable_ai' | 'user_upload';
    [key: string]: unknown;
  };
}

/**
 * Campaign snapshot with all related data
 * Loaded from AdPilot database (source of truth)
 */
export interface CampaignSnapshot {
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>;
  ads: Array<{
    id: string;
    campaignId: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
  creatives: Array<{
    id: string;
    adId: string;
    imageUrl: string;
    creativeFormat: string;
    metadata: Record<string, unknown>;
  }>;
  imageStatus: Record<string, boolean>; // creative.id → still exists in Lovable (optional check)
}

/**
 * Result type for service operations
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

