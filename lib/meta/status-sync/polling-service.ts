/**
 * Feature: Meta Status Polling Service
 * Purpose: Poll Meta Marketing API to sync ad status and review feedback
 * References:
 *  - Meta Marketing API - Ad Status: https://developers.facebook.com/docs/marketing-api/reference/ad/
 *  - Ad Review: https://developers.facebook.com/docs/marketing-api/ad-review
 */

import { supabaseServer } from '../../supabase/server'
import { getConnectionWithToken } from '../service'
import type { AdStatus } from '../../types/workspace'

interface StatusSyncResult {
  success: boolean
  status?: AdStatus
  metaAdId?: string
  updatedAt?: string
  error?: {
    code: string
    message: string
  }
}

interface MetaAdStatus {
  id: string
  status: string
  effective_status: string
  configured_status: string
  issues_info?: {
    error_code: number
    error_message: string
    error_summary: string
    level: string
  }[]
  recommendations?: Array<{
    code: number
    message: string
    title: string
  }>
}

/**
 * Map Meta status to our AdStatus enum
 */
function mapMetaStatusToAdStatus(metaStatus: string, effectiveStatus: string): AdStatus {
  // Meta status values: ACTIVE, PAUSED, DELETED, ARCHIVED
  // Effective status includes delivery info: ACTIVE, PAUSED, PENDING_REVIEW, DISAPPROVED, etc.
  
  switch (effectiveStatus) {
    case 'ACTIVE':
    case 'CAMPAIGN_PAUSED':
    case 'ADSET_PAUSED':
      return metaStatus === 'PAUSED' ? 'paused' : 'active'
    
    case 'PENDING_REVIEW':
    case 'IN_PROCESS':
      return 'pending_review'
    
    case 'DISAPPROVED':
    case 'REJECTED':
      return 'rejected'
    
    case 'WITH_ISSUES':
      return 'rejected'
    
    case 'PAUSED':
      return 'paused'
    
    default:
      // If effective status is learning-related
      if (effectiveStatus.includes('LEARNING')) {
        return 'learning'
      }
      
      // Default to checking configured status
      return metaStatus === 'PAUSED' ? 'paused' : 'active'
  }
}

/**
 * Sync ad status from Meta Marketing API
 */
export async function syncAdStatus(campaignId: string, adId: string): Promise<StatusSyncResult> {
  try {
    // Get ad from database
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('id, meta_ad_id, publishing_status')
      .eq('id', adId)
      .single()

    if (!ad) {
      return {
        success: false,
        error: {
          code: 'not_found',
          message: 'Ad not found'
        }
      }
    }

    if (!ad.meta_ad_id) {
      return {
        success: false,
        error: {
          code: 'not_published',
          message: 'Ad not published to Meta yet'
        }
      }
    }

    // Get Meta connection
    const connection = await getConnectionWithToken({ campaignId })

    if (!connection || !connection.long_lived_user_token) {
      return {
        success: false,
        error: {
          code: 'token_expired',
          message: 'Meta connection not found or expired'
        }
      }
    }

    // Fetch status from Meta API
    const gv = 'v21.0' // Graph API version
    const fields = [
      'id',
      'name',
      'status',
      'effective_status',
      'configured_status',
      'issues_info',
      'recommendations'
    ].join(',')

    const url = `https://graph.facebook.com/${gv}/${ad.meta_ad_id}?fields=${fields}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${connection.long_lived_user_token}`
      }
    })

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => ({}))
      const errorMessage = (errorData && typeof errorData === 'object' && 'error' in errorData)
        ? (errorData.error as { message?: string }).message
        : 'Failed to fetch ad status from Meta'

      return {
        success: false,
        error: {
          code: 'api_error',
          message: errorMessage || 'Failed to fetch ad status'
        }
      }
    }

    const metaAd: MetaAdStatus = await response.json()

    // Map Meta status to our status
    const newStatus = mapMetaStatusToAdStatus(metaAd.status, metaAd.effective_status)
    
    // Update database
    const nowIso = new Date().toISOString()
    
    await supabaseServer
      .from('ads')
      .update({
        publishing_status: newStatus,
        updated_at: nowIso,
        // Set approved_at when going active for first time
        approved_at: (newStatus === 'active' && !ad.publishing_status?.includes('active'))
          ? nowIso
          : undefined,
        // Set rejected_at when rejected
        rejected_at: (newStatus === 'rejected')
          ? nowIso
          : undefined
      })
      .eq('id', adId)

    // Update metadata
    await supabaseServer
      .from('ad_publishing_metadata')
      .update({
        current_status: newStatus,
        previous_status: ad.publishing_status as AdStatus,
        last_status_check: nowIso,
        // Store rejection reasons if any
        rejection_reasons: metaAd.issues_info?.map(issue => issue.error_message) || null,
        meta_review_feedback: metaAd.issues_info ? {
          issues: metaAd.issues_info,
          recommendations: metaAd.recommendations || []
        } : null,
        updated_at: nowIso
      })
      .eq('ad_id', adId)

    // Record status transition if status changed
    if (ad.publishing_status !== newStatus) {
      await supabaseServer
        .from('ad_status_transitions')
        .insert({
          ad_id: adId,
          from_status: ad.publishing_status as AdStatus,
          to_status: newStatus,
          triggered_by: 'meta_webhook',
          notes: `Status synced from Meta: ${metaAd.effective_status}`,
          metadata: {
            meta_status: metaAd.status,
            effective_status: metaAd.effective_status,
            configured_status: metaAd.configured_status
          }
        })
    }

    return {
      success: true,
      status: newStatus,
      metaAdId: ad.meta_ad_id,
      updatedAt: nowIso
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    console.error('[Status Sync] Error:', err)

    return {
      success: false,
      error: {
        code: 'sync_error',
        message: err.message
      }
    }
  }
}

/**
 * Batch sync multiple ads
 */
export async function syncMultipleAds(campaignId: string, adIds: string[]): Promise<StatusSyncResult[]> {
  const results = await Promise.all(
    adIds.map(adId => syncAdStatus(campaignId, adId))
  )
  return results
}

/**
 * Sync all published ads in a campaign
 */
export async function syncCampaignAds(campaignId: string): Promise<StatusSyncResult[]> {
  // Get all published ads in campaign
  const { data: ads } = await supabaseServer
    .from('ads')
    .select('id')
    .eq('campaign_id', campaignId)
    .not('meta_ad_id', 'is', null)

  if (!ads || ads.length === 0) {
    return []
  }

  return syncMultipleAds(campaignId, ads.map(ad => ad.id))
}

