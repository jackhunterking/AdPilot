/**
 * Feature: List Business-owned Ad Accounts
 * Purpose: Server-proxy Graph call using user's stored token
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { fetchBusinessOwnedAdAccounts } from '@/lib/meta/ad-accounts'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

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

  if (!token) return NextResponse.json({ data: [] })

  const data = await fetchBusinessOwnedAdAccounts({ token, businessId })
  return NextResponse.json({ data })
}


