/**
 * Feature: Meta Business Connection Persistence (v1)
 * Purpose: Upsert selected Business/Page/Ad Account into meta_connections
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { createServerClient } from '@/lib/supabase/server'

interface SaveConnectionBody {
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
    const user = await requireAuth(req)

    const body: unknown = await req.json()
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body')
    }
    
    const b = body as Partial<SaveConnectionBody>

    if (!b.businessId) {
      throw new ValidationError('businessId required')
    }

    // Check if ad_account_id exists - required field
    if (!b.adAccountId) {
      throw new ValidationError('adAccountId required')
    }

    const supabase = await createServerClient()
    
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
      throw new Error(error.message)
    }

    return successResponse({ success: true })
  } catch (error) {
    console.error('[POST /api/v1/meta/business-connections] Error:', error)
    return errorResponse(error as Error)
  }
}

