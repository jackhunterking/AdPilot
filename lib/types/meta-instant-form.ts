/**
 * Feature: Meta Instant Forms Type Definitions
 * Purpose: Shared types for pixel-perfect Instant Forms preview and mapping
 * References:
 *  - Meta Graph API leadgen_form: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/
 */

export type MetaInstantFormFieldType = 'FULL_NAME' | 'EMAIL' | 'PHONE'

export interface MetaInstantFormField {
  id: string
  type: MetaInstantFormFieldType
  label: string
  key: string
  required?: boolean
}

export interface MetaInstantFormPrivacy {
  url: string
  linkText: string
}

export interface MetaInstantFormThankYou {
  title: string
  body?: string
  ctaText?: string
  ctaUrl?: string
}

export interface MetaInstantForm {
  id?: string
  name: string
  privacy: MetaInstantFormPrivacy
  fields: MetaInstantFormField[]
  thankYou?: MetaInstantFormThankYou
}

/**
 * Graph API raw question shape (subset we care about)
 */
export interface GraphAPIQuestion {
  type: string
  key?: string
  label?: string
}

/**
 * Graph API leadgen_form response shape (minimal)
 */
export interface GraphAPILeadgenForm {
  id: string
  name?: string
  questions?: GraphAPIQuestion[]
  privacy_policy?: {
    url?: string
    link_text?: string
  }
  thank_you_page?: {
    title?: string
    body?: string
    button_text?: string
    website_url?: string
  }
}

