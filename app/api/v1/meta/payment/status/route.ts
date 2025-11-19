/**
 * Feature: Payment Status for Meta Ad Account (v1)
 * Purpose: Check ad account funding source and persist flag on success
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Ad Account API: lib/meta/service.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { getConnection, validateAdAccount, markPaymentConnected } from '@/lib/meta/service'

export async function GET(req: NextRequest) {
  console.log('[GET /api/v1/meta/payment/status] Request started')
  
  try {
    const user = await requireAuth(req)
    
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const adAccountId = searchParams.get('adAccountId')
    
    console.log('[PaymentStatus] Request params:', { campaignId, adAccountId })
    
    if (!campaignId || !adAccountId) {
      throw new ValidationError('campaignId and adAccountId required')
    }

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    const conn = await getConnection({ campaignId })
    const token = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token || null
    
    if (!token) {
      console.warn('[PaymentStatus] No token found for campaign:', campaignId)
      return successResponse({ connected: false })
    }

    const validation = await validateAdAccount({ token, actId: adAccountId })
    const connected = Boolean(validation.hasFunding)

    console.log('[PaymentStatus] Payment connection status:', { connected, campaignId, adAccountId })

    if (connected) {
      console.log('[PaymentStatus] Updating payment connected flag in database')
      try {
        await markPaymentConnected({ campaignId })
      } catch (e) {
        console.error('[PaymentStatus] Failed to update payment flag:', e)
      }
    }

    return successResponse({ connected })
  } catch (error) {
    console.error('[GET /api/v1/meta/payment/status] Error:', error)
    return errorResponse(error as Error)
  }
}

