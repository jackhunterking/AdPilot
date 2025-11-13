/**
 * Feature: Ad Snapshot Builder
 * Purpose: Build complete ad snapshot from wizard context states
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import type {
  AdSetupSnapshot,
  AdCreativeSnapshot,
  AdCopySnapshot,
  LocationSnapshot,
  GoalSnapshot,
  BudgetSnapshot,
  DestinationSnapshot,
  SnapshotValidation,
} from '@/lib/types/ad-snapshot'

// ============================================================================
// Context State Types (from existing contexts)
// ============================================================================

interface AdPreviewState {
  adContent: {
    imageUrl?: string
    imageVariations?: string[]
    baseImageUrl?: string
    headline: string
    body: string
    cta: string
  } | null
  selectedImageIndex: number | null
  selectedCreativeVariation: {
    gradient: string
    title: string
  } | null
}

interface AdCopyState {
  selectedCopyIndex: number | null
  status: string
  customCopyVariations: Array<{
    id: string
    primaryText: string
    description: string
    headline: string
    overlay?: {
      headline?: string
      offer?: string
      body?: string
      density?: 'none' | 'light' | 'medium' | 'heavy' | 'text-only'
    }
  }> | null
}

interface LocationState {
  locations: Array<{
    id: string
    name: string
    coordinates: [number, number]
    radius?: number
    type: 'radius' | 'city' | 'region' | 'country'
    mode: 'include' | 'exclude'
    bbox?: [number, number, number, number]
    geometry?: {
      type: string
      coordinates: number[] | number[][] | number[][][] | number[][][][]
    }
  }>
  status: string
}

interface GoalState {
  selectedGoal: 'leads' | 'calls' | 'website-visits' | null
  formData: {
    id?: string
    name?: string
    type?: string
    fields?: string[]
    phoneNumber?: string
    countryCode?: string
    websiteUrl?: string
    displayLink?: string
  } | null
  status: string
}

interface DestinationState {
  status: 'idle' | 'selecting_type' | 'in_progress' | 'completed'
  data: {
    type: 'instant_form' | 'website_url' | 'phone_number' | null
    formId?: string
    formName?: string
    websiteUrl?: string
    displayLink?: string
    phoneNumber?: string
    phoneFormatted?: string
  } | null
}

interface BudgetState {
  dailyBudget: number
  selectedAdAccount: string | null
  isConnected: boolean
  currency: string
  startTime?: string | null
  endTime?: string | null
  timezone?: string | null
}

// ============================================================================
// Builder Function
// ============================================================================

export interface BuildAdSnapshotInput {
  adPreview: AdPreviewState
  adCopy: AdCopyState
  destination: DestinationState
  location: LocationState
  goal: GoalState
  budget: BudgetState
}

/**
 * Build complete ad snapshot from wizard context states
 * This is the single source of truth builder
 */
export function buildAdSnapshot(input: BuildAdSnapshotInput): AdSetupSnapshot {
  const { adPreview, adCopy, destination, location, goal, budget } = input

  // Build creative snapshot
  const creative: AdCreativeSnapshot = {
    imageUrl: adPreview.adContent?.imageUrl,
    imageVariations: adPreview.adContent?.imageVariations,
    baseImageUrl: adPreview.adContent?.baseImageUrl,
    selectedImageIndex: adPreview.selectedImageIndex,
    format: 'feed', // Default format, can be extended
  }

  // Build copy snapshot
  const selectedCopyIndex = adCopy.selectedCopyIndex ?? 0
  const variations = adCopy.customCopyVariations || []
  const selectedCopy = variations[selectedCopyIndex] || {
    headline: adPreview.adContent?.headline || '',
    primaryText: adPreview.adContent?.body || '',
    description: adPreview.adContent?.body || '',
  }

  const copy: AdCopySnapshot = {
    headline: selectedCopy.headline || adPreview.adContent?.headline || '',
    primaryText: selectedCopy.primaryText || adPreview.adContent?.body || '',
    description: selectedCopy.description || adPreview.adContent?.body || '',
    cta: adPreview.adContent?.cta || 'Learn More',
    selectedCopyIndex: adCopy.selectedCopyIndex,
    variations: variations.length > 0 ? variations : undefined,
  }

  // Build location snapshot
  const locationSnapshot: LocationSnapshot = {
    locations: location.locations || [],
  }

  // Build destination snapshot
  if (!destination.data || !destination.data.type) {
    throw new Error('Destination must be configured before building snapshot')
  }

  const destinationSnapshot: DestinationSnapshot = {
    type: destination.data.type,
    data: destination.data,
  }

  // Build goal snapshot (campaign-level, immutable)
  if (!goal.selectedGoal) {
    throw new Error('Goal must be selected before building snapshot')
  }

  const goalSnapshot: GoalSnapshot = {
    type: goal.selectedGoal,
    formData: goal.formData || {}, // formData now optional since destination handles this
  }

  // Build budget snapshot
  const budgetSnapshot: BudgetSnapshot = {
    dailyBudget: budget.dailyBudget,
    currency: budget.currency,
    startTime: budget.startTime,
    endTime: budget.endTime,
    timezone: budget.timezone,
  }

  // Assemble complete snapshot
  const snapshot: AdSetupSnapshot = {
    creative,
    copy,
    destination: destinationSnapshot,
    location: locationSnapshot,
    goal: goalSnapshot,
    budget: budgetSnapshot,
    createdAt: new Date().toISOString(),
    wizardVersion: '1.0',
  }

  return snapshot
}

/**
 * Validate ad snapshot for completeness
 */
export function validateAdSnapshot(snapshot: AdSetupSnapshot): SnapshotValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate creative
  if (snapshot.creative.selectedImageIndex === null) {
    errors.push('No image selected')
  }

  if (!snapshot.creative.imageVariations?.length && !snapshot.creative.imageUrl) {
    errors.push('No creative images available')
  }

  // Validate copy
  if (!snapshot.copy.headline || !snapshot.copy.primaryText) {
    errors.push('Ad copy is incomplete')
  }

  // Validate location
  if (!snapshot.location.locations.length) {
    errors.push('No target locations selected')
  }

  // Validate goal (campaign-level)
  if (!snapshot.goal.type) {
    errors.push('Goal type not selected')
  }

  // Validate destination (ad-level)
  if (!snapshot.destination?.type) {
    errors.push('Destination type not configured')
  }

  if (snapshot.destination) {
    switch (snapshot.destination.type) {
      case 'instant_form':
        if (!snapshot.destination.data.formId && !snapshot.destination.data.formName) {
          errors.push('Lead form not configured')
        }
        break
      case 'phone_number':
        if (!snapshot.destination.data.phoneNumber) {
          errors.push('Phone number not configured')
        }
        break
      case 'website_url':
        if (!snapshot.destination.data.websiteUrl) {
          errors.push('Website URL not configured')
        }
        break
    }
  }

  // Validate budget
  if (snapshot.budget.dailyBudget <= 0) {
    errors.push('Daily budget must be greater than 0')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Extract the primary image URL from snapshot for quick access
 */
export function getSnapshotImageUrl(snapshot: AdSetupSnapshot): string | undefined {
  const { creative } = snapshot
  
  if (creative.selectedImageIndex !== null && creative.imageVariations?.[creative.selectedImageIndex]) {
    return creative.imageVariations[creative.selectedImageIndex]
  }
  
  if (creative.imageVariations?.[0]) {
    return creative.imageVariations[0]
  }
  
  return creative.imageUrl
}

