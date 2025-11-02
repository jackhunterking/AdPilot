/**
 * Feature: URL and Phone Normalization for Meta Ads
 * Purpose: Provide pure utilities to coerce user input into formats accepted by Meta APIs
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Meta AdCreativeLinkData (link field): https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data/#Fields
 *  - Meta Call-to-Action Value (phone_number): https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data-call-to-action-value/#Fields
 *  - Meta Conversions API (phone e164 guidance): https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters#phone
 */

export interface NormalizeUrlResult {
  normalized: string
  valid: boolean
  reason?: string
}

export interface NormalizePhoneResult {
  e164: string
  valid: boolean
  reason?: string
}

/**
 * Normalize arbitrary user URL input to a Meta-acceptable absolute URL.
 * Rules:
 * - default to https when scheme is missing
 * - require http(s) protocol
 * - hostname must contain a dot with a TLD length >= 2
 * - return URL.toString() for canonical form (includes trailing slash when no path)
 */
export function normalizeUrlForMeta(input: string): NormalizeUrlResult {
  const raw = (input || "").trim()
  if (!raw) return { normalized: "", valid: false, reason: "empty" }

  const hasScheme = /^https?:\/\//i.test(raw)
  const candidate = hasScheme ? raw : `https://${raw}`

  try {
    const url = new URL(candidate)

    if (!/^https?:$/i.test(url.protocol)) {
      return { normalized: candidate, valid: false, reason: "protocol" }
    }

    const host = url.hostname
    if (!host || /\s/.test(host)) {
      return { normalized: candidate, valid: false, reason: "hostname" }
    }
    const parts = host.split(".")
    if (parts.length < 2) {
      return { normalized: candidate, valid: false, reason: "tld" }
    }
    const tld = parts[parts.length - 1] ?? ""
    if (!/^[a-z0-9-]{2,}$/i.test(tld)) {
      return { normalized: candidate, valid: false, reason: "tld" }
    }

    // URL.toString() yields a canonical absolute URL
    return { normalized: url.toString(), valid: true }
  } catch {
    return { normalized: candidate, valid: false, reason: "parse" }
  }
}

/**
 * Normalize a phone number to E.164 format expected by Meta for call ads.
 * - Accept local numbers and a selected country code
 * - Keep an existing leading "+" if user already typed an international number
 * - Validate against E.164: +[1-9]\d{1,14}
 */
export function normalizePhoneForMeta(input: string, countryCode: string): NormalizePhoneResult {
  const raw = (input || "").trim()
  const cc = (countryCode || "").trim()

  if (!raw) return { e164: "", valid: false, reason: "empty" }

  const digitsOnly = raw.replace(/[\s\-()]/g, "")

  const alreadyInternational = digitsOnly.startsWith("+")
  const prefixedCc = cc.startsWith("+") ? cc : cc ? `+${cc}` : ""

  const combined = alreadyInternational
    ? digitsOnly
    : `${prefixedCc}${digitsOnly.replace(/^\+/, "")}`

  const e164 = combined.startsWith("+") ? combined : `+${combined}`

  const e164Regex = /^\+[1-9]\d{1,14}$/
  if (!e164Regex.test(e164)) {
    return { e164, valid: false, reason: "format" }
  }

  return { e164, valid: true }
}


