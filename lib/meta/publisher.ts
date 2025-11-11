/**
 * Feature: Meta campaign publisher
 * Purpose: Create Campaign → AdSet → Ads via Meta Marketing API and persist resulting IDs.
 * References:
 *  - Meta Campaign Creation: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group
 *  - Meta Ad Set: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign
 *  - Meta Ads: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign
 *  - Supabase Server Client: https://supabase.com/docs/reference/javascript/installing#server-environments
 */

import { getConnectionWithToken, getGraphVersion } from '@/lib/meta/service'
import { supabaseServer } from '@/lib/supabase/server'

interface PublishAdConfig {
  fields: Record<string, unknown>
}

interface PublishCampaignConfig {
  campaign: Record<string, unknown>
  adset: Record<string, unknown>
  ads: PublishAdConfig[]
}

interface PublishArgs {
  campaignId: string
  userId: string
}

export interface PublishResult {
  metaCampaignId: string
  metaAdSetId: string
  metaAdIds: string[]
  publishStatus: 'active'
}

export interface PublishStatusSnapshot {
  publishStatus: string
  metaCampaignId: string | null
  metaAdSetId: string | null
  metaAdIds: string[]
  errorMessage: string | null
  publishedAt: string | null
  pausedAt: string | null
  campaignStatus: string | null
}

const META_PENDING_ID = 'pending'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePublishConfig(raw: unknown): PublishCampaignConfig {
  if (!isRecord(raw)) {
    throw new Error('Missing publish configuration. Please complete the campaign setup before publishing.')
  }

  const { campaign, adset, ads } = raw

  if (!isRecord(campaign)) {
    throw new Error('Publish configuration missing campaign payload.')
  }

  if (!isRecord(adset)) {
    throw new Error('Publish configuration missing ad set payload.')
  }

  if (!Array.isArray(ads) || ads.length === 0 || !ads.every((item) => isRecord(item))) {
    throw new Error('Publish configuration must include at least one ad payload.')
  }

  const adConfigs: PublishAdConfig[] = ads.map((item) => ({ fields: item }))

  return {
    campaign,
    adset,
    ads: adConfigs,
  }
}

function normalizeAdAccountId(rawId: string | null | undefined): string {
  if (!rawId) {
    throw new Error('Meta ad account is not connected. Please connect an ad account before publishing.')
  }
  return rawId.startsWith('act_') ? rawId.replace(/^act_/, '') : rawId
}

function encodePayload(payload: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams()

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'bigint') {
      params.append(key, String(value))
      return
    }

    if (typeof value === 'string') {
      params.append(key, value)
      return
    }

    params.append(key, JSON.stringify(value))
  })

  return params
}

async function graphPost(token: string, path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const graphVersion = getGraphVersion()
  const url = `https://graph.facebook.com/${graphVersion}/${path}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: encodePayload(payload),
  })

  const text = await response.text()
  let json: unknown = null

  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    const errorMessage = isRecord(json) && isRecord(json.error) && typeof json.error.message === 'string'
      ? json.error.message
      : text || `Meta API error ${response.status}`
    throw new Error(errorMessage)
  }

  if (!isRecord(json)) {
    throw new Error('Meta API response did not contain a JSON body.')
  }

  return json
}

export async function publishCampaign({ campaignId }: PublishArgs): Promise<PublishResult> {
  const { data: stateRow, error: stateError } = await supabaseServer
    .from('campaign_states')
    .select('publish_data')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (stateError) {
    console.error('[MetaPublisher] Failed to load campaign state:', stateError)
    throw new Error('Could not load campaign state for publishing.')
  }

  const publishConfig = parsePublishConfig(stateRow?.publish_data ?? null)

  const connection = await getConnectionWithToken({ campaignId })
  if (!connection) {
    throw new Error('Meta connection not found. Please reconnect Meta before publishing.')
  }

  const token = connection.long_lived_user_token
  if (!token) {
    throw new Error('Missing long-lived Meta token. Please reconnect Meta before publishing.')
  }

  const adAccountNumericId = normalizeAdAccountId(connection.selected_ad_account_id)
  const actId = `act_${adAccountNumericId}`

  await supabaseServer
    .from('campaigns')
    .update({ published_status: 'publishing' })
    .eq('id', campaignId)

  await supabaseServer
    .from('meta_published_campaigns')
    .upsert({
      campaign_id: campaignId,
      meta_campaign_id: META_PENDING_ID,
      meta_adset_id: META_PENDING_ID,
      meta_ad_ids: [],
      publish_status: 'publishing',
      error_message: null,
      published_at: null,
      paused_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'campaign_id' })

  try {
    const campaignPayload: Record<string, unknown> = {
      status: 'PAUSED',
      ...publishConfig.campaign,
    }

    const campaignResponse = await graphPost(token, `${actId}/campaigns`, campaignPayload)
    const metaCampaignId = typeof campaignResponse.id === 'string' ? campaignResponse.id : null
    if (!metaCampaignId) {
      throw new Error('Meta campaign creation did not return an ID.')
    }

    const adSetPayload: Record<string, unknown> = {
      status: 'PAUSED',
      ...publishConfig.adset,
      campaign_id: metaCampaignId,
    }

    if ('dailyBudget' in adSetPayload && typeof adSetPayload.dailyBudget === 'number') {
      const cents = Math.max(0, Math.round(adSetPayload.dailyBudget * 100))
      adSetPayload.daily_budget = cents
      delete (adSetPayload as { dailyBudget?: unknown }).dailyBudget
    }

    const adSetResponse = await graphPost(token, `${actId}/adsets`, adSetPayload)
    const metaAdSetId = typeof adSetResponse.id === 'string' ? adSetResponse.id : null
    if (!metaAdSetId) {
      throw new Error('Meta ad set creation did not return an ID.')
    }

    const metaAdIds: string[] = []

    for (const [index, adConfig] of publishConfig.ads.entries()) {
      const adPayload: Record<string, unknown> = {
        status: 'PAUSED',
        ...adConfig.fields,
        adset_id: metaAdSetId,
      }

      const adResponse = await graphPost(token, `${actId}/ads`, adPayload)
      const metaAdId = typeof adResponse.id === 'string' ? adResponse.id : null
      if (!metaAdId) {
        throw new Error(`Meta ad creation did not return an ID for ad index ${index}.`)
      }
      metaAdIds.push(metaAdId)
    }

    const nowIso = new Date().toISOString()

    await supabaseServer
      .from('meta_published_campaigns')
      .upsert({
        campaign_id: campaignId,
        meta_campaign_id: metaCampaignId,
        meta_adset_id: metaAdSetId,
        meta_ad_ids: metaAdIds,
        publish_status: 'active',
        error_message: null,
        published_at: nowIso,
        paused_at: null,
        updated_at: nowIso,
      }, { onConflict: 'campaign_id' })

    await supabaseServer
      .from('campaigns')
      .update({ published_status: 'active', updated_at: nowIso })
      .eq('id', campaignId)

    return {
      metaCampaignId,
      metaAdSetId,
      metaAdIds,
      publishStatus: 'active',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error while publishing campaign.'

    await supabaseServer
      .from('meta_published_campaigns')
      .upsert({
        campaign_id: campaignId,
        meta_campaign_id: META_PENDING_ID,
        meta_adset_id: META_PENDING_ID,
        meta_ad_ids: [],
        publish_status: 'error',
        error_message: message,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'campaign_id' })

    await supabaseServer
      .from('campaigns')
      .update({ published_status: 'error' })
      .eq('id', campaignId)

    throw error
  }
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

async function updateRemoteStatus(args: {
  campaignId: string
  target: 'ACTIVE' | 'PAUSED'
}): Promise<PublishStatusSnapshot> {
  const current = await getPublishStatus(args.campaignId)
  if (!current || !current.metaCampaignId || !current.metaAdSetId || current.metaAdIds.length === 0) {
    throw new Error('Campaign has not been published yet.')
  }

  const connection = await getConnectionWithToken({ campaignId: args.campaignId })
  if (!connection || !connection.long_lived_user_token) {
    throw new Error('Missing Meta token. Please reconnect Meta before updating status.')
  }

  const token = connection.long_lived_user_token
  const statusPayload = { status: args.target }

  await graphPost(token, current.metaCampaignId, statusPayload)
  await graphPost(token, current.metaAdSetId, statusPayload)
  await Promise.all(current.metaAdIds.map((adId) => graphPost(token, adId, statusPayload)))

  const nowIso = new Date().toISOString()
  const publishStatus = args.target === 'ACTIVE' ? 'active' : 'paused'

  const updatePayload = {
    publish_status: publishStatus,
    paused_at: args.target === 'PAUSED' ? nowIso : null,
    updated_at: nowIso,
  }

  const { error: metaUpdateError } = await supabaseServer
    .from('meta_published_campaigns')
    .update(updatePayload)
    .eq('campaign_id', args.campaignId)

  if (metaUpdateError) {
    throw metaUpdateError
  }

  const { error: campaignUpdateError } = await supabaseServer
    .from('campaigns')
    .update({ published_status: publishStatus, updated_at: nowIso })
    .eq('id', args.campaignId)

  if (campaignUpdateError) {
    throw campaignUpdateError
  }

  return await getPublishStatus(args.campaignId) as PublishStatusSnapshot
}

export async function pausePublishedCampaign(campaignId: string): Promise<PublishStatusSnapshot> {
  return updateRemoteStatus({ campaignId, target: 'PAUSED' })
}

export async function resumePublishedCampaign(campaignId: string): Promise<PublishStatusSnapshot> {
  return updateRemoteStatus({ campaignId, target: 'ACTIVE' })
}
