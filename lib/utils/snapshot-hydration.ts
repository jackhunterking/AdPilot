/**
 * Feature: Snapshot Hydration Utilities
 * Purpose: Hydrate context states from database (campaign-level + ad-level data)
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs/guides/database
 *  - Data Hierarchy: Campaign-level (shared) vs Ad-level (specific)
 */

import type { AdSetupSnapshot } from '@/lib/types/ad-snapshot'
import { getCompleteAdData, type CampaignSharedData, type AdSpecificData } from '@/lib/services/data-hierarchy'

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
 * Note: goal and destination are optional in draft mode
 */
export function isValidSnapshot(snapshot: unknown): snapshot is AdSetupSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false
  
  const s = snapshot as Record<string, unknown>
  
  // Check required top-level keys (destination and goal are optional for drafts)
  const hasRequiredKeys = Boolean(
    s.creative && typeof s.creative === 'object' &&
    s.copy && typeof s.copy === 'object' &&
    s.location && typeof s.location === 'object'
  )
  
  return hasRequiredKeys
}

/**
 * Hydrate all contexts from a snapshot (LEGACY - use hydrateAllContextsFromDatabase for new code)
 * Returns an object with all hydrated context states
 */
export function hydrateAllContextsFromSnapshot(snapshot: AdSetupSnapshot) {
  return {
    adPreview: hydrateAdPreviewFromSnapshot(snapshot),
    adCopy: hydrateAdCopyFromSnapshot(snapshot),
    location: hydrateLocationFromSnapshot(snapshot),
    destination: hydrateDestinationFromSnapshot(snapshot),
  }
}

/**
 * Hydrate goal context from campaign shared data
 */
export function hydrateGoalFromCampaignState(campaignData: CampaignSharedData) {
  return {
    selectedGoal: campaignData.goal?.selectedGoal || 'leads',
    status: campaignData.goal?.status || 'idle',
  }
}

/**
 * Hydrate budget context from campaign shared data
 */
export function hydrateBudgetFromCampaignState(campaignData: CampaignSharedData) {
  return {
    dailyBudget: campaignData.budget?.dailyBudget || 20,
    currency: campaignData.budget?.currency || 'USD',
    isConnected: campaignData.budget?.isConnected || false,
    selectedAdAccount: campaignData.budget?.selectedAdAccount || null,
  }
}

/**
 * Hydrate Meta connection from campaign shared data
 */
export function hydrateMetaConnectionFromCampaignState(campaignData: CampaignSharedData) {
  return {
    isConnected: !!campaignData.metaConnection && campaignData.metaConnection.connection_status === 'connected',
    hasPayment: campaignData.metaConnection?.payment_connected || false,
    business: campaignData.metaConnection?.business || null,
    page: campaignData.metaConnection?.page || null,
    adAccount: campaignData.metaConnection?.adAccount || null,
    instagram: campaignData.metaConnection?.instagram || null,
  }
}

/**
 * Hydrate ad preview context from ad-specific data
 */
export function hydrateAdPreviewFromAdData(adData: AdSpecificData) {
  if (!adData.creative || !adData.copy) {
    return {
      adContent: null,
      selectedImageIndex: null,
      selectedCreativeVariation: null,
    }
  }

  return {
    adContent: {
      imageUrl: adData.creative.imageUrl,
      imageVariations: adData.creative.imageVariations || [],
      baseImageUrl: adData.creative.baseImageUrl,
      headline: adData.copy.headline,
      body: adData.copy.primaryText,
      cta: adData.copy.cta,
    },
    selectedImageIndex: adData.creative.selectedImageIndex,
    selectedCreativeVariation: adData.creative.selectedCreativeVariation || null,
  }
}

/**
 * Hydrate ad copy context from ad-specific data
 */
export function hydrateAdCopyFromAdData(adData: AdSpecificData) {
  if (!adData.copy) {
    return {
      selectedCopyIndex: null,
      status: 'idle' as const,
      customCopyVariations: null,
    }
  }

  return {
    selectedCopyIndex: adData.copy.selectedCopyIndex || null,
    status: 'completed' as const,
    customCopyVariations: adData.copy.variations || null,
  }
}

/**
 * Hydrate location context from ad-specific data
 */
export function hydrateLocationFromAdData(adData: AdSpecificData) {
  if (!adData.location) {
    return {
      locations: [],
      status: 'idle' as const,
    }
  }

  return {
    locations: adData.location.locations || [],
    status: (adData.location.locations && adData.location.locations.length > 0) 
      ? 'completed' as const 
      : 'idle' as const,
  }
}

/**
 * Hydrate destination context from ad-specific data
 */
export function hydrateDestinationFromAdData(adData: AdSpecificData) {
  if (!adData.destination) {
    return {
      status: 'idle' as const,
      data: null,
    }
  }

  return {
    status: 'completed' as const,
    data: {
      type: adData.destination.type,
      formId: adData.destination.formId,
      formName: adData.destination.formName,
      websiteUrl: adData.destination.url,
      displayLink: adData.destination.url,
      phoneNumber: adData.destination.phoneNumber,
      phoneFormatted: adData.destination.phoneFormatted,
    },
  }
}

/**
 * Hydrate all contexts from database (campaign-level + ad-level)
 * This is the NEW recommended way to load data when switching ads
 */
export async function hydrateAllContextsFromDatabase(adId: string) {
  console.log('[SnapshotHydration] Loading complete ad data from database', { adId })

  try {
    // Fetch complete data (campaign + ad)
    const data = await getCompleteAdData(adId)

    if (!data) {
      console.error('[SnapshotHydration] Failed to load ad data')
      return null
    }

    const { campaign, ad } = data

    if (!campaign || !ad) {
      console.error('[SnapshotHydration] Incomplete data', { hasCampaign: !!campaign, hasAd: !!ad })
      return null
    }

    console.log('[SnapshotHydration] ✅ Data loaded, hydrating contexts', {
      campaignId: campaign.campaignId,
      adId: ad.adId,
    })

    // Return all hydrated contexts
    return {
      // Campaign-level (shared across all ads)
      goal: hydrateGoalFromCampaignState(campaign),
      budget: hydrateBudgetFromCampaignState(campaign),
      metaConnection: hydrateMetaConnectionFromCampaignState(campaign),

      // Ad-level (specific to this ad)
      adPreview: hydrateAdPreviewFromAdData(ad),
      adCopy: hydrateAdCopyFromAdData(ad),
      location: hydrateLocationFromAdData(ad),
      destination: hydrateDestinationFromAdData(ad),
    }
  } catch (error) {
    console.error('[SnapshotHydration] Exception loading ad data', error)
    return null
  }
}

