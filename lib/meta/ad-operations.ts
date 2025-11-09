/**
 * Feature: Individual Ad Operations
 * Purpose: Pause and resume individual Meta ads without affecting campaign/adset
 * References:
 *  - Meta Ad Status: https://developers.facebook.com/docs/marketing-api/reference/adgroup#Updating
 *  - Supabase Server Client: https://supabase.com/docs/reference/javascript/installing#server-environments
 */

import { getConnectionWithToken, getGraphVersion } from '@/lib/meta/service'
import { supabaseServer } from '@/lib/supabase/server'

interface AdOperationResult {
  success: boolean
  status: 'active' | 'paused'
  metaAdId: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function graphPost(token: string, path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const graphVersion = getGraphVersion()
  const url = `https://graph.facebook.com/${graphVersion}/${path}`
  
  const params = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: params,
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

async function updateAdStatus(
  adId: string,
  campaignId: string,
  targetStatus: 'ACTIVE' | 'PAUSED'
): Promise<AdOperationResult> {
  // Fetch the ad's meta_ad_id from database
  const { data: ad, error: adError } = await supabaseServer
    .from('ads')
    .select('id, meta_ad_id, campaign_id')
    .eq('id', adId)
    .eq('campaign_id', campaignId)
    .single()

  if (adError || !ad) {
    console.error('[AdOperations] Failed to fetch ad:', adError)
    throw new Error('Ad not found or does not belong to this campaign.')
  }

  if (!ad.meta_ad_id) {
    throw new Error('Ad has not been published to Meta yet. Only published ads can be paused or resumed.')
  }

  // Get Meta connection token
  const connection = await getConnectionWithToken({ campaignId })
  if (!connection || !connection.long_lived_user_token) {
    throw new Error('Missing Meta token. Please reconnect Meta before updating ad status.')
  }

  const token = connection.long_lived_user_token

  // Update ad status on Meta
  const statusPayload = { status: targetStatus }
  await graphPost(token, ad.meta_ad_id, statusPayload)

  // Update status in database
  const dbStatus = targetStatus === 'ACTIVE' ? 'active' : 'paused'
  const { error: updateError } = await supabaseServer
    .from('ads')
    .update({ status: dbStatus, updated_at: new Date().toISOString() })
    .eq('id', adId)

  if (updateError) {
    console.error('[AdOperations] Failed to update ad status in database:', updateError)
    throw new Error('Failed to update ad status in database.')
  }

  return {
    success: true,
    status: dbStatus,
    metaAdId: ad.meta_ad_id,
  }
}

export async function pauseAd(adId: string, campaignId: string): Promise<AdOperationResult> {
  console.log('[AdOperations] Pausing ad:', { adId, campaignId })
  return updateAdStatus(adId, campaignId, 'PAUSED')
}

export async function resumeAd(adId: string, campaignId: string): Promise<AdOperationResult> {
  console.log('[AdOperations] Resuming ad:', { adId, campaignId })
  return updateAdStatus(adId, campaignId, 'ACTIVE')
}

