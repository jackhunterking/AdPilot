/**
 * Feature: Payment capability API (Refactored for localStorage architecture)
 * Purpose: Return whether the current user can add/manage payment for the
 *          selected ad account. Uses meta_tokens table + workspace state.
 * References:
 *  - Graph API: https://developers.facebook.com/docs/graph-api
 *  - Business User: https://developers.facebook.com/docs/graph-api/reference/business-user/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { validateAdAccount } from '@/lib/meta/service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const adAccountId = searchParams.get('adAccountId')
    
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Authorize campaign ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ad account ID must be provided as query parameter
    if (!adAccountId) {
      return NextResponse.json({ 
        error: 'adAccountId required',
        hasFunding: false,
        hasFinance: false,
        hasManage: false,
      }, { status: 400 })
    }

    // Get user's Meta token from meta_tokens table
    const { data: tokenRow } = await supabaseServer
      .from('meta_tokens')
      .select('token')
      .eq('user_id', user.id)
      .eq('token_type', 'user')
      .single()

    if (!tokenRow?.token) {
      return NextResponse.json({ 
        error: 'No Meta token found',
        hasFunding: false,
        hasFinance: false,
        hasManage: false,
      }, { status: 200 })
    }

    // Validate ad account and check funding
    console.log('[PaymentCapability] Validating ad account', {
      campaignId,
      adAccountId,
      hasToken: !!tokenRow.token,
    })
    
    const validation = await validateAdAccount({
      token: tokenRow.token,
      actId: adAccountId,
    })

    console.log('[PaymentCapability] Validation result', {
      campaignId,
      adAccountId,
      hasFunding: validation.hasFunding,
      isActive: validation.isActive,
      status: validation.status,
      disableReason: validation.disableReason,
      rawDataKeys: Object.keys(validation.rawData),
      fundingSource: validation.rawData.funding_source,
      fundingSourceDetails: validation.rawData.funding_source_details,
    })

    return NextResponse.json({
      hasFunding: validation.hasFunding || false,
      hasFinance: false, // Simplified for now
      hasManage: false, // Simplified for now
      adAccountId,
      isActive: validation.isActive,
      accountStatus: validation.status,
      disableReason: validation.disableReason,
      debug: {
        isActive: validation.isActive,
        status: validation.status,
        fundingSource: validation.rawData.funding_source,
        fundingSourceDetails: validation.rawData.funding_source_details,
      }
    })
  } catch (e) {
    console.error('[PaymentCapability] Server error:', e)
    return NextResponse.json({ 
      error: e instanceof Error ? e.message : 'Server error',
      hasFunding: false,
    }, { status: 500 })
  }
}


