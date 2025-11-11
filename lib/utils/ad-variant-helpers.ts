/**
 * Feature: Ad Variant Helpers
 * Purpose: Helper functions to work with AdVariant data from snapshots
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 */

import type { AdVariant } from '@/lib/types/workspace'

/**
 * Get the primary image URL from an AdVariant
 * Handles both snapshot-based and legacy ads
 */
export function getVariantImageUrl(variant: AdVariant): string | undefined {
  // Try imageVariations array first (from snapshot)
  if (variant.creative_data.imageVariations?.length) {
    return variant.creative_data.imageVariations[0]
  }
  
  // Fall back to single imageUrl
  return variant.creative_data.imageUrl
}

/**
 * Get the headline from an AdVariant
 */
export function getVariantHeadline(variant: AdVariant): string {
  return variant.creative_data.headline || 'Get Started Today'
}

/**
 * Get the primary text from an AdVariant
 */
export function getVariantPrimaryText(variant: AdVariant): string {
  return variant.creative_data.primaryText || variant.creative_data.body || 'Discover our amazing services'
}

/**
 * Get the description from an AdVariant
 */
export function getVariantDescription(variant: AdVariant): string {
  return variant.creative_data.description || variant.creative_data.body || 'Learn more about what we offer'
}

/**
 * Get the CTA text from an AdVariant
 */
export function getVariantCTA(variant: AdVariant): string {
  return variant.creative_data.cta || 'Learn More'
}

