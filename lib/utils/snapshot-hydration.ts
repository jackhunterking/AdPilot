/**
 * Feature: Snapshot Hydration Utilities
 * Purpose: Hydrate context states from ad setup snapshots for edit mode
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import type { AdSetupSnapshot } from '@/lib/types/ad-snapshot'

/**
 * Hydrate ad preview context from snapshot
 */
export function hydrateAdPreviewFromSnapshot(snapshot: AdSetupSnapshot) {
  return {
    adContent: {
      imageUrl: snapshot.creative.imageUrl,
      imageVariations: snapshot.creative.imageVariations || [],
      baseImageUrl: snapshot.creative.baseImageUrl,
      headline: snapshot.copy.headline,
      body: snapshot.copy.primaryText,
      cta: snapshot.copy.cta,
    },
    selectedImageIndex: snapshot.creative.selectedImageIndex,
    selectedCreativeVariation: null, // Not stored in snapshot
  }
}

/**
 * Hydrate ad copy context from snapshot
 */
export function hydrateAdCopyFromSnapshot(snapshot: AdSetupSnapshot) {
  return {
    selectedCopyIndex: snapshot.copy.selectedCopyIndex,
    status: 'completed' as const,
    customCopyVariations: snapshot.copy.variations || null,
  }
}

/**
 * Hydrate location context from snapshot
 */
export function hydrateLocationFromSnapshot(snapshot: AdSetupSnapshot) {
  return {
    locations: snapshot.location.locations || [],
    status: (snapshot.location.locations && snapshot.location.locations.length > 0) 
      ? 'completed' as const 
      : 'idle' as const,
  }
}

/**
 * Hydrate audience context from snapshot
 */
export function hydrateAudienceFromSnapshot(snapshot: AdSetupSnapshot) {
  // The snapshot.audience.mode is already typed as 'ai' | 'manual'
  const mode = snapshot.audience.mode
  
  return {
    status: 'completed' as const,
    targeting: {
      mode,
      description: snapshot.audience.description,
      demographics: snapshot.audience.demographics,
      detailedTargeting: snapshot.audience.detailedTargeting,
      advantage_plus_enabled: snapshot.audience.advantage_plus_enabled || mode === 'ai',
    },
    isSelected: true,
  }
}

/**
 * Hydrate destination context from snapshot
 */
export function hydrateDestinationFromSnapshot(snapshot: AdSetupSnapshot) {
  if (!snapshot.destination) {
    return {
      status: 'idle' as const,
      data: null,
    }
  }

  return {
    status: 'completed' as const,
    data: {
      type: snapshot.destination.type,
      formId: snapshot.destination.data.formId,
      formName: snapshot.destination.data.formName,
      websiteUrl: snapshot.destination.data.websiteUrl,
      displayLink: snapshot.destination.data.displayLink,
      phoneNumber: snapshot.destination.data.phoneNumber,
      phoneFormatted: snapshot.destination.data.phoneFormatted,
    },
  }
}

/**
 * Check if a snapshot is valid and complete
 */
export function isValidSnapshot(snapshot: unknown): snapshot is AdSetupSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false
  
  const s = snapshot as Record<string, unknown>
  
  // Check required top-level keys
  const hasRequiredKeys = Boolean(
    s.creative && typeof s.creative === 'object' &&
    s.copy && typeof s.copy === 'object' &&
    s.location && typeof s.location === 'object' &&
    s.audience && typeof s.audience === 'object' &&
    s.goal && typeof s.goal === 'object'
  )
  
  return hasRequiredKeys
}

/**
 * Hydrate all contexts from a snapshot
 * Returns an object with all hydrated context states
 */
export function hydrateAllContextsFromSnapshot(snapshot: AdSetupSnapshot) {
  return {
    adPreview: hydrateAdPreviewFromSnapshot(snapshot),
    adCopy: hydrateAdCopyFromSnapshot(snapshot),
    location: hydrateLocationFromSnapshot(snapshot),
    audience: hydrateAudienceFromSnapshot(snapshot),
    destination: hydrateDestinationFromSnapshot(snapshot),
  }
}

