/**
 * Feature: Publishing Orchestrator
 * Purpose: Main orchestrator coordinating the complete ad publishing flow
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 *  - Campaign Structure: https://developers.facebook.com/docs/marketing-api/campaign-structure
 * 
 * Integrates:
 *  - Phase 1: Types, Config, Logging
 *  - Phase 2: Image Upload System
 *  - Phase 3: Creative Generation
 *  - Phase 4: Campaign Data Transformation
 *  - Phase 5: API Client, State Machine
 */

import type { PublishLogger } from '../observability/publish-logger';
import { createPublishLogger } from '../observability/publish-logger';
import { MetaAPIClient, createMetaAPIClient } from './meta-api-client';
import { PublishStateMachine, createPublishStateMachine } from './publish-state-machine';
import { ImageUploadOrchestrator, createUploadOrchestrator } from '../image-management/upload-orchestrator';
import { CreativePayloadGenerator } from '../creative-generation/creative-payload-generator';
import { PayloadValidator } from '../payload-transformation/payload-validator';
import type { 
  PublishResult, 
  PublishData, 
  GoalType,
  DestinationType,
  PublishError 
} from '../types/publishing';
import { supabaseServer } from '../../supabase/server';
import { getConnectionWithToken } from '../service';

// ============================================================================
// TYPES
// ============================================================================

export interface PublishParams {
  campaignId: string;
  userId: string;
}

export interface CampaignPublishData {
  campaignName: string;
  goal: GoalType;
  destinationType: DestinationType;
  pageId: string;
  instagramActorId?: string | null;
  adAccountId: string;
  token: string;
  publishData: PublishData;
  adCopyVariations: Array<{
    primaryText: string;
    headline: string;
    description?: string;
  }>;
  imageUrls: string[];
  destinationUrl?: string;
  leadFormId?: string;
  phoneNumber?: string;
}

// ============================================================================
// PUBLISHING ORCHESTRATOR CLASS
// ============================================================================

export class PublishOrchestrator {
  private logger: PublishLogger;
  private stateMachine: PublishStateMachine;
  private apiClient?: MetaAPIClient;
  private imageUploader?: ImageUploadOrchestrator;

  constructor(campaignId: string, logger?: PublishLogger) {
    this.logger = logger || createPublishLogger(campaignId, true);
    this.stateMachine = createPublishStateMachine(campaignId);
  }

  /**
   * Execute complete publishing flow
   */
  async publish(params: PublishParams): Promise<PublishResult> {
    this.logger.logStageStart('PREPARING', { campaignId: params.campaignId });

    try {
      // ====================================================================
      // STEP 1: LOAD AND VALIDATE CAMPAIGN DATA
      // ====================================================================
      await this.stateMachine.transitionTo('PREPARING', 'Loading campaign data');

      const publishData = await this.loadCampaignData(params.campaignId);

      // ====================================================================
      // STEP 2: VALIDATE PUBLISH DATA
      // ====================================================================
      await this.stateMachine.transitionTo('VALIDATING', 'Validating campaign configuration');

      const validator = new PayloadValidator();
      const validationResult = validator.validate(publishData.publishData);

      if (!validationResult.canPublish) {
        throw this.createPublishError(
          'VALIDATION_FAILED',
          `Validation failed: ${validationResult.errors[0]?.message}`,
          'Please complete all required campaign setup steps',
          'VALIDATING',
          true
        );
      }

      // Initialize API client and image uploader
      this.apiClient = createMetaAPIClient(publishData.token, this.logger);
      this.imageUploader = createUploadOrchestrator(publishData.token, publishData.adAccountId, this.logger);

      // ====================================================================
      // STEP 3: UPLOAD IMAGES TO META
      // ====================================================================
      await this.stateMachine.transitionTo('UPLOADING_IMAGES', `Uploading ${publishData.imageUrls.length} image(s)`);

      const imageUploadResult = await this.imageUploader.uploadImagesWithRetry(
        publishData.imageUrls,
        'feed',
        3, // 3 concurrent uploads
        2 // 2 retries
      );

      if (imageUploadResult.failed.size > 0) {
        this.logger.logWarning(`${imageUploadResult.failed.size} image(s) failed to upload`, {
          failedCount: imageUploadResult.failed.size,
          successCount: imageUploadResult.successful.size
        });
      }

      // Store image hashes
      imageUploadResult.successful.forEach((result) => {
        this.stateMachine.storeCreatedObject('imageHash', result.metaResult.hash);
      });

      const imageHashMapping = this.imageUploader.getImageHashMapping(imageUploadResult);

      // ====================================================================
      // STEP 4: CREATE AD CREATIVES
      // ====================================================================
      await this.stateMachine.transitionTo('CREATING_CREATIVES', `Creating ${publishData.adCopyVariations.length} creative(s)`);

      const creativeGenerator = new CreativePayloadGenerator();
      const creativeIds: string[] = [];

      for (let i = 0; i < publishData.adCopyVariations.length; i++) {
        const variation = publishData.adCopyVariations[i];
        if (!variation) continue;
        
        const imageUrl = publishData.imageUrls[i] || publishData.imageUrls[0] || '';
        if (!imageUrl) {
          throw new Error(`No image URL available for variation ${i + 1}`);
        }
        
        const imageHash = imageHashMapping.get(imageUrl);

        const creativeResult = creativeGenerator.generate({
          pageId: publishData.pageId,
          instagramActorId: publishData.instagramActorId,
          goal: publishData.goal,
          destinationType: publishData.destinationType,
          destinationUrl: publishData.destinationUrl,
          leadFormId: publishData.leadFormId,
          phoneNumber: publishData.phoneNumber,
          primaryText: variation.primaryText,
          headline: variation.headline,
          description: variation.description,
          imageHash: imageHash,
          variationIndex: i
        });

        // Create creative via API
        const creativeResponse = await this.apiClient!.createAdCreative(
          publishData.adAccountId,
          creativeResult.payload as unknown as Record<string, unknown>
        );

        if (!creativeResponse.id) {
          throw new Error(`Creative creation did not return an ID for variation ${i + 1}`);
        }

        creativeIds.push(creativeResponse.id);
        this.stateMachine.storeCreatedObject('creativeId', creativeResponse.id);

        this.logger.logStageComplete('CREATING_CREATIVES', {
          operation: `creative_${i + 1}`,
          creativeId: creativeResponse.id
        });
      }

      // ====================================================================
      // STEP 5: CREATE CAMPAIGN
      // ====================================================================
      await this.stateMachine.transitionTo('CREATING_CAMPAIGN', 'Creating Meta campaign');

      const campaignResponse = await this.apiClient!.createCampaign(
        publishData.adAccountId,
        publishData.publishData.campaign as unknown as Record<string, unknown>
      );

      if (!campaignResponse.id) {
        throw new Error('Campaign creation did not return an ID');
      }

      this.stateMachine.storeCreatedObject('campaignId', campaignResponse.id);

      this.logger.logStageComplete('CREATING_CAMPAIGN', {
        metaCampaignId: campaignResponse.id
      });

      // ====================================================================
      // STEP 6: CREATE AD SET
      // ====================================================================
      await this.stateMachine.transitionTo('CREATING_ADSET', 'Creating ad set');

      const adsetPayload = {
        ...publishData.publishData.adset,
        campaign_id: campaignResponse.id
      };

      const adsetResponse = await this.apiClient!.createAdSet(
        publishData.adAccountId,
        adsetPayload
      );

      if (!adsetResponse.id) {
        throw new Error('AdSet creation did not return an ID');
      }

      this.stateMachine.storeCreatedObject('adSetId', adsetResponse.id);

      this.logger.logStageComplete('CREATING_ADSET', {
        metaAdSetId: adsetResponse.id
      });

      // ====================================================================
      // STEP 7: CREATE ADS
      // ====================================================================
      await this.stateMachine.transitionTo('CREATING_ADS', `Creating ${creativeIds.length} ad(s)`);

      const metaAdIds: string[] = [];

      for (let i = 0; i < creativeIds.length; i++) {
        const adPayload = {
          ...publishData.publishData.ads[i],
          adset_id: adsetResponse.id,
          creative: { creative_id: creativeIds[i] }
        };

        const adResponse = await this.apiClient!.createAd(
          publishData.adAccountId,
          adPayload
        );

        if (!adResponse.id) {
          throw new Error(`Ad creation did not return an ID for ad ${i + 1}`);
        }

        metaAdIds.push(adResponse.id);
        this.stateMachine.storeCreatedObject('adId', adResponse.id);

        this.logger.logStageComplete('CREATING_ADS', {
          operation: `ad_${i + 1}`,
          metaAdId: adResponse.id
        });
      }

      // ====================================================================
      // STEP 8: VERIFY CREATION
      // ====================================================================
      await this.stateMachine.transitionTo('VERIFYING', 'Verifying campaign creation');

      // Verify all objects were created
      await this.verifyCampaign(campaignResponse.id);
      await this.verifyAdSet(adsetResponse.id);

      for (const adId of metaAdIds) {
        await this.verifyAd(adId);
      }

      this.stateMachine.completeOperation('verification');

      // ====================================================================
      // STEP 9: UPDATE DATABASE
      // ====================================================================
      await this.updateDatabase(params.campaignId, {
        metaCampaignId: campaignResponse.id,
        metaAdSetId: adsetResponse.id,
        metaAdIds
      });

      // ====================================================================
      // STEP 10: COMPLETE
      // ====================================================================
      await this.stateMachine.transitionTo('COMPLETE', 'Campaign published successfully');

      this.logger.logPublishSuccess(campaignResponse.id, adsetResponse.id, metaAdIds);

      return {
        success: true,
        metaCampaignId: campaignResponse.id,
        metaAdSetId: adsetResponse.id,
        metaAdIds,
        publishStatus: 'paused',
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      return await this.handlePublishError(error, params.campaignId);
    }
  }

  /**
   * Load all campaign data needed for publishing
   */
  private async loadCampaignData(campaignId: string): Promise<CampaignPublishData> {
    // Load campaign
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('*, campaign_states(*)')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Load Meta connection
    const connection = await getConnectionWithToken({ campaignId });

    if (!connection || !connection.long_lived_user_token) {
      throw new Error('Meta connection not found. Please connect your Facebook account.');
    }

    // Load publish_data
    const { data: stateRow } = await supabaseServer
      .from('campaign_states')
      .select('publish_data, goal_data, ad_copy_data, ad_preview_data')
      .eq('campaign_id', campaignId)
      .single();

    if (!stateRow?.publish_data) {
      throw new Error('Campaign not prepared for publishing. Please run prepare-publish first.');
    }

    // Extract data with proper type checking
    const publishDataRaw = stateRow.publish_data;
    if (!publishDataRaw || typeof publishDataRaw !== 'object') {
      throw new Error('Invalid publish_data format');
    }

    const publishData = publishDataRaw as unknown as PublishData;
    const goalData = (stateRow.goal_data || {}) as { 
      selectedGoal?: GoalType; 
      formData?: {
        id?: string;
        websiteUrl?: string;
        phoneNumber?: string;
      };
    };
    const adCopyData = (stateRow.ad_copy_data || {}) as { customCopyVariations?: Array<{ primaryText: string; headline: string; description?: string }> };
    const adPreviewData = (stateRow.ad_preview_data || {}) as { adContent?: { imageVariations?: string[] } };

    if (!goalData.selectedGoal) {
      throw new Error('Goal not found in campaign data');
    }

    // Extract destination type and configuration based on goal
    const goal = goalData.selectedGoal;
    let destinationType: DestinationType;
    let destinationUrl: string | undefined;
    let leadFormId: string | undefined;
    let phoneNumber: string | undefined;

    if (goal === 'leads') {
      // Lead generation - check if using instant form
      if (goalData.formData?.id) {
        destinationType = 'form';
        leadFormId = goalData.formData.id;
        destinationUrl = goalData.formData.websiteUrl; // Fallback URL for form
      } else {
        // Fallback to website if no form
        destinationType = 'website';
        destinationUrl = goalData.formData?.websiteUrl || 'https://example.com';
      }
    } else if (goal === 'calls') {
      destinationType = 'call';
      phoneNumber = goalData.formData?.phoneNumber;
      
      if (!phoneNumber) {
        throw new Error('Phone number required for call campaign but not found in goal data');
      }
    } else {
      // website-visits
      destinationType = 'website';
      destinationUrl = goalData.formData?.websiteUrl;
      
      if (!destinationUrl) {
        throw new Error('Website URL required for website visits campaign but not found in goal data');
      }
    }

    return {
      campaignName: campaign.name,
      goal: goalData.selectedGoal,
      destinationType,
      pageId: connection.selected_page_id!,
      instagramActorId: connection.selected_ig_user_id,
      adAccountId: connection.selected_ad_account_id!,
      token: connection.long_lived_user_token,
      publishData,
      adCopyVariations: adCopyData.customCopyVariations || [],
      imageUrls: adPreviewData.adContent?.imageVariations || [],
      destinationUrl,
      leadFormId,
      phoneNumber
    };
  }

  /**
   * Verify campaign was created
   */
  private async verifyCampaign(campaignId: string): Promise<void> {
    const campaign = await this.apiClient!.getObject(campaignId, ['id', 'name', 'status']);

    if (!campaign) {
      throw new Error('Campaign verification failed');
    }

    this.logger.logProgress('VERIFYING', 30, 'Campaign verified', { campaignId });
  }

  /**
   * Verify ad set was created
   */
  private async verifyAdSet(adsetId: string): Promise<void> {
    const adset = await this.apiClient!.getObject(adsetId, ['id', 'name', 'status']);

    if (!adset) {
      throw new Error('AdSet verification failed');
    }

    this.logger.logProgress('VERIFYING', 60, 'Ad set verified', { adsetId });
  }

  /**
   * Verify ad was created
   */
  private async verifyAd(adId: string): Promise<void> {
    const ad = await this.apiClient!.getObject(adId, ['id', 'name', 'status']);

    if (!ad) {
      throw new Error('Ad verification failed');
    }

    this.logger.logProgress('VERIFYING', 90, 'Ad verified', { adId });
  }

  /**
   * Update database with Meta IDs
   */
  private async updateDatabase(
    campaignId: string,
    result: { metaCampaignId: string; metaAdSetId: string; metaAdIds: string[] }
  ): Promise<void> {
    const nowIso = new Date().toISOString();

    // Update meta_published_campaigns
    await supabaseServer
      .from('meta_published_campaigns')
      .upsert({
        campaign_id: campaignId,
        meta_campaign_id: result.metaCampaignId,
        meta_adset_id: result.metaAdSetId,
        meta_ad_ids: result.metaAdIds,
        publish_status: 'active',
        published_at: nowIso,
        error_message: null,
        paused_at: null,
        updated_at: nowIso
      }, { onConflict: 'campaign_id' });

    // Update campaigns table
    await supabaseServer
      .from('campaigns')
      .update({
        published_status: 'active',
        updated_at: nowIso
      })
      .eq('id', campaignId);

    // Update individual ads with Meta IDs
    const { data: ads } = await supabaseServer
      .from('ads')
      .select('id')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (ads) {
      for (let i = 0; i < ads.length && i < result.metaAdIds.length; i++) {
        const ad = ads[i];
        const metaAdId = result.metaAdIds[i];
        
        if (!ad || !metaAdId) continue;
        
        await supabaseServer
          .from('ads')
          .update({
            meta_ad_id: metaAdId,
            status: 'paused',
            published_at: nowIso,
            updated_at: nowIso
          })
          .eq('id', ad.id);
      }
    }
  }

  /**
   * Handle publishing errors
   */
  private async handlePublishError(error: unknown, campaignId: string): Promise<never> {
    const err = error instanceof Error ? error : new Error('Unknown error');

    const publishError = this.createPublishError(
      'PUBLISH_FAILED',
      err.message,
      'Publishing failed. Please try again or contact support.',
      this.stateMachine.getStage(),
      false
    );

    await this.stateMachine.setError(publishError);

    this.logger.logPublishFailure(publishError.stage, publishError.message, {
      campaignId,
      error: err.message
    });

    // Update database with error
    await supabaseServer
      .from('meta_published_campaigns')
      .upsert({
        campaign_id: campaignId,
        publish_status: 'error',
        error_message: err.message,
        meta_campaign_id: 'pending',
        meta_adset_id: 'pending',
        meta_ad_ids: [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'campaign_id' });

    await supabaseServer
      .from('campaigns')
      .update({ published_status: 'error' })
      .eq('id', campaignId);

    throw publishError;
  }

  /**
   * Create a PublishError object
   */
  private createPublishError(
    code: string,
    message: string,
    userMessage: string,
    stage: import('../types/publishing').PublishingStage,
    recoverable: boolean,
    suggestedAction?: string
  ): PublishError {
    return {
      code,
      message,
      userMessage,
      recoverable,
      suggestedAction,
      stage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get state machine instance
   */
  getStateMachine(): PublishStateMachine {
    return this.stateMachine;
  }

  /**
   * Get logger instance
   */
  getLogger(): PublishLogger {
    return this.logger;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a publish orchestrator instance
 */
export function createPublishOrchestrator(campaignId: string): PublishOrchestrator {
  return new PublishOrchestrator(campaignId);
}

/**
 * Execute publishing for a campaign
 */
export async function publishCampaignFlow(params: PublishParams): Promise<PublishResult> {
  const orchestrator = createPublishOrchestrator(params.campaignId);
  return await orchestrator.publish(params);
}

