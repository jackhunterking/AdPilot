/**
 * Feature: Meta asset snapshots
 * Purpose: Persist denormalized business/pages/ad accounts snapshot for support
 * References:
 *  - Supabase (Server client): https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

export async function saveAssetSnapshotForUser(params: {
  userId: string
  businessJson: Json | null
  pagesJson: Json | null
  adAccountsJson: Json | null
}): Promise<void> {
  const { userId, businessJson, pagesJson, adAccountsJson } = params
  await supabaseServer.from('meta_asset_snapshots').insert({
    user_id: userId,
    business_json: businessJson,
    pages_json: pagesJson,
    ad_accounts_json: adAccountsJson,
  })
}


