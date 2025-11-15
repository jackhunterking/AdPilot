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
  BuildSnapshotOptions,
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
    introHeadline?: string
    introDescription?: string
    privacyUrl?: string
    privacyLinkText?: string
    fields?: Array<{ id: string; type: "full_name" | "email" | "phone"; label: string; required: boolean }>
    thankYouTitle?: string
    thankYouMessage?: string
    thankYouButtonText?: string
    thankYouButtonUrl?: string
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
 * 
 * @param input - Context states from wizard
 * @param options - Build options including validation mode
 * @returns AdSetupSnapshot with fields populated based on validation mode
 */
export function buildAdSnapshot(
  input: BuildAdSnapshotInput,
  options: BuildSnapshotOptions = { mode: 'publish' }
): AdSetupSnapshot {
  const { adPreview, adCopy, destination, location, goal, budget } = input
  const mode = options.mode || 'publish'

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

  // Build destination snapshot - Conditional based on validation mode
  let destinationSnapshot: DestinationSnapshot | undefined

  if (mode === 'publish') {
    // STRICT: Require destination for publish
    if (!destination.data || !destination.data.type) {
      throw new Error('Destination must be configured before building snapshot')
    }
    destinationSnapshot = {
      type: destination.data.type,
      data: destination.data,
    }
  } else {
    // DRAFT: Optional destination for autosave
    if (destination.data?.type) {
      destinationSnapshot = {
        type: destination.data.type,
        data: destination.data,
      }
    }
    // destinationSnapshot stays undefined if not configured
  }

  // Build goal snapshot (campaign-level, immutable) - Conditional based on validation mode
  let goalSnapshot: GoalSnapshot | undefined

  if (mode === 'publish') {
    // STRICT: Require goal for publish
    if (!goal.selectedGoal) {
      throw new Error('Goal must be selected before building snapshot')
    }
    goalSnapshot = {
      type: goal.selectedGoal,
      formData: goal.formData || {}, // formData now optional since destination handles this
    }
  } else {
    // DRAFT: Optional goal for autosave
    if (goal.selectedGoal) {
      goalSnapshot = {
        type: goal.selectedGoal,
        formData: goal.formData || {},
      }
    }
    // goalSnapshot stays undefined if not selected
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
  // In draft mode, destination and goal may be undefined
  const snapshot: AdSetupSnapshot = {
    creative,
    copy,
    destination: destinationSnapshot, // May be undefined in draft mode
    location: locationSnapshot,
    goal: goalSnapshot, // May be undefined in draft mode
    budget: budgetSnapshot,
    createdAt: new Date().toISOString(),
    wizardVersion: '1.0',
  }

  return snapshot
}

/**
 * Validate ad snapshot for completeness
 * Handles both draft (partial) and publish (complete) snapshots
 */
export function validateAdSnapshot(snapshot: AdSetupSnapshot): SnapshotValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate creative (always required)
  if (snapshot.creative.selectedImageIndex === null) {
    errors.push('No image selected')
  }

  if (!snapshot.creative.imageVariations?.length && !snapshot.creative.imageUrl) {
    errors.push('No creative images available')
  }

  // Validate copy (always required)
  if (!snapshot.copy.headline || !snapshot.copy.primaryText) {
    errors.push('Ad copy is incomplete')
  }

  // Validate location (always required)
  if (!snapshot.location.locations.length) {
    errors.push('No target locations selected')
  }

  // Validate goal (required for publish, optional for draft)
  if (!snapshot.goal?.type) {
    errors.push('Goal type not selected')
  }

  // Validate destination (required for publish, optional for draft)
  if (!snapshot.destination?.type) {
    errors.push('Destination type not configured')
  } else {
    // Validate destination data if present
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

  // Validate budget (always required)
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

