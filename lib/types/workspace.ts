/**
 * Feature: Workspace Types
 * Purpose: Type definitions for post-publish UX, ad variants, A/B testing, and workspace modes
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/database
 */

// ============================================================================
// Workspace View Modes
// ============================================================================

export type WorkspaceMode =
  | 'build'              // Building new ad (creative first)
  | 'results'            // Single ad results view
  | 'edit'               // Editing existing ad
  | 'all-ads'            // Grid view of all ads in campaign
  | 'ab-test-builder'    // A/B test setup wizard
  | 'ab-test-active'     // A/B test monitoring

// ============================================================================
// Campaign Status
// ============================================================================

export type CampaignStatus =
  | 'draft'              // Campaign being built
  | 'published'          // Campaign live
  | 'paused'             // Campaign paused
  | 'ab_test_active'     // A/B test running
  | 'completed'          // Campaign completed/ended
  | 'error'              // Error state

// ============================================================================
// Ad Variant Types
// ============================================================================

export interface AdVariant {
  id: string
  campaign_id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  variant_type: 'original' | 'ab_test' | 'manual' | 'ai_generated'
  
  // Creative data
  creative_data: {
    imageUrl?: string
    imageVariations?: string[]
    headline: string
    body: string
    cta: string
    format?: 'feed' | 'story' | 'reel'
  }
  
  // Metrics snapshot
  metrics_snapshot?: AdMetrics
  
  // A/B test reference (if part of a test)
  ab_test_id?: string
  
  // Meta data
  meta_ad_id?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  published_at?: string
}

export interface AdMetrics {
  impressions: number
  reach: number
  clicks: number
  leads?: number
  cpc: number              // Cost per click
  ctr: number              // Click-through rate
  cpl?: number             // Cost per lead
  spend: number
  budget_percentage?: number  // Percentage of campaign budget
  last_updated: string
}

// ============================================================================
// A/B Test Types
// ============================================================================

export type ABTestType =
  | 'headline'
  | 'image'
  | 'ad_copy'
  | 'cta'
  | 'combined'

export type ABTestStatus =
  | 'setup'              // Being configured
  | 'active'             // Running
  | 'completed'          // Finished (winner selected)
  | 'stopped'            // Manually stopped
  | 'error'              // Error occurred

export interface ABTest {
  id: string
  campaign_id: string
  
  // Test configuration
  test_type: ABTestType
  test_config: {
    duration_days: number
    traffic_split: number    // Percentage for variant A (B gets remainder)
    auto_declare_winner: boolean
    min_sample_size?: number
    confidence_level?: number  // 0.95 = 95% confidence
  }
  
  // Variants
  variant_a_id: string
  variant_b_id: string
  
  // Status
  status: ABTestStatus
  
  // Results
  results?: ABTestResults
  winner_variant_id?: string
  
  // Timestamps
  created_at: string
  started_at?: string
  completed_at?: string
  updated_at: string
}

export interface ABTestResults {
  variant_a_metrics: AdMetrics
  variant_b_metrics: AdMetrics
  
  // Statistical analysis
  winner: 'a' | 'b' | 'inconclusive'
  confidence_level: number
  statistical_significance: boolean
  
  // Insights
  improvement_percentage: number  // How much better the winner performed
  recommended_action: string
  
  // Computed at
  analyzed_at: string
}

// ============================================================================
// Workspace State
// ============================================================================

export interface WorkspaceState {
  mode: WorkspaceMode
  
  // Campaign reference
  campaign_id: string
  
  // Active variant being viewed/edited
  active_variant_id?: string
  
  // Active A/B test
  active_ab_test_id?: string
  
  // Navigation history (for back button)
  history: WorkspaceMode[]
  
  // Flags
  has_unsaved_changes: boolean
  is_loading: boolean
}

// ============================================================================
// Workspace Header Props
// ============================================================================

export interface WorkspaceHeaderProps {
  mode: WorkspaceMode
  onBack?: () => void        // Optional, only show for specific modes
  onNewAd: () => void        // Always available after first publish
  showBackButton?: boolean   // Control visibility
  showNewAdButton: boolean   // Control visibility
  campaignStatus?: CampaignStatus
  abTestInfo?: {
    day: number
    totalDays: number
    testType: string
  }
  totalAds?: number          // For all-ads mode display
  hasPublishedAds?: boolean  // Track if campaign has published ads
  className?: string
}

// ============================================================================
// Results Panel Props
// ============================================================================

export interface ResultsPanelProps {
  variant: AdVariant
  metrics: AdMetrics
  onEdit: () => void
  onPause: () => void
  onCreateABTest: () => void
  onViewAllAds: () => void  // Navigate to all-ads grid view
  leadFormInfo?: LeadFormInfo
  className?: string
}

export interface LeadFormInfo {
  form_id: string
  form_name: string
  is_connected: boolean
  lead_count: number
  recent_leads?: Array<{
    id: string
    name?: string
    email?: string
    submitted_at: string
  }>
}

// ============================================================================
// A/B Test Builder Props
// ============================================================================

export interface ABTestBuilderProps {
  campaign_id: string
  current_variant: AdVariant
  onCancel: () => void
  onComplete: (test: ABTest) => void
}

export interface ABTestStep {
  step: 1 | 2 | 3
  title: string
  isComplete: boolean
}

// ============================================================================
// Variant Creation Flow
// ============================================================================

export type VariantCreationMethod =
  | 'from_scratch'       // Build with AI from scratch
  | 'duplicate'          // Duplicate existing ad
  | 'ai_optimized'       // AI suggests improvements

export interface VariantCreationConfig {
  method: VariantCreationMethod
  source_variant_id?: string  // For duplicate method
  inherit_settings: boolean
  custom_settings?: {
    location?: boolean
    audience?: boolean
    budget?: boolean
  }
}

// ============================================================================
// View All Ads Props
// ============================================================================

export interface ViewAllAdsProps {
  variants: AdVariant[]
  campaign_budget: number
  onViewVariant: (variant_id: string) => void
  onEditVariant: (variant_id: string) => void
  onPauseVariant: (variant_id: string) => void
  onDeleteVariant: (variant_id: string) => void
  onCreateABTest: () => void
  onCreateNewVariant: () => void
}

// ============================================================================
// Metrics Card Props
// ============================================================================

export interface MetricsCardProps {
  metrics: AdMetrics
  compareWith?: AdMetrics  // For A/B test comparison
  showTrend?: boolean
  compactMode?: boolean
}

// ============================================================================
// State Transition Events
// ============================================================================

export type WorkspaceTransition =
  | { type: 'PUBLISH'; payload: { variant_id: string } }
  | { type: 'EDIT'; payload: { variant_id: string } }
  | { type: 'CREATE_AB_TEST'; payload: { source_variant_id: string } }
  | { type: 'START_AB_TEST'; payload: { test_id: string } }
  | { type: 'COMPLETE_AB_TEST'; payload: { test_id: string; winner_id: string } }
  | { type: 'STOP_AB_TEST'; payload: { test_id: string } }
  | { type: 'CREATE_VARIANT'; payload: { config: VariantCreationConfig } }
  | { type: 'VIEW_ALL' }
  | { type: 'VIEW_VARIANT'; payload: { variant_id: string } }
  | { type: 'CANCEL'; payload: { target_mode: WorkspaceMode } }
  | { type: 'BACK' }

// ============================================================================
// Error Types
// ============================================================================

export interface WorkspaceError {
  code: string
  message: string
  details?: Record<string, unknown>
  recoverable: boolean
}

// ============================================================================
// Export utility types
// ============================================================================

export type PartialAdVariant = Partial<AdVariant> & Pick<AdVariant, 'id' | 'campaign_id'>
export type PartialABTest = Partial<ABTest> & Pick<ABTest, 'id' | 'campaign_id'>

