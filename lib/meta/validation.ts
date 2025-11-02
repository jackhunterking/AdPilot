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
 */

import { normalizePhoneForMeta, normalizeUrlForMeta } from "@/lib/utils/normalize"

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


