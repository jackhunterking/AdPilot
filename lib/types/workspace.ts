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

// Ad status values representing the publishing lifecycle
export type AdStatus = 
  | 'draft'              // Being built, not published yet
  | 'pending_review'     // Submitted to Meta, awaiting approval
  | 'active'             // Approved and running
  | 'learning'           // Active but in learning phase
  | 'paused'             // Temporarily stopped
  | 'rejected'           // Rejected by Meta, needs changes
  | 'failed'             // Publishing failed due to API error
  | 'archived'           // Historical/inactive

// Meta review status tracking
export type MetaReviewStatus =
  | 'not_submitted'      // Draft, not sent to Meta
  | 'pending'            // Under review by Meta
  | 'approved'           // Approved and live
  | 'rejected'           // Rejected, needs changes
  | 'changes_requested'  // Specific changes requested

export interface AdVariant {
  id: string
  campaign_id: string
  name: string
  status: AdStatus
  variant_type: 'original' | 'ab_test' | 'manual' | 'ai_generated'
  
  // Creative data
  creative_data: {
    imageUrl?: string
    imageVariations?: string[]
    headline: string
    body: string
    primaryText?: string
    description?: string
    cta: string
    format?: 'feed' | 'story' | 'reel'
  }
  
  // Metrics snapshot
  metrics_snapshot?: AdMetrics
  
  // A/B test reference (if part of a test)
  ab_test_id?: string
  
  // Meta data
  meta_ad_id?: string
  meta_review_status?: MetaReviewStatus
  
  // Timestamps
  created_at: string
  updated_at: string
  published_at?: string      // When submitted for review
  approved_at?: string       // When approved by Meta
  rejected_at?: string       // When rejected by Meta
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
  hasUnsavedChanges: boolean
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
  // Meta Integration & Budget props
  metaConnectionStatus?: 'disconnected' | 'pending' | 'connected' | 'error' | 'expired'
  paymentStatus?: 'unknown' | 'verified' | 'missing' | 'flagged' | 'processing'
  campaignBudget?: number | null
  onMetaConnect?: () => void
  onBudgetUpdate?: (budget: number) => Promise<void> | void
  // Save props (edit mode)
  onSave?: () => void
  isSaveDisabled?: boolean
  // Create Ad props (build mode)
  onCreateAd?: () => void
  isCreateAdDisabled?: boolean
  // NEW: Step-aware publish/save props
  currentStepId?: string     // Current step ID (e.g., "budget", "ads", "copy")
  isPublishReady?: boolean   // Whether all requirements are met for publish
  onSaveDraft?: () => void   // Save draft handler (final step, build mode)
  onPublish?: () => void     // Publish handler (final step or edit published ad)
  isPublishing?: boolean     // Loading state during publish
  currentAdId?: string       // Current ad being edited/built
  onViewAllAds?: () => void  // Navigate to all ads view
  isAdPublished?: boolean    // Whether current ad has been published (has meta_ad_id)
  className?: string
}

// ============================================================================
// Results Panel Props
// ============================================================================

export interface ResultsPanelProps {
  variant: AdVariant
  metrics: AdMetrics
  onEdit: () => void
  onPause: () => Promise<boolean>  // Returns true on success for navigation
  onResume: () => Promise<boolean>  // Returns true on success
  onCreateABTest: () => void
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
// KPI Metrics & Leads Table Types
// ============================================================================

export interface KPIMetricsRow {
  impressions: number
  reach: number
  clicks: number
  ctr: number | null
  cpc: number | null
  cpm: number | null
  spend: number
  results: number
  cost_per_result: number | null
}

export interface LeadTableRow {
  id: string
  meta_lead_id: string
  meta_form_id: string
  submitted_at: string
  form_data: Record<string, unknown>
}

export type SortOrder = 'asc' | 'desc'

export interface TableSortConfig {
  column: string
  order: SortOrder
}

export interface TableFilterConfig {
  search: string
  dateFrom: string | null
  dateTo: string | null
}

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
}

// ============================================================================
// Publishing Error Types
// ============================================================================

export type PublishErrorCode =
  | 'validation_error'
  | 'policy_violation'
  | 'payment_required'
  | 'token_expired'
  | 'api_error'
  | 'network_error'
  | 'unknown_error'

export interface PublishError {
  code: PublishErrorCode
  message: string
  userMessage: string
  details?: Record<string, unknown>
  recoverable: boolean
  suggestedAction?: string
  timestamp: string
}

// ============================================================================
// Ad Publishing Metadata Types
// ============================================================================

export interface AdPublishingMetadata {
  id: string
  ad_id: string
  meta_ad_id?: string | null
  
  // Publishing timeline
  submission_timestamp?: string | null
  last_status_check?: string | null
  status_history: Array<{
    from: AdStatus
    to: AdStatus
    timestamp: string
    triggered_by: string
  }>
  
  // Error tracking
  error_code?: string | null
  error_message?: string | null
  error_user_message?: string | null
  error_details?: Record<string, unknown> | null
  retry_count: number
  max_retries: number
  
  // Meta review feedback
  meta_review_feedback?: Record<string, unknown> | null
  rejection_reasons?: string[] | null
  
  // Status metadata
  current_status: AdStatus
  previous_status?: AdStatus | null
  status_changed_at: string
  
  // Timestamps
  created_at: string
  updated_at: string
}

// ============================================================================
// Status Transition Types
// ============================================================================

export interface AdStatusTransition {
  id: string
  ad_id: string
  from_status?: AdStatus | null
  to_status: AdStatus
  triggered_by: 'user' | 'meta_webhook' | 'system' | 'api'
  trigger_details?: Record<string, unknown> | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  transitioned_at: string
}

// ============================================================================
// Webhook Event Types
// ============================================================================

export interface MetaWebhookEvent {
  id: string
  event_id?: string | null
  event_type: string
  meta_ad_id?: string | null
  ad_id?: string | null
  campaign_id?: string | null
  payload: Record<string, unknown>
  processed: boolean
  processed_at?: string | null
  processing_error?: string | null
  retry_count: number
  received_at: string
  created_at: string
}

// ============================================================================
// Save Ad Changes API Types
// ============================================================================

export interface SaveAdCopyData {
  primaryText: string
  headline: string
  description: string
  selectedCopyIndex: number
  variations: Array<{
    primaryText: string
    headline: string
    description: string
  }>
}

export interface SaveAdCreativeData {
  imageVariations: string[]
  selectedImageIndex: number
  selectedCreativeVariation: {
    gradient: string
    imageUrl?: string
    [key: string]: unknown
  }
  baseImageUrl?: string
  format: 'feed' | 'story'
}

export interface SaveAdDestinationData {
  type: 'website' | 'form' | 'call'
  url?: string
  phoneNumber?: string
  normalizedPhone?: string
  formFields?: Array<{
    id: string
    type: string
    label: string
    required: boolean
    options?: string[]
  }>
  cta: string
}

export interface SaveAdPayload {
  copy: SaveAdCopyData
  creative: SaveAdCreativeData
  destination: SaveAdDestinationData
  metadata?: {
    editContext?: string
    savedFrom?: string
  }
}

export interface SaveAdResponse {
  success: boolean
  ad: {
    id: string
    campaign_id: string
    name: string
    status: string
    copy_data: unknown
    creative_data: unknown
    destination_data: unknown
    setup_snapshot: unknown
    updated_at: string
  }
  error?: string
}

// ============================================================================
// Export utility types
// ============================================================================

export type PartialAdVariant = Partial<AdVariant> & Pick<AdVariant, 'id' | 'campaign_id'>
export type PartialABTest = Partial<ABTest> & Pick<ABTest, 'id' | 'campaign_id'>

// ============================================================================
// Normalized Schema Types (New Backend Architecture)
// ============================================================================

/**
 * Complete ad data from normalized tables
 * Use these types when working with the new backend structure
 */
export interface NormalizedAdData {
  ad: NormalizedAd
  creatives: NormalizedAdCreative[]
  copyVariations: NormalizedAdCopyVariation[]
  locations: NormalizedAdLocation[]
  destination: NormalizedAdDestination | null
  budget: NormalizedAdBudget | null
}

export interface NormalizedAd {
  id: string
  campaign_id: string
  name: string
  status: AdStatus
  meta_ad_id: string | null
  selected_creative_id: string | null
  selected_copy_id: string | null
  destination_type: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  approved_at: string | null
  rejected_at: string | null
  last_error: Record<string, unknown> | null
  meta_review_status: string
  metrics_snapshot: Record<string, unknown> | null
}

export interface NormalizedAdCreative {
  id: string
  ad_id: string
  creative_format: 'feed' | 'story' | 'reel'
  image_url: string
  creative_style: string | null
  variation_label: string | null
  gradient_class: string | null
  is_base_image: boolean | null
  sort_order: number | null
  created_at: string
}

export interface NormalizedAdCopyVariation {
  id: string
  ad_id: string
  headline: string
  primary_text: string
  description: string | null
  cta_text: string
  cta_type: string | null
  overlay_headline: string | null
  overlay_offer: string | null
  overlay_body: string | null
  overlay_density: string | null
  is_selected: boolean | null
  sort_order: number | null
  generation_prompt: string | null
  created_at: string
}

export interface NormalizedAdLocation {
  id: string
  ad_id: string
  location_name: string
  location_type: 'city' | 'region' | 'country' | 'radius' | 'postal_code'
  latitude: number | null
  longitude: number | null
  radius_km: number | null
  inclusion_mode: 'include' | 'exclude'
  meta_location_key: string | null
  created_at: string
}

export interface NormalizedAdDestination {
  id: string
  ad_id: string
  destination_type: 'instant_form' | 'website_url' | 'phone_number'
  instant_form_id: string | null
  website_url: string | null
  display_link: string | null
  utm_params: Record<string, string> | null
  phone_number: string | null
  phone_country_code: string | null
  phone_formatted: string | null
  created_at: string
  updated_at: string
}

export interface NormalizedAdBudget {
  id: string
  ad_id: string
  daily_budget_cents: number
  currency_code: string
  start_date: string | null
  end_date: string | null
  timezone: string | null
  created_at: string
  updated_at: string
}

/**
 * Instant Form Types
 */
export interface NormalizedInstantForm {
  id: string
  campaign_id: string | null
  user_id: string
  meta_form_id: string | null
  name: string
  intro_headline: string
  intro_description: string | null
  intro_image_url: string | null
  privacy_policy_url: string
  privacy_link_text: string | null
  thank_you_title: string
  thank_you_message: string
  thank_you_button_text: string | null
  thank_you_button_url: string | null
  created_at: string
  updated_at: string
}

export interface NormalizedInstantFormField {
  id: string
  form_id: string
  field_type: 'full_name' | 'email' | 'phone' | 'custom_text'
  field_label: string
  is_required: boolean | null
  sort_order: number
  created_at: string
}

/**
 * Campaign Analytics Types
 */
export interface CampaignAnalytics {
  campaign_id: string
  campaign_name: string
  campaign_status: string | null
  goal_type: string | null
  total_budget: number
  allocated_budget: number
  remaining_budget: number
  currency: string
  budget_status: string | null
  ad_count: number
  active_ads: number
  draft_ads: number
  created_at: string | null
  updated_at: string | null
}

