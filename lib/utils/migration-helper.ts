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
 * 
 * ENHANCED: Better logging, error tracking, and forced migration support
 */
export async function migrateLegacyMetaConnection(
  campaignId: string,
  options: { force?: boolean; silent?: boolean } = {}
): Promise<boolean> {
  const { force = false, silent = false } = options

  if (typeof window === 'undefined') {
    console.log(`[${CONTEXT}] Skipping migration (server-side)`)
    return true
  }

  try {
    console.log(`[${CONTEXT}] ========================================`)
    console.log(`[${CONTEXT}] MIGRATION START for campaign: ${campaignId}`)
    console.log(`[${CONTEXT}] Force: ${force}, Silent: ${silent}`)
    console.log(`[${CONTEXT}] ========================================`)

    // Check if migration already performed (skip if force=false)
    if (!force && hasMigrationBeenPerformed(campaignId)) {
      console.log(`[${CONTEXT}] ⏭️ Migration already performed for campaign:`, campaignId)
      return true
    }

    console.log(`[${CONTEXT}] 🔍 Checking for legacy Meta connection data...`)

    // Check if localStorage has Meta connection data
    const legacyConnection = metaStorage.getConnection(campaignId)

    if (!legacyConnection) {
      console.log(`[${CONTEXT}] ℹ️ No legacy data found in localStorage for campaign:`, campaignId)
      markMigrationPerformed(campaignId)
      return true
    }

    console.log(`[${CONTEXT}] ✅ Found legacy Meta connection in localStorage:`, {
      campaignId,
      hasBusinessId: !!legacyConnection.selected_business_id,
      businessName: legacyConnection.selected_business_name || 'N/A',
      hasPageId: !!legacyConnection.selected_page_id,
      pageName: legacyConnection.selected_page_name || 'N/A',
      hasAdAccountId: !!legacyConnection.selected_ad_account_id,
      adAccountName: legacyConnection.selected_ad_account_name || 'N/A',
      hasToken: !!legacyConnection.long_lived_user_token,
      hasUserAppToken: !!legacyConnection.user_app_token,
      paymentConnected: !!legacyConnection.ad_account_payment_connected,
      adminConnected: !!legacyConnection.admin_connected,
      status: legacyConnection.status || 'unknown',
    })

    // Convert to new format
    console.log(`[${CONTEXT}] 🔄 Converting legacy data to new format...`)
    const newConnectionData = convertLegacyConnection(legacyConnection)

    if (!newConnectionData) {
      console.error(`[${CONTEXT}] ❌ Failed to convert legacy connection data`)
      if (!silent) {
        toast.error('Failed to convert Meta connection data')
      }
      return false
    }

    console.log(`[${CONTEXT}] ✅ Conversion successful:`, {
      hasBusiness: !!newConnectionData.business,
      hasPage: !!newConnectionData.page,
      hasAdAccount: !!newConnectionData.adAccount,
      hasInstagram: !!newConnectionData.instagram,
      hasToken: !!newConnectionData.tokens.long_lived_user_token,
      connectionStatus: newConnectionData.connection_status,
      paymentConnected: newConnectionData.payment_connected,
    })

    console.log(`[${CONTEXT}] 💾 Saving to database via meta-connection-manager...`)

    // Save to database
    const success = await saveCampaignMetaConnection(campaignId, newConnectionData)

    if (!success) {
      console.error(`[${CONTEXT}] ❌ Failed to save connection to database`)
      if (!silent) {
        toast.error('Failed to migrate Meta connection data to database')
      }
      return false
    }

    console.log(`[${CONTEXT}] ✅ Successfully saved to database!`)

    // Mark migration as performed
    markMigrationPerformed(campaignId)
    console.log(`[${CONTEXT}] ✅ Migration flag set for campaign:`, campaignId)

    // Show success notification (unless silent)
    if (!silent) {
      toast.success('Meta connection upgraded to new system', {
        description: 'Your connection data is now stored securely in the database',
        duration: 5000,
      })
    }

    console.log(`[${CONTEXT}] ========================================`)
    console.log(`[${CONTEXT}] MIGRATION COMPLETE ✅ for campaign: ${campaignId}`)
    console.log(`[${CONTEXT}] ========================================`)

    return true
  } catch (error) {
    console.error(`[${CONTEXT}] ========================================`)
    console.error(`[${CONTEXT}] MIGRATION FAILED ❌ for campaign: ${campaignId}`)
    console.error(`[${CONTEXT}] Error:`, error)
    console.error(`[${CONTEXT}] Stack:`, error instanceof Error ? error.stack : 'No stack')
    console.error(`[${CONTEXT}] ========================================`)
    
    if (!silent) {
      toast.error('Failed to migrate Meta connection', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
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
 * Migrate all campaigns that have localStorage data
 * Useful for forcing migration across all user's campaigns
 */
export async function migrateAllLegacyCampaigns(options: { force?: boolean; silent?: boolean } = {}): Promise<{
  total: number
  migrated: number
  failed: number
  skipped: number
}> {
  if (typeof window === 'undefined') {
    return { total: 0, migrated: 0, failed: 0, skipped: 0 }
  }

  console.log(`[${CONTEXT}] ========================================`)
  console.log(`[${CONTEXT}] MIGRATING ALL CAMPAIGNS`)
  console.log(`[${CONTEXT}] ========================================`)

  const results = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
  }

  try {
    // Get all campaign IDs from localStorage
    const campaignIds = metaStorage.getAllCampaignIds()
    results.total = campaignIds.length

    console.log(`[${CONTEXT}] Found ${campaignIds.length} campaign(s) in localStorage`)

    // Migrate each campaign
    for (const campaignId of campaignIds) {
      console.log(`[${CONTEXT}] Processing campaign ${results.migrated + results.failed + results.skipped + 1}/${results.total}: ${campaignId}`)
      
      const success = await migrateLegacyMetaConnection(campaignId, {
        ...options,
        silent: true, // Suppress individual toasts
      })

      if (success) {
        results.migrated++
      } else {
        results.failed++
      }
    }

    console.log(`[${CONTEXT}] ========================================`)
    console.log(`[${CONTEXT}] MIGRATION SUMMARY:`)
    console.log(`[${CONTEXT}] Total: ${results.total}`)
    console.log(`[${CONTEXT}] Migrated: ${results.migrated}`)
    console.log(`[${CONTEXT}] Failed: ${results.failed}`)
    console.log(`[${CONTEXT}] Skipped: ${results.skipped}`)
    console.log(`[${CONTEXT}] ========================================`)

    // Show summary toast if not silent
    if (!options.silent) {
      if (results.migrated > 0) {
        toast.success(`Migrated ${results.migrated} campaign(s) to new system`, {
          description: results.failed > 0 
            ? `${results.failed} migration(s) failed - check console for details` 
            : 'All Meta connections are now stored securely in the database',
          duration: 5000,
        })
      }
      
      if (results.failed > 0 && results.migrated === 0) {
        toast.error(`Failed to migrate ${results.failed} campaign(s)`, {
          description: 'Check console for error details',
        })
      }
    }

    return results
  } catch (error) {
    console.error(`[${CONTEXT}] Exception during bulk migration`, error)
    if (!options.silent) {
      toast.error('Failed to migrate campaigns')
    }
    return results
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

