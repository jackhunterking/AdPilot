/**
 * Feature: Ad Snapshot Schema
 * Purpose: Single source of truth for ad setup data across wizard and results view
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs/guides/database
 */

// ============================================================================
// Ad Snapshot Types - Complete state from setup wizard
// ============================================================================

export interface AdCreativeSnapshot {
  imageUrl?: string
  imageVariations?: string[]
  baseImageUrl?: string
  selectedImageIndex: number | null
  format?: 'feed' | 'story' | 'reel'
}

export interface AdCopySnapshot {
  headline: string
  primaryText: string
  description: string
  cta: string
  selectedCopyIndex: number | null
  // Store all variations for reference
  variations?: Array<{
    id: string
    headline: string
    primaryText: string
    description: string
    overlay?: {
      headline?: string
      offer?: string
      body?: string
      density?: 'none' | 'light' | 'medium' | 'heavy' | 'text-only'
    }
  }>
}

export interface LocationSnapshot {
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
}

interface TargetingOption {
  id: string
  name: string
}

interface DetailedTargeting {
  interests?: TargetingOption[]
  behaviors?: TargetingOption[]
  connections?: TargetingOption[]
}

export interface AudienceSnapshot {
  mode: 'ai' | 'manual'
  advantage_plus_enabled?: boolean
  description?: string
  demographics?: {
    ageMin?: number
    ageMax?: number
    gender?: 'all' | 'male' | 'female'
    languages?: string[]
  }
  detailedTargeting?: DetailedTargeting
}

export interface GoalSnapshot {
  type: 'leads' | 'calls' | 'website-visits'
  formData: {
    // Legacy support - formData now mostly handled by destination
    id?: string
    name?: string
    type?: string
    fields?: string[]
    phoneNumber?: string
    countryCode?: string
    websiteUrl?: string
    displayLink?: string
  }
}

export interface DestinationSnapshot {
  type: 'instant_form' | 'website_url' | 'phone_number'
  data: {
    // Instant Form (leads)
    formId?: string
    formName?: string
    // Website URL (website-visits)
    websiteUrl?: string
    displayLink?: string
    // Phone Number (calls)
    phoneNumber?: string
    phoneFormatted?: string
  }
}

export interface MetaConnectionSnapshot {
  selectedBusiness?: {
    id: string
    name: string
  }
  selectedPage?: {
    id: string
    name: string
  }
  selectedInstagram?: {
    id: string
    username: string
  }
  selectedAdAccount?: {
    id: string
    name: string
  }
}

export interface BudgetSnapshot {
  dailyBudget: number
  currency: string
  startTime?: string | null
  endTime?: string | null
  timezone?: string | null
}

/**
 * Complete ad setup snapshot
 * This is the single source of truth for all ad configuration
 */
export interface AdSetupSnapshot {
  // Creative
  creative: AdCreativeSnapshot
  
  // Copy
  copy: AdCopySnapshot
  
  // Destination (ad-level: form/URL/phone)
  destination: DestinationSnapshot
  
  // Targeting
  location: LocationSnapshot
  audience: AudienceSnapshot
  
  // Goal (campaign-level: immutable)
  goal: GoalSnapshot
  
  // Meta Connection (optional - may not be needed in snapshot)
  metaConnection?: MetaConnectionSnapshot
  
  // Budget
  budget: BudgetSnapshot
  
  // Metadata
  createdAt: string
  wizardVersion?: string // For future schema migrations
}

// ============================================================================
// Helper Types
// ============================================================================

export type PartialAdSetupSnapshot = Partial<AdSetupSnapshot>

/**
 * Validation result for ad snapshot
 */
export interface SnapshotValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

