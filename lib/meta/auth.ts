/**
 * Meta Authentication Helpers
 * Purpose: Provide server-side authentication helpers for Meta API endpoints
 */

import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Get Meta access token for the current user's active campaign
 * This is a simplified version for API routes - in production you'd want to pass campaignId
 */
export async function getMetaAccessToken(): Promise<string | null> {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    // Get the most recent campaign connection with a token
    // In a real scenario, you'd pass the campaignId from the request
    const { data, error } = await supabase
      .from('campaign_meta_connections')
      .select('long_lived_user_token, user_app_token')
      .eq('user_id', user.id)
      .not('long_lived_user_token', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error || !data) {
      console.error('[Meta Auth] Error fetching token:', error)
      return null
    }
    
    // Prefer user_app_token if available, otherwise use long_lived_user_token
    return data.user_app_token || data.long_lived_user_token
  } catch (error) {
    console.error('[Meta Auth] Error:', error)
    return null
  }
}

/**
 * Get Meta ad account ID for the current user's active campaign
 */
export async function getMetaAdAccountId(): Promise<string | null> {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    // Get the most recent campaign connection with an ad account
    const { data, error } = await supabase
      .from('campaign_meta_connections')
      .select('selected_ad_account_id')
      .eq('user_id', user.id)
      .not('selected_ad_account_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error || !data) {
      console.error('[Meta Auth] Error fetching ad account:', error)
      return null
    }
    
    // Remove 'act_' prefix if present for numeric ID
    const adAccountId = data.selected_ad_account_id
    return adAccountId?.replace('act_', '') || null
  } catch (error) {
    console.error('[Meta Auth] Error:', error)
    return null
  }
}

