/**
 * Feature: Payment funding check (user-level)
 * Purpose: Check funding for selected ad account and update meta_connections
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { validateAdAccount } from '@/lib/meta/service'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userTokenRow } = await supabase
    .from('meta_tokens')
    .select('token, token_type')
    .eq('user_id', user.id)
    .eq('token_type', 'user')
    .maybeSingle()

  const token = userTokenRow?.token || (await (async () => {
    const { data: sys } = await supabase
      .from('meta_tokens')
      .select('token, token_type')
      .eq('user_id', user.id)
      .eq('token_type', 'system')
      .maybeSingle()
    return sys?.token || null
  })())

  if (!token) return NextResponse.json({ connected: false })

  const { data: account } = await supabase
    .from('meta_accounts')
    .select('business_id,ad_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!account || !account.ad_account_id) return NextResponse.json({ connected: false })

  const v = await validateAdAccount({ token, actId: account.ad_account_id })
  const hasFunding = Boolean(v.hasFunding)

  await supabase
    .from('meta_accounts')
    .update({ 
      payment_connected: hasFunding,
      funding_last_checked_at: new Date().toISOString()
    })
    .eq('user_id', user.id)

  return NextResponse.json({ connected: hasFunding })
}


