/**
 * Feature: Meta Connection Manager
 * Purpose: Database-first Meta connection management (campaign-level, shared across ads)
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 */

import { supabase } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { metaLogger } from '@/lib/meta/logger'

const CONTEXT = 'MetaConnectionManager'

// Meta connection data structure (stored in campaign_states.meta_connection_data)
export interface MetaConnectionData {
  business?: {
    id: string
    name: string
  }
  page?: {
    id: string
    name: string
    access_token: string
  }
  adAccount?: {
    id: string
    name: string
    currency: string
  }
  instagram?: {
    id: string
    username: string
  }
  tokens: {
    long_lived_user_token?: string
    token_expires_at?: string
    user_app_token?: string
    user_app_token_expires_at?: string
  }
  connection_status: 'connected' | 'disconnected'
  payment_connected: boolean
  admin_connected: boolean
  fb_user_id?: string
  connected_at: string
  updated_at: string
}

export interface MetaConnectionSummary {
  isConnected: boolean
  hasPayment: boolean
  business: { id: string; name: string } | null
  page: { id: string; name: string } | null
  adAccount: { id: string; name: string; currency: string } | null
  instagram: { id: string; username: string } | null
}

/**
 * Get Meta connection data for a campaign from database
 */
export async function getCampaignMetaConnection(
  campaignId: string
): Promise<MetaConnectionData | null> {
  try {
    metaLogger.info(CONTEXT, 'Fetching Meta connection from database', { campaignId })

    const { data, error } = await supabase
      .from('campaign_states')
      .select('meta_connection_data')
      .eq('campaign_id', campaignId)
      .single()

    if (error) {
      metaLogger.error(CONTEXT, 'Failed to fetch Meta connection', error)
      return null
    }

    if (!data?.meta_connection_data) {
      metaLogger.info(CONTEXT, 'No Meta connection found in database', { campaignId })
      return null
    }

    const connectionData = data.meta_connection_data as unknown as MetaConnectionData

    metaLogger.info(CONTEXT, 'Meta connection loaded from database', {
      campaignId,
      hasConnection: !!connectionData,
      status: connectionData?.connection_status,
      hasBusiness: !!connectionData?.business?.id,
      hasAdAccount: !!connectionData?.adAccount?.id,
    })

    return connectionData
  } catch (err) {
    metaLogger.error(CONTEXT, 'Exception loading Meta connection', err as Error)
    return null
  }
}

/**
 * Save Meta connection data for a campaign to database
 */
export async function saveCampaignMetaConnection(
  campaignId: string,
  connectionData: MetaConnectionData
): Promise<boolean> {
  try {
    metaLogger.info(CONTEXT, 'Saving Meta connection to database', {
      campaignId,
      status: connectionData.connection_status,
      businessId: connectionData.business?.id,
      adAccountId: connectionData.adAccount?.id,
    })

    // Ensure updated_at is current
    connectionData.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('campaign_states')
      .update({
        meta_connection_data: connectionData as unknown as Json,
      })
      .eq('campaign_id', campaignId)

    if (error) {
      metaLogger.error(CONTEXT, 'Failed to save Meta connection', error)
      return false
    }

    metaLogger.info(CONTEXT, '✅ Meta connection saved to database', { campaignId })

    // Emit event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('meta-connection-updated', {
          detail: { campaignId, connectionData },
        })
      )
    }

    return true
  } catch (err) {
    metaLogger.error(CONTEXT, 'Exception saving Meta connection', err as Error)
    return false
  }
}

/**
 * Update specific fields in Meta connection (partial update)
 */
export async function updateCampaignMetaConnection(
  campaignId: string,
  updates: Partial<MetaConnectionData>
): Promise<boolean> {
  try {
    metaLogger.info(CONTEXT, 'Updating Meta connection fields', {
      campaignId,
      fields: Object.keys(updates),
    })

    // Get existing connection
    const existing = await getCampaignMetaConnection(campaignId)

    if (!existing) {
      metaLogger.error(CONTEXT, 'Cannot update - no existing connection found', new Error('No existing connection'))
      return false
    }

    // Merge updates with existing data
    const merged: MetaConnectionData = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    return await saveCampaignMetaConnection(campaignId, merged)
  } catch (err) {
    metaLogger.error(CONTEXT, 'Exception updating Meta connection', err as Error)
    return false
  }
}

/**
 * Mark payment as connected for a campaign
 */
export async function markCampaignPaymentConnected(campaignId: string): Promise<boolean> {
  return await updateCampaignMetaConnection(campaignId, {
    payment_connected: true,
  } as Partial<MetaConnectionData>)
}

/**
 * Get Meta connection summary (simplified view)
 */
export async function getMetaConnectionSummary(
  campaignId: string
): Promise<MetaConnectionSummary> {
  const connection = await getCampaignMetaConnection(campaignId)

  if (!connection) {
    return {
      isConnected: false,
      hasPayment: false,
      business: null,
      page: null,
      adAccount: null,
      instagram: null,
    }
  }

  return {
    isConnected: connection.connection_status === 'connected',
    hasPayment: connection.payment_connected,
    business: connection.business || null,
    page: connection.page
      ? {
          id: connection.page.id,
          name: connection.page.name,
        }
      : null,
    adAccount: connection.adAccount || null,
    instagram: connection.instagram || null,
  }
}

/**
 * Get Meta access token for API calls
 */
export async function getMetaAccessToken(campaignId: string): Promise<string | null> {
  const connection = await getCampaignMetaConnection(campaignId)

  if (!connection) {
    return null
  }

  // Prefer user_app_token, fallback to long_lived_user_token
  return connection.tokens.user_app_token || connection.tokens.long_lived_user_token || null
}

/**
 * Check if Meta connection exists and is valid
 */
export async function isMetaConnected(campaignId: string): Promise<boolean> {
  const connection = await getCampaignMetaConnection(campaignId)
  
  return (
    !!connection &&
    connection.connection_status === 'connected' &&
    !!connection.business?.id &&
    !!connection.adAccount?.id &&
    (!!connection.tokens.long_lived_user_token || !!connection.tokens.user_app_token)
  )
}

/**
 * Disconnect Meta (soft delete - marks as disconnected)
 */
export async function disconnectMeta(campaignId: string): Promise<boolean> {
  return await updateCampaignMetaConnection(campaignId, {
    connection_status: 'disconnected',
  } as Partial<MetaConnectionData>)
}

/**
 * Clear Meta connection data (hard delete)
 */
export async function clearMetaConnection(campaignId: string): Promise<boolean> {
  try {
    metaLogger.info(CONTEXT, 'Clearing Meta connection from database', { campaignId })

    const { error } = await supabase
      .from('campaign_states')
      .update({
        meta_connection_data: null,
      })
      .eq('campaign_id', campaignId)

    if (error) {
      metaLogger.error(CONTEXT, 'Failed to clear Meta connection', error)
      return false
    }

    metaLogger.info(CONTEXT, '✅ Meta connection cleared', { campaignId })

    // Emit event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('meta-connection-updated', {
          detail: { campaignId, connectionData: null },
        })
      )
    }

    return true
  } catch (err) {
    metaLogger.error(CONTEXT, 'Exception clearing Meta connection', err as Error)
    return false
  }
}

