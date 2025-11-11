/**
 * Feature: Server-side validation helpers for Meta payloads
 * Purpose: Enforce URL and phone formats before constructing Marketing API payloads
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Meta AdCreativeLinkData (link field): https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data/#Fields
 *  - Meta Call-to-Action Value (phone_number): https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data-call-to-action-value/#Fields
 *  - Meta Conversions API (phone e164 guidance): https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters#phone
 *  - Meta Call Ads: https://developers.facebook.com/docs/marketing-api/call-ads
 *  - Meta Ad Creation with validate_only: https://developers.facebook.com/docs/marketing-api/reference/ad-account/ads
 */

import { normalizePhoneForMeta, normalizeUrlForMeta } from "@/lib/utils/normalize"
import { getGraphVersion } from "@/lib/meta/service"

export function ensureMetaUrl(urlInput: string): string {
  const { normalized, valid } = normalizeUrlForMeta(urlInput)
  if (!valid) {
    throw new Error("Invalid website URL. Please provide a full destination URL (http/https).")
  }
  return normalized
}

export function ensureMetaPhone(phoneInput: string, countryCode: string): string {
  const { e164, valid } = normalizePhoneForMeta(phoneInput, countryCode)
  if (!valid) {
    throw new Error("Invalid phone number. Provide a valid international format (e.g., +15551234567).")
  }
  return e164
}

export interface PhoneValidationResult {
  valid: boolean
  e164Phone: string
  errorMessage?: string
  errorCode?: string
}

/**
 * Validate a call destination phone number against Meta Marketing API.
 * Uses validate_only execution option to check if Meta will accept the phone number
 * without creating an actual ad creative.
 * 
 * @param args.phoneNumber - E.164 formatted phone number (e.g., +15551234567)
 * @param args.token - Meta long-lived user token
 * @param args.adAccountId - Ad account ID (with or without "act_" prefix)
 * @param args.pageId - Facebook page ID for the creative
 * @returns Promise<PhoneValidationResult> - validation result with success/error info
 */
export async function validateCallPhoneWithMeta(args: {
  phoneNumber: string
  token: string
  adAccountId: string
  pageId: string
}): Promise<PhoneValidationResult> {
  const { phoneNumber, token, adAccountId, pageId } = args
  
  // Normalize phone number first
  const { e164, valid: formatValid } = normalizePhoneForMeta(phoneNumber, '')
  
  if (!formatValid) {
    return {
      valid: false,
      e164Phone: e164,
      errorMessage: 'Phone number format is invalid. Use E.164 format (e.g., +15551234567)',
      errorCode: 'INVALID_FORMAT'
    }
  }
  
  // Ensure ad account has proper prefix
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  
  // Build minimal CALL_NOW creative payload for validation
  // Reference: https://developers.facebook.com/docs/marketing-api/call-ads
  const creativePayload = {
    name: `Phone Validation Test - ${Date.now()}`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link: `tel:${e164}`,
        call_to_action: {
          type: 'CALL_NOW',
          value: {
            link: `tel:${e164}`
          }
        },
        message: 'Validation test',
        name: 'Validation test'
      }
    },
    // Use validate_only to check without creating
    // Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-account/ads
    execution_options: ['validate_only']
  }
  
  const gv = getGraphVersion()
  const url = `https://graph.facebook.com/${gv}/${actId}/adcreatives`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(creativePayload),
      cache: 'no-store'
    })
    
    const responseText = await response.text()
    let responseJson: unknown = null
    
    try {
      responseJson = responseText ? JSON.parse(responseText) : null
    } catch {
      responseJson = null
    }
    
    if (response.ok) {
      // validate_only returns {"success": true} on valid payload
      return {
        valid: true,
        e164Phone: e164
      }
    }
    
    // Extract error details from Meta response
    const errorObj = responseJson && typeof responseJson === 'object' && responseJson !== null
      ? (responseJson as Record<string, unknown>)
      : {}
    
    const error = errorObj.error && typeof errorObj.error === 'object' && errorObj.error !== null
      ? (errorObj.error as Record<string, unknown>)
      : {}
    
    const errorMessage = typeof error.message === 'string' 
      ? error.message 
      : 'Meta rejected the phone number. Please verify it is correct and can receive calls.'
    
    const errorCode = typeof error.code === 'number' || typeof error.code === 'string'
      ? String(error.code)
      : 'UNKNOWN'
    
    return {
      valid: false,
      e164Phone: e164,
      errorMessage,
      errorCode
    }
  } catch (error) {
    // Network or other error
    return {
      valid: false,
      e164Phone: e164,
      errorMessage: error instanceof Error ? error.message : 'Failed to validate phone number with Meta',
      errorCode: 'NETWORK_ERROR'
    }
  }
}


