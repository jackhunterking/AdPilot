/**
 * Feature: Post-Publish Verifier
 * Purpose: Verify published ads exist on Meta and are in expected state
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 *  - Campaign Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group
 */

import { createPublishLogger } from './observability/publish-logger';
import { createMetaAPIClient } from './publishing/meta-api-client';
import { getConnectionWithToken } from './service';
import type { PublishResult } from './types/publishing';

// ============================================================================
// TYPES
// ============================================================================

export interface VerificationResult {
  success: boolean;
  campaignExists: boolean;
  adsetExists: boolean;
  allAdsExist: boolean;
  campaignStatus?: string;
  adsetStatus?: string;
  adStatuses?: string[];
  warnings: string[];
  errors: string[];
}

// ============================================================================
// POST-PUBLISH VERIFIER
// ============================================================================

export class PostPublishVerifier {
  /**
   * Verify a published campaign exists on Meta
   */
  async verify(
    campaignId: string,
    publishResult: PublishResult
  ): Promise<VerificationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Get Meta connection
      const connection = await getConnectionWithToken({ campaignId });

      if (!connection || !connection.long_lived_user_token) {
        throw new Error('Meta connection not found');
      }

      // Create API client
      const logger = createPublishLogger(campaignId);
      const apiClient = createMetaAPIClient(connection.long_lived_user_token, logger);

      // ====================================================================
      // VERIFY CAMPAIGN
      // ====================================================================
      let campaignExists = false;
      let campaignStatus: string | undefined;

      try {
        const campaign = await apiClient.getObject<{ id: string; name: string; status: string }>(
          publishResult.metaCampaignId,
          ['id', 'name', 'status']
        );

        campaignExists = !!campaign.id;
        campaignStatus = campaign.status;

        logger.logStageComplete('VERIFYING', {
          operation: 'verify_campaign',
          campaignId: campaign.id,
          status: campaign.status
        });
      } catch (error) {
        errors.push(`Campaign verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // ====================================================================
      // VERIFY ADSET
      // ====================================================================
      let adsetExists = false;
      let adsetStatus: string | undefined;

      try {
        const adset = await apiClient.getObject<{ id: string; name: string; status: string }>(
          publishResult.metaAdSetId,
          ['id', 'name', 'status']
        );

        adsetExists = !!adset.id;
        adsetStatus = adset.status;

        logger.logStageComplete('VERIFYING', {
          operation: 'verify_adset',
          adsetId: adset.id,
          status: adset.status
        });
      } catch (error) {
        errors.push(`AdSet verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // ====================================================================
      // VERIFY ADS
      // ====================================================================
      const adStatuses: string[] = [];
      let allAdsExist = true;

      for (const adId of publishResult.metaAdIds) {
        try {
          const ad = await apiClient.getObject<{ id: string; name: string; status: string }>(
            adId,
            ['id', 'name', 'status']
          );

          if (ad.id) {
            adStatuses.push(ad.status);
            
            logger.logStageComplete('VERIFYING', {
              operation: 'verify_ad',
              adId: ad.id,
              status: ad.status
            });
          } else {
            allAdsExist = false;
            errors.push(`Ad ${adId} not found`);
          }
        } catch (error) {
          allAdsExist = false;
          errors.push(`Ad ${adId} verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // ====================================================================
      // CHECK FOR WARNINGS
      // ====================================================================
      
      // Warn if any object is not in expected PAUSED state
      if (campaignStatus && campaignStatus !== 'PAUSED') {
        warnings.push(`Campaign status is ${campaignStatus}, expected PAUSED`);
      }

      if (adsetStatus && adsetStatus !== 'PAUSED') {
        warnings.push(`AdSet status is ${adsetStatus}, expected PAUSED`);
      }

      adStatuses.forEach((status, index) => {
        if (status !== 'PAUSED') {
          warnings.push(`Ad ${index + 1} status is ${status}, expected PAUSED`);
        }
      });

      // ====================================================================
      // RETURN RESULTS
      // ====================================================================
      const success = campaignExists && adsetExists && allAdsExist && errors.length === 0;

      return {
        success,
        campaignExists,
        adsetExists,
        allAdsExist,
        campaignStatus,
        adsetStatus,
        adStatuses,
        warnings,
        errors
      };

    } catch (error) {
      return {
        success: false,
        campaignExists: false,
        adsetExists: false,
        allAdsExist: false,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Verification failed']
      };
    }
  }

  /**
   * Quick verification check (just checks existence)
   */
  async quickVerify(
    campaignId: string,
    metaCampaignId: string
  ): Promise<boolean> {
    try {
      const connection = await getConnectionWithToken({ campaignId });

      if (!connection || !connection.long_lived_user_token) {
        return false;
      }

      const logger = createPublishLogger(campaignId);
      const apiClient = createMetaAPIClient(connection.long_lived_user_token, logger);

      const campaign = await apiClient.getObject(metaCampaignId, ['id']);

      return !!(campaign as { id?: string }).id;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a verifier instance
 */
export function createPostPublishVerifier(): PostPublishVerifier {
  return new PostPublishVerifier();
}

/**
 * Verify a published campaign
 */
export async function verifyPublishedCampaign(
  campaignId: string,
  publishResult: PublishResult
): Promise<VerificationResult> {
  const verifier = new PostPublishVerifier();
  return await verifier.verify(campaignId, publishResult);
}

/**
 * Quick check if campaign exists on Meta
 */
export async function campaignExistsOnMeta(
  campaignId: string,
  metaCampaignId: string
): Promise<boolean> {
  const verifier = new PostPublishVerifier();
  return await verifier.quickVerify(campaignId, metaCampaignId);
}

