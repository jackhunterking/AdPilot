/**
 * Feature: localStorage to Database Migration Helper
 * Purpose: One-time migration of Meta connection data from localStorage to database
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/update
 *  - Data Architecture: Campaign-level Meta connection in database
 */

import { metaStorage } from '@/lib/meta/storage'
import { saveCampaignMetaConnection, type MetaConnectionData } from '@/lib/services/meta-connection-manager'
import { toast } from 'sonner'

const CONTEXT = 'MigrationHelper'
const MIGRATION_FLAG_KEY = 'meta_connection_migrated'

/**
 * Check if migration has already been performed for this campaign
 */
export function hasMigrationBeenPerformed(campaignId: string): boolean {
  if (typeof window === 'undefined') return true

  try {
    const flag = localStorage.getItem(`${MIGRATION_FLAG_KEY}_${campaignId}`)
    return flag === 'true'
  } catch (error) {
    console.warn(`[${CONTEXT}] Failed to check migration flag`, error)
    return false
  }
}

/**
 * Mark migration as performed for this campaign
 */
function markMigrationPerformed(campaignId: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(`${MIGRATION_FLAG_KEY}_${campaignId}`, 'true')
    console.log(`[${CONTEXT}] ✅ Migration marked as performed for campaign:`, campaignId)
  } catch (error) {
    console.error(`[${CONTEXT}] Failed to set migration flag`, error)
  }
}

/**
 * Convert legacy localStorage connection to new database format
 */
function convertLegacyConnection(legacyData: ReturnType<typeof metaStorage.getConnection>): MetaConnectionData | null {
  if (!legacyData) return null

  try {
    return {
      business: legacyData.selected_business_id && legacyData.selected_business_name
        ? {
            id: legacyData.selected_business_id,
            name: legacyData.selected_business_name,
          }
        : undefined,
      page: legacyData.selected_page_id && legacyData.selected_page_name
        ? {
            id: legacyData.selected_page_id,
            name: legacyData.selected_page_name,
            access_token: legacyData.selected_page_access_token || '',
          }
        : undefined,
      adAccount: legacyData.selected_ad_account_id && legacyData.selected_ad_account_name
        ? {
            id: legacyData.selected_ad_account_id,
            name: legacyData.selected_ad_account_name,
            currency: legacyData.ad_account_currency_code || 'USD',
          }
        : undefined,
      instagram: legacyData.selected_ig_user_id && legacyData.selected_ig_username
        ? {
            id: legacyData.selected_ig_user_id,
            username: legacyData.selected_ig_username,
          }
        : undefined,
      tokens: {
        long_lived_user_token: legacyData.long_lived_user_token,
        token_expires_at: legacyData.token_expires_at,
        user_app_token: legacyData.user_app_token,
        user_app_token_expires_at: legacyData.user_app_token_expires_at,
      },
      connection_status: legacyData.status === 'connected' ? 'connected' : 'disconnected',
      payment_connected: legacyData.ad_account_payment_connected || false,
      admin_connected: legacyData.admin_connected || false,
      fb_user_id: legacyData.fb_user_id || undefined,
      connected_at: legacyData.created_at || new Date().toISOString(),
      updated_at: legacyData.updated_at || new Date().toISOString(),
    }
  } catch (error) {
    console.error(`[${CONTEXT}] Failed to convert legacy connection data`, error)
    return null
  }
}

/**
 * Migrate Meta connection data from localStorage to database
 * Returns true if migration was successful or not needed, false if failed
 */
export async function migrateLegacyMetaConnection(campaignId: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    console.log(`[${CONTEXT}] Skipping migration (server-side)`)
    return true
  }

  try {
    // Check if migration already performed
    if (hasMigrationBeenPerformed(campaignId)) {
      console.log(`[${CONTEXT}] Migration already performed for campaign:`, campaignId)
      return true
    }

    console.log(`[${CONTEXT}] Checking for legacy Meta connection data`, { campaignId })

    // Check if localStorage has Meta connection data
    const legacyConnection = metaStorage.getConnection(campaignId)

    if (!legacyConnection) {
      console.log(`[${CONTEXT}] No legacy data found in localStorage`)
      markMigrationPerformed(campaignId)
      return true
    }

    console.log(`[${CONTEXT}] Found legacy Meta connection in localStorage`, {
      campaignId,
      hasBusinessId: !!legacyConnection.selected_business_id,
      hasAdAccountId: !!legacyConnection.selected_ad_account_id,
      hasToken: !!legacyConnection.long_lived_user_token || !!legacyConnection.user_app_token,
    })

    // Convert to new format
    const newConnectionData = convertLegacyConnection(legacyConnection)

    if (!newConnectionData) {
      console.error(`[${CONTEXT}] Failed to convert legacy connection data`)
      return false
    }

    console.log(`[${CONTEXT}] Migrating connection data to database...`)

    // Save to database
    const success = await saveCampaignMetaConnection(campaignId, newConnectionData)

    if (!success) {
      console.error(`[${CONTEXT}] Failed to save connection to database`)
      toast.error('Failed to migrate Meta connection data')
      return false
    }

    console.log(`[${CONTEXT}] ✅ Successfully migrated Meta connection to database`)

    // Clear localStorage data (optional - keep for backward compatibility for now)
    // metaStorage.clearConnection(campaignId)

    // Mark migration as performed
    markMigrationPerformed(campaignId)

    // Show success notification
    toast.success('Meta connection upgraded to new system', {
      description: 'Your connection data is now stored securely in the database',
      duration: 5000,
    })

    return true
  } catch (error) {
    console.error(`[${CONTEXT}] Exception during migration`, error)
    toast.error('Failed to migrate Meta connection')
    return false
  }
}

/**
 * Check if localStorage has any Meta connection data
 */
export function hasLegacyMetaConnection(campaignId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const connection = metaStorage.getConnection(campaignId)
    return !!connection && !!connection.long_lived_user_token
  } catch (error) {
    console.error(`[${CONTEXT}] Failed to check legacy connection`, error)
    return false
  }
}

/**
 * Clear all localStorage Meta connection data (use with caution)
 */
export function clearAllLegacyConnections(): void {
  if (typeof window === 'undefined') return

  try {
    console.log(`[${CONTEXT}] Clearing all legacy localStorage connections`)

    // Get all localStorage keys
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('meta_connection_')) {
        keys.push(key)
      }
    }

    // Remove all Meta connection keys
    keys.forEach(key => localStorage.removeItem(key))

    console.log(`[${CONTEXT}] ✅ Cleared ${keys.length} legacy connection(s)`)
  } catch (error) {
    console.error(`[${CONTEXT}] Failed to clear legacy connections`, error)
  }
}

