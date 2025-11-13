/**
 * Feature: Meta Ad Publishing Type System
 * Purpose: Comprehensive TypeScript types for Meta Marketing API v24.0 publishing pipeline
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 *  - Campaign Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group
 *  - AdSet Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign
 *  - AdCreative Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-creative
 */

// ============================================================================
// IMAGE TYPES
// ============================================================================

export interface MetaImageUploadResult {
  hash: string;
  url: string;
  width: number;
  height: number;
  uploadedAt: string;
  fileSize: number;
  format: 'jpg' | 'png';
}

export interface ImageValidationError {
  code: string;
  message: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING';
}

export interface ImageValidationWarning {
  code: string;
  message: string;
  severity: 'WARNING';
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: ImageValidationError[];
  warnings: ImageValidationWarning[];
  dimensions: { width: number; height: number };
  aspectRatio: number;
  fileSize: number;
}

export interface FetchImageResult {
  buffer: Buffer;
  contentType: string;
  size: number;
  url: string;
}

export interface ProcessedImage {
  buffer: Buffer;
  hash: string;
  width: number;
  height: number;
  format: 'jpeg' | 'png';
  size: number;
}

// ============================================================================
// CREATIVE TYPES
// ============================================================================

/**
 * Meta Call to Action Types (v24.0)
 * Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data-call-to-action-value
 */
export type CTAType =
  | 'LEARN_MORE'
  | 'SIGN_UP'
  | 'DOWNLOAD'
  | 'BOOK_NOW'
  | 'SHOP_NOW'
  | 'CALL_NOW'
  | 'CONTACT_US'
  | 'APPLY_NOW'
  | 'GET_QUOTE'
  | 'SUBSCRIBE'
  | 'WATCH_MORE'
  | 'NO_BUTTON';

export interface CallToAction {
  type: CTAType;
  value?: {
    link?: string;
    lead_gen_form_id?: string;
    app_link?: string;
  };
}

export interface LinkData {
  link: string;
  message: string; // primary text
  name: string; // headline
  description?: string;
  call_to_action: CallToAction;
  image_hash?: string;
  picture?: string;
  caption?: string;
}

export interface VideoData {
  video_id: string;
  image_url?: string;
  title?: string;
  message?: string;
  call_to_action?: CallToAction;
}

export interface ObjectStorySpec {
  page_id: string;
  instagram_actor_id?: string;
  link_data?: LinkData;
  video_data?: VideoData;
}

export interface DegreesOfFreedomSpec {
  creative_features_spec?: {
    standard_enhancements?: {
      enroll_status: 'OPT_IN' | 'OPT_OUT';
    };
  };
}

export interface MetaCreativeSpec {
  name: string;
  object_story_spec: ObjectStorySpec;
  degrees_of_freedom_spec?: DegreesOfFreedomSpec;
  url_tags?: string;
  asset_feed_spec?: unknown; // For future catalog ads support
}

export interface MetaCreativePayload extends MetaCreativeSpec {
  // No additional fields, same as spec for now
}

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

/**
 * Meta Campaign Objectives (v24.0)
 * Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group#fields
 */
export type CampaignObjective =
  | 'OUTCOME_LEADS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_SALES'
  | 'OUTCOME_APP_PROMOTION';

export interface MetaCampaignPayload {
  name: string;
  objective: CampaignObjective;
  status: 'PAUSED' | 'ACTIVE' | 'ARCHIVED';
  special_ad_categories: string[];
  special_ad_category_country?: string[];
  spend_cap?: number;
  bid_strategy?: 'LOWEST_COST_WITHOUT_CAP' | 'COST_CAP';
}

// ============================================================================
// ADSET TYPES
// ============================================================================

export type BillingEvent = 'IMPRESSIONS' | 'LINK_CLICKS' | 'THRUPLAY' | 'LISTING_INTERACTION';

export type OptimizationGoal =
  | 'LINK_CLICKS'
  | 'LANDING_PAGE_VIEWS'
  | 'LEAD_GENERATION'
  | 'REACH'
  | 'IMPRESSIONS'
  | 'OFFSITE_CONVERSIONS'
  | 'QUALITY_LEAD'
  | 'VALUE';

export type BidStrategy =
  | 'LOWEST_COST_WITHOUT_CAP'
  | 'COST_CAP'
  | 'LOWEST_COST_WITH_BID_CAP'
  | 'LOWEST_COST_WITH_MIN_ROAS';

export type PublisherPlatform = 'facebook' | 'instagram' | 'audience_network' | 'messenger';

export interface GeoLocation {
  countries?: string[];
  regions?: Array<{ key: string }>;
  cities?: Array<{
    key: string;
    radius?: number;
    distance_unit?: 'mile' | 'kilometer';
  }>;
  location_types?: ('home' | 'recent')[];
  excluded_geo_locations?: {
    countries?: string[];
    regions?: Array<{ key: string }>;
    cities?: Array<{ key: string }>;
  };
}

export interface TargetingSpec {
  geo_locations: GeoLocation;
  age_min?: number;
  age_max?: number;
  genders?: (1 | 2)[]; // 1=male, 2=female
  publisher_platforms?: PublisherPlatform[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  device_platforms?: ('mobile' | 'desktop')[];
  locales?: number[];
  targeting_optimization?: 'expansion_all' | 'none';
  flexible_spec?: unknown[]; // For advanced targeting
  exclusions?: unknown; // For excluded audiences
}

export interface AttributionSpec {
  event_type: string;
  window_days: number;
}

export interface MetaAdSetPayload {
  name: string;
  campaign_id: string;
  daily_budget?: number;
  lifetime_budget?: number;
  billing_event: BillingEvent;
  optimization_goal: OptimizationGoal;
  bid_strategy: BidStrategy;
  bid_amount?: number;
  targeting: TargetingSpec;
  status: 'PAUSED' | 'ACTIVE';
  start_time?: string;
  end_time?: string;
  attribution_spec?: AttributionSpec[];
  promoted_object?: {
    page_id?: string;
    application_id?: string;
    pixel_id?: string;
    custom_event_type?: string;
  };
}

// ============================================================================
// AD TYPES
// ============================================================================

export interface TrackingSpec {
  action: { type: string; value: string }[];
  fb_pixel?: string[];
  page?: string[];
  post?: string[];
  application?: string[];
}

export interface MetaAdPayload {
  name: string;
  adset_id: string;
  creative: { creative_id: string };
  status: 'PAUSED' | 'ACTIVE';
  tracking_specs?: TrackingSpec[];
  conversion_domain?: string;
}

// ============================================================================
// PUBLISHING STATE TYPES
// ============================================================================

export type PublishingStage =
  | 'IDLE'
  | 'PREPARING'
  | 'VALIDATING'
  | 'UPLOADING_IMAGES'
  | 'CREATING_CREATIVES'
  | 'CREATING_CAMPAIGN'
  | 'CREATING_ADSET'
  | 'CREATING_ADS'
  | 'VERIFYING'
  | 'COMPLETE'
  | 'FAILED'
  | 'ROLLING_BACK';

export interface CreatedMetaObjects {
  imageHashes?: string[];
  creativeIds?: string[];
  campaignId?: string;
  adSetId?: string;
  adIds?: string[];
}

export interface PublishError {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  suggestedAction?: string;
  metaErrorCode?: number;
  metaErrorSubcode?: number;
  metaErrorUserTitle?: string;
  metaErrorUserMessage?: string;
  stage: PublishingStage;
  timestamp: string;
}

export interface PublishingState {
  stage: PublishingStage;
  progress: number; // 0-100
  message: string;
  currentOperation?: string;
  completedOperations: string[];
  createdObjects: CreatedMetaObjects;
  error?: PublishError;
  startedAt?: string;
  completedAt?: string;
}

export interface PublishResult {
  success: boolean;
  metaCampaignId: string;
  metaAdSetId: string;
  metaAdIds: string[];
  publishStatus: 'active' | 'paused';
  createdAt: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  code: string;
  field?: string;
  message: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING';
  suggestedFix?: string;
}

export interface ValidationWarning {
  code: string;
  field?: string;
  message: string;
  severity: 'WARNING';
  suggestedFix?: string;
}

export interface ValidationResult {
  isValid: boolean;
  canPublish: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  checkedAt: string;
}

export interface ConnectionCheck {
  isConnected: boolean;
  tokenValid: boolean;
  tokenExpiresAt?: string;
  adAccountAccessible: boolean;
  pageAccessible: boolean;
  hasRequiredPermissions: boolean;
  errors: ValidationError[];
}

export interface FundingCheck {
  hasPaymentMethod: boolean;
  accountActive: boolean;
  hasSpendingLimit: boolean;
  availableBalance?: number;
  canCreateCampaign: boolean;
  errors: ValidationError[];
}

export interface CampaignDataCheck {
  hasGoal: boolean;
  hasLocation: boolean;
  hasBudget: boolean;
  hasAdCopy: boolean;
  hasImages: boolean;
  hasDestination: boolean;
  allFieldsComplete: boolean;
  errors: ValidationError[];
}

export interface ComplianceCheck {
  textCompliant: boolean;
  imagesCompliant: boolean;
  destinationValid: boolean;
  noPolicyViolations: boolean;
  errors: ValidationError[];
}

export interface TargetingCheck {
  audienceSizeAdequate: boolean;
  estimatedReach?: number;
  targetingValid: boolean;
  errors: ValidationError[];
}

export interface PreflightChecks {
  connection: ConnectionCheck;
  funding: FundingCheck;
  campaignData: CampaignDataCheck;
  compliance: ComplianceCheck;
  targeting: TargetingCheck;
}

// ============================================================================
// PUBLISH DATA STRUCTURE
// ============================================================================

export interface PublishData {
  campaign: MetaCampaignPayload;
  adset: MetaAdSetPayload;
  ads: MetaAdPayload[];
  metadata: {
    preparedAt: string;
    version: string;
    imageHashes: Record<string, string>; // URL -> hash mapping
    creativeIds?: string[];
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface MetaAPIResponse<T = unknown> {
  data?: T;
  error?: MetaAPIError;
}

export interface MetaAPIError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
  is_transient?: boolean;
}

export interface MetaCreatedObjectResponse {
  id: string;
  success?: boolean;
}

export interface MetaPaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type GoalType = 'leads' | 'website-visits' | 'calls';

export type DestinationType = 'website' | 'form' | 'call';

export interface GoalToObjectiveMapping {
  objective: CampaignObjective;
  optimization_goal: OptimizationGoal;
  billing_event: BillingEvent;
  bid_strategy: BidStrategy;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isMetaAPIError(error: unknown): error is MetaAPIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
}

export function isPublishError(error: unknown): error is PublishError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'stage' in error &&
    'recoverable' in error
  );
}

export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'severity' in error &&
    'message' in error
  );
}

