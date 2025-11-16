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
  // DEPRECATED: meta_asset_snapshots table was removed in backend refactoring
  // This function is now a no-op for backward compatibility
  console.log('[saveAssetSnapshotForUser] DEPRECATED - meta_asset_snapshots table removed')
  return Promise.resolve()
}


