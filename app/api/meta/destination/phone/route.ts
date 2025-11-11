/**
 * Feature: Validate Call Phone Number
 * Purpose: Validate phone numbers with Meta Marketing API before saving
 * References:
 *  - Meta Call Ads: https://developers.facebook.com/docs/marketing-api/call-ads
 *  - Meta Ad Creation with validate_only: https://developers.facebook.com/docs/marketing-api/reference/ad-account/ads
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { validateCallPhoneWithMeta } from '@/lib/meta/validation'
import { metaStorage } from '@/lib/meta/storage'

interface ValidatePhoneRequestBody {
  campaignId: string
  phoneNumber: string
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    const body = (bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? (bodyUnknown as ValidatePhoneRequestBody)
      : {} as ValidatePhoneRequestBody

    const { campaignId, phoneNumber } = body

    // Validate required fields
    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json(
        { 
          valid: false,
          error: 'campaignId is required',
          errorCode: 'MISSING_CAMPAIGN_ID'
        },
        { status: 400 }
      )
    }

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { 
          valid: false,
          error: 'phoneNumber is required',
          errorCode: 'MISSING_PHONE_NUMBER'
        },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Unauthorized',
          errorCode: 'UNAUTHORIZED'
        },
        { status: 401 }
      )
    }

    // Get Meta connection from localStorage storage
    const connection = metaStorage.getConnectionWithToken(campaignId)
    
    if (!connection) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Meta connection not found. Please connect your Meta account first.',
          errorCode: 'NO_META_CONNECTION'
        },
        { status: 400 }
      )
    }

    // Validate we have required Meta assets
    const token = connection.long_lived_user_token
    const adAccountId = connection.selected_ad_account_id
    const pageId = connection.selected_page_id

    if (!token) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Meta token not found. Please reconnect your Meta account.',
          errorCode: 'NO_META_TOKEN'
        },
        { status: 400 }
      )
    }

    if (!adAccountId) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Meta ad account not selected. Please select an ad account in Meta settings.',
          errorCode: 'NO_AD_ACCOUNT'
        },
        { status: 400 }
      )
    }

    if (!pageId) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Meta page not selected. Please select a Facebook page in Meta settings.',
          errorCode: 'NO_PAGE'
        },
        { status: 400 }
      )
    }

    // Call validation helper
    const result = await validateCallPhoneWithMeta({
      phoneNumber,
      token,
      adAccountId,
      pageId
    })

    // Return result
    if (result.valid) {
      return NextResponse.json({
        valid: true,
        e164Phone: result.e164Phone,
        message: 'Phone number validated successfully'
      })
    } else {
      return NextResponse.json({
        valid: false,
        e164Phone: result.e164Phone,
        error: result.errorMessage,
        errorCode: result.errorCode
      })
    }

  } catch (error) {
    console.error('[ValidatePhone] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to validate phone number'
    
    return NextResponse.json(
      { 
        valid: false,
        error: message,
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

