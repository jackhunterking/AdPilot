/**
 * Feature: Rollback Manager
 * Purpose: Rollback partially created campaigns on failure
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 */

import type { PublishLogger } from '../observability/publish-logger';
import { MetaAPIClient } from './meta-api-client';
import type { CreatedMetaObjects } from '../types/publishing';

// ============================================================================
// TYPES
// ============================================================================

export interface RollbackResult {
  success: boolean;
  deletedObjects: string[];
  failedDeletions: Array<{ objectId: string; error: string }>;
  warnings: string[];
}

// ============================================================================
// ROLLBACK MANAGER CLASS
// ============================================================================

export class RollbackManager {
  private apiClient: MetaAPIClient;
  private logger: PublishLogger;

  constructor(apiClient: MetaAPIClient, logger: PublishLogger) {
    this.apiClient = apiClient;
    this.logger = logger;
  }

  /**
   * Rollback all created Meta objects
   * Deletes in reverse order: Ads → AdSet → Campaign → Creatives
   */
  async rollback(createdObjects: CreatedMetaObjects): Promise<RollbackResult> {
    const deletedObjects: string[] = [];
    const failedDeletions: Array<{ objectId: string; error: string }> = [];
    const warnings: string[] = [];

    this.logger.logRollbackStart('Publishing failed', createdObjects as unknown as Record<string, unknown>);

    // Delete Ads (if any)
    if (createdObjects.adIds && createdObjects.adIds.length > 0) {
      for (const adId of createdObjects.adIds) {
        try {
          await this.apiClient.deleteObject(adId);
          deletedObjects.push(`Ad: ${adId}`);
          this.logger.logStageComplete('ROLLING_BACK', { operation: 'delete_ad', adId });
        } catch (error) {
          const err = error instanceof Error ? error.message : 'Unknown error';
          failedDeletions.push({ objectId: adId, error: err });
          warnings.push(`Failed to delete Ad ${adId}: ${err}`);
          this.logger.logWarning(`Failed to delete Ad ${adId}`, { error: err });
        }
      }
    }

    // Delete AdSet (if created)
    if (createdObjects.adSetId) {
      try {
        await this.apiClient.deleteObject(createdObjects.adSetId);
        deletedObjects.push(`AdSet: ${createdObjects.adSetId}`);
        this.logger.logStageComplete('ROLLING_BACK', { operation: 'delete_adset', adSetId: createdObjects.adSetId });
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown error';
        failedDeletions.push({ objectId: createdObjects.adSetId, error: err });
        warnings.push(`Failed to delete AdSet ${createdObjects.adSetId}: ${err}`);
        this.logger.logWarning(`Failed to delete AdSet ${createdObjects.adSetId}`, { error: err });
      }
    }

    // Delete Campaign (if created)
    if (createdObjects.campaignId) {
      try {
        await this.apiClient.deleteObject(createdObjects.campaignId);
        deletedObjects.push(`Campaign: ${createdObjects.campaignId}`);
        this.logger.logStageComplete('ROLLING_BACK', { operation: 'delete_campaign', campaignId: createdObjects.campaignId });
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown error';
        failedDeletions.push({ objectId: createdObjects.campaignId, error: err });
        warnings.push(`Failed to delete Campaign ${createdObjects.campaignId}: ${err}`);
        this.logger.logWarning(`Failed to delete Campaign ${createdObjects.campaignId}`, { error: err });
      }
    }

    // Delete Creatives (if any)
    // Note: Creatives can usually be left (they don't cost money until used in ads)
    // But we'll attempt to delete them for cleanliness
    if (createdObjects.creativeIds && createdObjects.creativeIds.length > 0) {
      for (const creativeId of createdObjects.creativeIds) {
        try {
          await this.apiClient.deleteObject(creativeId);
          deletedObjects.push(`Creative: ${creativeId}`);
          this.logger.logStageComplete('ROLLING_BACK', { operation: 'delete_creative', creativeId });
        } catch (error) {
          const err = error instanceof Error ? error.message : 'Unknown error';
          // Don't add to failedDeletions - creative deletion is optional
          warnings.push(`Could not delete Creative ${creativeId} (this is usually OK): ${err}`);
        }
      }
    }

    // Note: Images are not deleted - they can be reused

    const success = failedDeletions.length === 0;

    this.logger.logRollbackComplete({
      deletedCount: deletedObjects.length,
      failedCount: failedDeletions.length,
      deleted: deletedObjects
    });

    return {
      success,
      deletedObjects,
      failedDeletions,
      warnings
    };
  }

  /**
   * Rollback with retry for failed deletions
   */
  async rollbackWithRetry(
    createdObjects: CreatedMetaObjects,
    maxRetries: number = 2
  ): Promise<RollbackResult> {
    let result = await this.rollback(createdObjects);
    let retryCount = 0;

    // Retry failed deletions
    while (result.failedDeletions.length > 0 && retryCount < maxRetries) {
      retryCount++;

      this.logger.logWarning(`Retrying ${result.failedDeletions.length} failed deletions (attempt ${retryCount}/${maxRetries})`);

      // Wait before retry
      await this.sleep(2000 * retryCount); // 2s, 4s

      // Retry failed deletions only
      for (const failed of result.failedDeletions) {
        try {
          await this.apiClient.deleteObject(failed.objectId);
          result.deletedObjects.push(failed.objectId);
          // Remove from failed list
          result.failedDeletions = result.failedDeletions.filter(f => f.objectId !== failed.objectId);
        } catch {
          // Still failed, keep in failed list
        }
      }
    }

    result.success = result.failedDeletions.length === 0;
    return result;
  }

  /**
   * Partial rollback (only specific objects)
   */
  async rollbackPartial(objectIds: string[]): Promise<RollbackResult> {
    const deletedObjects: string[] = [];
    const failedDeletions: Array<{ objectId: string; error: string }> = [];

    for (const objectId of objectIds) {
      try {
        await this.apiClient.deleteObject(objectId);
        deletedObjects.push(objectId);
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown error';
        failedDeletions.push({ objectId, error: err });
      }
    }

    return {
      success: failedDeletions.length === 0,
      deletedObjects,
      failedDeletions,
      warnings: []
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a rollback manager instance
 */
export function createRollbackManager(
  apiClient: MetaAPIClient,
  logger: PublishLogger
): RollbackManager {
  return new RollbackManager(apiClient, logger);
}

/**
 * Execute rollback for created objects
 */
export async function executeRollback(
  apiClient: MetaAPIClient,
  logger: PublishLogger,
  createdObjects: CreatedMetaObjects
): Promise<RollbackResult> {
  const manager = new RollbackManager(apiClient, logger);
  return await manager.rollback(createdObjects);
}

