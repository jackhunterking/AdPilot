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

  const [{ data: tokenRow }, { data: accountRow }] = await Promise.all([
    supabase.from('meta_tokens').select('token,expires_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('meta_accounts').select('business_id,page_id,ad_account_id,payment_connected').eq('user_id', user.id).maybeSingle(),
  ])

  const ready = Boolean(tokenRow && accountRow?.business_id && accountRow?.ad_account_id && accountRow?.payment_connected)
  return NextResponse.json({
    hasToken: Boolean(tokenRow?.token),
    hasSelection: Boolean(accountRow?.business_id && accountRow?.ad_account_id),
    hasFunding: Boolean(accountRow?.payment_connected),
    status: (tokenRow && accountRow) ? 'connected' : 'disconnected',
    ready,
  })
}


