/**
 * Feature: Meta Admin Verification (v1)
 * Purpose: Verify admin access to business and ad account
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Service: lib/meta/service.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { verifyAdminAccess } from '@/lib/meta/service'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    
    if (!campaignId) {
      throw new ValidationError('campaignId query parameter required')
    }

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    const result = await verifyAdminAccess(campaignId)
    
    return successResponse({
      adminConnected: result.adminConnected,
      businessRole: result.businessRole || null,
      adAccountRole: result.adAccountRole || null
    })
  } catch (error) {
    console.error('[GET /api/v1/meta/admin] Error:', error)
    return errorResponse(error as Error)
  }
}

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

    const result = await verifyAdminAccess(campaignId)
    
    return successResponse({
      adminConnected: result.adminConnected,
      businessRole: result.businessRole || null,
      adAccountRole: result.adAccountRole || null,
      message: result.adminConnected ? 'Admin access verified' : 'Admin access not found'
    })
  } catch (error) {
    console.error('[POST /api/v1/meta/admin] Error:', error)
    return errorResponse(error as Error)
  }
}

