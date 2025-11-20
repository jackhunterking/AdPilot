/**
 * Feature: Phone Number Validation (v1)
 * Purpose: Validate phone numbers for Meta ad destinations (call campaigns)
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - libphonenumber-js: https://www.npmjs.com/package/libphonenumber-js
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/reference/phone-number/
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse, successResponse, ValidationError, ApiError } from '@/app/api/v1/_middleware'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    const body = await req.json()
    const { campaignId, phoneNumber } = body

    if (!campaignId || typeof campaignId !== 'string') {
      throw new ValidationError('campaignId is required')
    }

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new ValidationError('phoneNumber is required')
    }

    // Validate phone number format
    let valid = false
    let formatted: string | undefined
    let international: string | undefined
    let countryCode: string | undefined
    let nationalNumber: string | undefined

    try {
      // Check if phone number is valid
      valid = isValidPhoneNumber(phoneNumber)
      
      if (valid) {
        const parsed = parsePhoneNumber(phoneNumber)
        if (parsed) {
          formatted = parsed.formatInternational()
          international = parsed.number
          countryCode = parsed.country
          nationalNumber = parsed.nationalNumber
        }
      }
    } catch (parseError) {
      console.error('[Phone Validation v1] Parse error:', parseError)
      valid = false
    }

    if (!valid) {
      return errorResponse(
        new ValidationError('Invalid phone number format. Please use international format (e.g., +1 555-555-5555)')
      )
    }

    // In production, could also verify with Meta API that the phone number is valid for ads
    // For now, return client-side validation result

    return successResponse({
      valid: true,
      phoneNumber: {
        original: phoneNumber,
        formatted,
        international,
        countryCode,
        nationalNumber
      },
      message: 'Phone number is valid'
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error)
    }
    console.error('[Phone Validation v1] Error:', error)
    return errorResponse(new ApiError('Failed to validate phone number', 'validation_error', 500))
  }
}

