/**
 * Feature: Meta connection status (user-level)
 * Purpose: Summarize connection readiness for UI guards
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: tokenRow }, { data: connRow }] = await Promise.all([
    supabase.from('meta_tokens').select('access_token,expires_at,last_validated_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('meta_connections').select('business_id,page_id,ad_account_id,has_funding,status').eq('user_id', user.id).maybeSingle(),
  ])

  const ready = Boolean(tokenRow && connRow?.business_id && connRow?.ad_account_id && connRow?.has_funding)
  return NextResponse.json({
    hasToken: Boolean(tokenRow?.access_token),
    hasSelection: Boolean(connRow?.business_id && connRow?.ad_account_id),
    hasFunding: Boolean(connRow?.has_funding),
    status: connRow?.status || (tokenRow ? 'connected' : 'disconnected'),
    ready,
  })
}


