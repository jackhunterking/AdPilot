/**
 * Feature: CRM Webhook Configuration (v1)
 * Purpose: Store webhook endpoint, secret, and event preferences for lead delivery
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Lead Management: lib/meta/leads.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { getWebhookConfig, upsertWebhookConfig } from '@/lib/meta/leads'

interface WebhookBody {
  campaignId?: string
  webhookUrl?: string
  secretKey?: string | null
  events?: string[]
  active?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    const bodyUnknown: unknown = await req.json()
    
    if (typeof bodyUnknown !== 'object' || bodyUnknown === null) {
      throw new ValidationError('Invalid request body')
    }
    
    const body = bodyUnknown as WebhookBody

    const campaignId = typeof body.campaignId === 'string' && body.campaignId.trim().length > 0
      ? body.campaignId.trim()
      : null

    if (!campaignId) {
      throw new ValidationError('campaignId required')
    }

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    await upsertWebhookConfig(campaignId, {
      webhookUrl: body.webhookUrl ?? '',
      secretKey: body.secretKey ?? null,
      events: Array.isArray(body.events) ? body.events : undefined,
      active: typeof body.active === 'boolean' ? body.active : undefined,
    })

    const config = await getWebhookConfig(campaignId)
    return successResponse({ success: true, config })
  } catch (error) {
    console.error('[POST /api/v1/meta/leads/webhook] Error:', error)
    return errorResponse(error as Error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    
    if (!campaignId) {
      throw new ValidationError('campaignId required')
    }

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    const config = await getWebhookConfig(campaignId)
    return successResponse({ config })
  } catch (error) {
    console.error('[GET /api/v1/meta/leads/webhook] Error:', error)
    return errorResponse(error as Error)
  }
}

