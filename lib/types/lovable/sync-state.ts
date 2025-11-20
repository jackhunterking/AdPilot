/**
 * Feature: Lovable Integration - Sync State Types
 * Purpose: Type definitions for data synchronization state management
 * References:
 *  - LovableSyncService: Business logic for sync
 *  - AdPilot is ALWAYS source of truth
 *  - Lovable provides only temporary image staging
 */

/**
 * Sync state for a Lovable project
 */
export interface SyncState {
  lovableProjectId: string;
  lastSyncTimestamp: number;
  pendingChanges: PendingChange[];
  syncStatus: SyncStatus;
  conflicts: SyncConflict[];
  metadata: SyncMetadata;
}

/**
 * Sync status
 */
export type SyncStatus = 
  | 'idle' 
  | 'syncing' 
  | 'sync_completed' 
  | 'sync_failed' 
  | 'conflict_detected';

/**
 * Pending change (not yet synced)
 */
export interface PendingChange {
  id: string;
  changeType: ChangeType;
  entityType: EntityType;
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}

export type ChangeType = 'create' | 'update' | 'delete' | 'import';
export type EntityType = 'campaign' | 'ad' | 'creative' | 'copy' | 'conversion';

/**
 * Sync conflict (should never happen - AdPilot always wins)
 */
export interface SyncConflict {
  id: string;
  entityType: EntityType;
  entityId: string;
  adpilotData: Record<string, unknown>;
  lovableData: Record<string, unknown>;
  resolution: ConflictResolution;
  resolvedAt?: number;
  detectedAt: number;
}

export type ConflictResolution = 
  | 'adpilot_wins' // Always this one
  | 'manual_review_required';

/**
 * Sync metadata
 */
export interface SyncMetadata {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSuccessfulSyncAt?: number;
  lastFailedSyncAt?: number;
  averageSyncDurationMs?: number;
}

/**
 * Image import record (tracking import from Lovable → AdPilot)
 */
export interface ImageImportRecord {
  id: string;
  lovableImageUrl: string; // Original URL in Lovable Storage
  adpilotImageUrl: string;  // URL in AdPilot Storage (source of truth)
  campaignId: string;
  creativeId: string;
  importedAt: string;
  importStatus: ImportStatus;
  metadata: ImageImportMetadata;
}

export type ImportStatus = 
  | 'pending' 
  | 'downloading' 
  | 'uploading' 
  | 'completed' 
  | 'failed';

export interface ImageImportMetadata {
  originalBucket: string;
  originalName: string;
  fileSize?: number;
  mimeType?: string;
  prompt?: string;
  generatedBy?: 'lovable_ai' | 'user_upload';
  lovableStillExists?: boolean; // Optional check
  [key: string]: unknown;
}

/**
 * Sync operation result
 */
export interface SyncResult<T = unknown> {
  success: boolean;
  data?: T;
  syncDurationMs: number;
  changesApplied: number;
  conflictsDetected: number;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Image existence check result (non-blocking)
 */
export interface ImageExistenceCheck {
  creativeId: string;
  lovableImageUrl: string;
  exists: boolean;
  checkedAt: number;
  statusCode?: number;
  error?: string;
}

