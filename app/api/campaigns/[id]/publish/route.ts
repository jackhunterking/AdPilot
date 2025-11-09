/**
 * Feature: Campaign Publish API (with Budget Confirmation)
 * Purpose: Launch campaign to Meta with budget confirmation audit
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { budgetConfirmation, metaConnectionVerified } = body

    if (!budgetConfirmation || !metaConnectionVerified) {
      return NextResponse.json({ error: 'Budget confirmation required' }, { status: 400 })
    }

    // Log budget confirmation in audit log
    await supabase
      .from('campaign_audit_log')
      .insert({
        campaign_id: campaignId,
        user_id: user.id,
        action: 'budget_confirmed',
        metadata: budgetConfirmation,
      })

    // Update budget status to 'confirmed'
    await supabase
      .from('campaigns')
      .update({ budget_status: 'confirmed' })
      .eq('id', campaignId)

    // Call existing Meta publish endpoint
    const publishResponse = await fetch(`${request.nextUrl.origin}/api/meta/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({ campaignId }),
    })

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text()
      throw new Error(`Meta publish failed: ${errorText}`)
    }

    const publishData = await publishResponse.json()

    // On success, update status to 'active'
    await supabase
      .from('campaigns')
      .update({
        published_status: 'active',
        budget_status: 'active',
      })
      .eq('id', campaignId)

    // Log publish action
    await supabase
      .from('campaign_audit_log')
      .insert({
        campaign_id: campaignId,
        user_id: user.id,
        action: 'published',
        metadata: {
          metaCampaignId: publishData.campaign?.id || null,
          publishedAt: new Date().toISOString(),
        },
      })

    return NextResponse.json({
      success: true,
      ...publishData,
      publishedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[Campaign Publish]', error)
    
    // Log error
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('campaign_audit_log')
          .insert({
            campaign_id: (await params).id,
            user_id: user.id,
            action: 'publish_failed',
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
          })
      }
    } catch (logError) {
      console.error('[Campaign Publish] Failed to log error:', logError)
    }

    return NextResponse.json(
      { error: 'Failed to publish campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

