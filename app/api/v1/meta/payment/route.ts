/**
 * Feature: Meta payment status (v1)
 * Purpose: Mark payment connected flag and reflect status for a campaign
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 *  - Facebook Payments UI: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { markPaymentConnected, updateCampaignState } from '@/lib/meta/service'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    const body: unknown = await req.json()
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body')
    }
    
    const { campaignId } = body as { campaignId?: string }
    
    if (!campaignId) {
      throw new ValidationError('campaignId is required')
    }

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    await markPaymentConnected({ campaignId })
    await updateCampaignState({ campaignId, status: 'payment_linked' })

    return successResponse({ message: 'Payment marked as connected' })
  } catch (error) {
    console.error('[POST /api/v1/meta/payment] Error:', error)
    return errorResponse(error as Error)
  }
}

