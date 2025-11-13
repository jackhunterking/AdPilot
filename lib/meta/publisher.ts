/**
 * Feature: Meta Campaign Publisher (Enhanced with Phase 1-6 Infrastructure)
 * Purpose: Create Campaign → AdSet → Ads via Meta Marketing API v24.0
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 *  - Publishing Orchestrator: lib/meta/publishing/publish-orchestrator.ts
 */

import { publishCampaignFlow, type PublishParams } from './publishing/publish-orchestrator';
import { supabaseServer } from '../supabase/server';
import { getConnectionWithToken } from './service';
import type { PublishResult } from './types/publishing';

/**
 * Publish a campaign using the new orchestrator system
 */
export async function publishCampaign(params: PublishParams): Promise<PublishResult> {
  return await publishCampaignFlow(params);
}

// Keep type for backward compatibility
export interface PublishStatusSnapshot {
  publishStatus: string;
  metaCampaignId: string | null;
  metaAdSetId: string | null;
  metaAdIds: string[];
  errorMessage: string | null;
  publishedAt: string | null;
  pausedAt: string | null;
  campaignStatus: string | null;
}

export async function getPublishStatus(campaignId: string): Promise<PublishStatusSnapshot | null> {
  const { data: metaRow, error: metaError } = await supabaseServer
    .from('meta_published_campaigns')
    .select('publish_status,meta_campaign_id,meta_adset_id,meta_ad_ids,error_message,published_at,paused_at')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (metaError) {
    console.error('[MetaPublisher] getPublishStatus meta error:', metaError)
    throw new Error('Failed to load publish status.')
  }

  const { data: campaignRow, error: campaignError } = await supabaseServer
    .from('campaigns')
    .select('published_status')
    .eq('id', campaignId)
    .maybeSingle()

  if (campaignError) {
    console.error('[MetaPublisher] getPublishStatus campaign error:', campaignError)
  }

  if (!metaRow) {
    return null
  }

  return {
    publishStatus: metaRow.publish_status ?? 'unpublished',
    metaCampaignId: typeof metaRow.meta_campaign_id === 'string' ? metaRow.meta_campaign_id : null,
    metaAdSetId: typeof metaRow.meta_adset_id === 'string' ? metaRow.meta_adset_id : null,
    metaAdIds: Array.isArray(metaRow.meta_ad_ids) ? (metaRow.meta_ad_ids as string[]) : [],
    errorMessage: metaRow.error_message ?? null,
    publishedAt: metaRow.published_at ?? null,
    pausedAt: metaRow.paused_at ?? null,
    campaignStatus: campaignRow?.published_status ?? null,
  }
}

/**
 * Update campaign status on Meta (pause/resume)
 */
async function updateRemoteStatus(args: {
  campaignId: string;
  target: 'ACTIVE' | 'PAUSED';
}): Promise<PublishStatusSnapshot> {
  const current = await getPublishStatus(args.campaignId);
  
  if (!current || !current.metaCampaignId || !current.metaAdSetId || current.metaAdIds.length === 0) {
    throw new Error('Campaign has not been published yet.');
  }

  const connection = await getConnectionWithToken({ campaignId: args.campaignId });
  
  if (!connection || !connection.long_lived_user_token) {
    throw new Error('Missing Meta token. Please reconnect Meta before updating status.');
  }

  // Use MetaAPIClient for status updates
  const { createPublishLogger } = await import('./observability/publish-logger');
  const { createMetaAPIClient } = await import('./publishing/meta-api-client');
  
  const logger = createPublishLogger(args.campaignId);
  const apiClient = createMetaAPIClient(connection.long_lived_user_token, logger);

  // Update all objects
  await apiClient.updateStatus(current.metaCampaignId, args.target);
  await apiClient.updateStatus(current.metaAdSetId, args.target);
  
  for (const adId of current.metaAdIds) {
    await apiClient.updateStatus(adId, args.target);
  }

  // Update database
  const nowIso = new Date().toISOString();
  const publishStatus = args.target === 'ACTIVE' ? 'active' : 'paused';

  await supabaseServer
    .from('meta_published_campaigns')
    .update({
      publish_status: publishStatus,
      paused_at: args.target === 'PAUSED' ? nowIso : null,
      updated_at: nowIso
    })
    .eq('campaign_id', args.campaignId);

  await supabaseServer
    .from('campaigns')
    .update({ published_status: publishStatus, updated_at: nowIso })
    .eq('id', args.campaignId);

  return await getPublishStatus(args.campaignId) as PublishStatusSnapshot;
}

export async function pausePublishedCampaign(campaignId: string): Promise<PublishStatusSnapshot> {
  return updateRemoteStatus({ campaignId, target: 'PAUSED' })
}

export async function resumePublishedCampaign(campaignId: string): Promise<PublishStatusSnapshot> {
  return updateRemoteStatus({ campaignId, target: 'ACTIVE' })
}
