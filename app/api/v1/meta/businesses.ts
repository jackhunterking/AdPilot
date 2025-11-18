/**
 * Feature: List user's Businesses (owned/admin)
 * Purpose: Server-proxy Graph call using user's stored token
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { fetchUserBusinesses } from '@/lib/meta/business'

export async function GET(_req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Prefer user token, fallback to system token
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

  const data = await fetchUserBusinesses({ token })
  return NextResponse.json({ data })
}


