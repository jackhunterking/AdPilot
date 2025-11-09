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

export interface AudienceSnapshot {
  mode: 'ai' | 'advanced'
  description?: string
  interests?: string[]
  demographics?: {
    ageMin?: number
    ageMax?: number
    gender?: 'all' | 'male' | 'female'
    languages?: string[]
  }
  detailedTargeting?: Record<string, unknown>
}

export interface GoalSnapshot {
  type: 'leads' | 'calls' | 'website-visits'
  formData: {
    // Leads
    id?: string
    name?: string
    type?: string
    fields?: string[]
    // Calls
    phoneNumber?: string
    countryCode?: string
    // Website Visits
    websiteUrl?: string
    displayLink?: string
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
  
  // Targeting
  location: LocationSnapshot
  audience: AudienceSnapshot
  
  // Goal
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

