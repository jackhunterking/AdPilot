/**
 * Feature: Meta business connection persistence
 * Purpose: Upsert selected Business/Page/Ad Account into `meta_connections`
 * References:
 *  - Supabase (Server client): https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface SaveBody {
  businessId: string
  businessName?: string
  pageId?: string
  pageName?: string
  adAccountId?: string
  adAccountName?: string
  currency?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const b = body as Partial<SaveBody>

    if (!b.businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    // Check if ad_account_id exists - required field
    if (!b.adAccountId) {
      return NextResponse.json({ error: 'adAccountId required' }, { status: 400 })
    }

    const payload = {
      user_id: user.id,
      business_id: b.businessId,
      business_name: b.businessName ?? null,
      page_id: b.pageId ?? null,
      page_name: b.pageName ?? null,
      ad_account_id: b.adAccountId,
      ad_account_name: b.adAccountName ?? null,
      currency: b.currency ?? null,
      payment_connected: false, // Will be updated separately by payment check
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('meta_accounts')
      .upsert(payload, { onConflict: 'ad_account_id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


