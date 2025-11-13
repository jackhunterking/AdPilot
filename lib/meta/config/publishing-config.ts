/**
 * Feature: Meta Ad Publishing Configuration
 * Purpose: Centralized configuration constants for Meta Marketing API v24.0
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 *  - Rate Limiting: https://developers.facebook.com/docs/graph-api/overview/rate-limiting
 *  - Creative Specs: https://developers.facebook.com/docs/marketing-api/creative-specifications
 */

import type { GoalType, GoalToObjectiveMapping } from '../types/publishing';

// ============================================================================
// META API VERSION & ENDPOINTS
// ============================================================================

export const META_API_VERSION = 'v24.0';
export const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================================================
// IMAGE REQUIREMENTS
// ============================================================================

export const IMAGE_REQUIREMENTS = {
  maxFileSize: 30 * 1024 * 1024, // 30MB per Meta specs
  minDimensions: { width: 600, height: 600 },
  maxDimensions: { width: 8000, height: 8000 },
  formats: ['image/jpeg', 'image/png'] as const,
  aspectRatios: {
    feed: { min: 0.8, max: 1.91 }, // 4:5 to 1.91:1
    story: { min: 0.5625, max: 0.5625 }, // 9:16 exact
    reel: { min: 0.5625, max: 0.5625 } // 9:16 exact
  },
  recommendedDimensions: {
    feed: { width: 1080, height: 1080 }, // 1:1 square
    story: { width: 1080, height: 1920 }, // 9:16
    reel: { width: 1080, height: 1920 } // 9:16
  }
} as const;

// ============================================================================
// TEXT LIMITS (Meta API v24.0)
// ============================================================================

export const TEXT_LIMITS = {
  primaryText: {
    feed: 125, // Recommended for feed
    other: 2200, // Max for other placements
    max: 2200
  },
  headline: {
    desktop: 27, // Max for desktop feed
    mobile: 40, // Max for mobile
    max: 40
  },
  description: {
    desktop: 27,
    mobile: 30,
    max: 30
  },
  linkDescription: 30,
  displayLink: 255
} as const;

// ============================================================================
// BUDGET MINIMUMS (by currency)
// ============================================================================

/**
 * Minimum daily budgets in cents for each currency
 * Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign#budget
 */
export const BUDGET_MINIMUMS: Record<string, number> = {
  USD: 100, // $1.00
  EUR: 100, // €1.00
  GBP: 100, // £1.00
  CAD: 100, // $1.00 CAD
  AUD: 150, // $1.50 AUD
  JPY: 100, // ¥100
  INR: 4000, // ₹40.00
  BRL: 500, // R$5.00
  MXN: 2000, // $20.00 MXN
  // Add more as needed
};

export const DEFAULT_BUDGET_MINIMUM = 100; // Fallback: $1.00 equivalent

// ============================================================================
// RETRY & RESILIENCE CONFIGURATION
// ============================================================================

export const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2, // Exponential backoff
  timeoutMultiplier: 1.5 // Increase timeout on each retry
} as const;

export const RATE_LIMIT_CONFIG = {
  maxRequestsPerHour: 200,
  burstLimit: 50,
  cooldownPeriod: 300000, // 5 minutes
  circuitBreakerThreshold: 5, // Failures before opening circuit
  circuitBreakerTimeout: 60000 // 1 minute before retry
} as const;

export const TIMEOUT_CONFIG = {
  apiCall: 30000, // 30 seconds
  imageUpload: 60000, // 60 seconds
  imageDownload: 30000, // 30 seconds
  totalPublish: 300000, // 5 minutes total
  validation: 10000 // 10 seconds
} as const;

// ============================================================================
// GOAL TO META OBJECTIVE MAPPING (v24.0)
// ============================================================================

/**
 * Maps internal goal types to Meta API v24.0 objectives and settings
 * Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group#objectives
 */
export const GOAL_TO_OBJECTIVE_MAP: Record<GoalType, GoalToObjectiveMapping> = {
  leads: {
    objective: 'OUTCOME_LEADS',
    optimization_goal: 'LEAD_GENERATION',
    billing_event: 'IMPRESSIONS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP'
  },
  'website-visits': {
    objective: 'OUTCOME_TRAFFIC',
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP'
  },
  calls: {
    objective: 'OUTCOME_TRAFFIC',
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP'
  }
} as const;

// ============================================================================
// CALL TO ACTION MAPPINGS
// ============================================================================

/**
 * Maps destination types and goals to appropriate CTA types
 * Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data-call-to-action-value
 */
export const CTA_TYPE_MAP = {
  leads: ['SIGN_UP', 'LEARN_MORE', 'APPLY_NOW', 'GET_QUOTE', 'SUBSCRIBE'],
  'website-visits': ['LEARN_MORE', 'SHOP_NOW', 'BOOK_NOW', 'WATCH_MORE', 'DOWNLOAD'],
  calls: ['CALL_NOW', 'CONTACT_US', 'GET_QUOTE']
} as const;

export const DEFAULT_CTA_BY_GOAL: Record<GoalType, string> = {
  leads: 'LEARN_MORE',
  'website-visits': 'LEARN_MORE',
  calls: 'CALL_NOW'
} as const;

// ============================================================================
// TARGETING DEFAULTS
// ============================================================================

export const TARGETING_DEFAULTS = {
  ageMin: 18,
  ageMax: 65,
  locationTypes: ['home', 'recent'] as const,
  publisherPlatforms: ['facebook', 'instagram'] as const,
  devicePlatforms: ['mobile', 'desktop'] as const,
  facebookPositions: ['feed', 'instant_article', 'marketplace', 'video_feeds', 'story'],
  instagramPositions: ['stream', 'story', 'explore']
} as const;

export const AUDIENCE_SIZE_LIMITS = {
  minimum: 1000, // Meta requires at least 1000 people
  optimal: 50000, // Optimal for learning phase
  tooNarrow: 5000, // Warning threshold
  tooBroad: 50000000 // 50M+ may be too broad
} as const;

// ============================================================================
// VALIDATION THRESHOLDS
// ============================================================================

export const VALIDATION_THRESHOLDS = {
  maxImageCount: 10, // Per ad
  maxAdCount: 50, // Per adset
  minBudgetForTargeting: 100, // $1.00 minimum
  maxCampaignNameLength: 255,
  maxAdSetNameLength: 255,
  maxAdNameLength: 255,
  maxCreativeNameLength: 255
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Meta API Error Codes
 * Reference: https://developers.facebook.com/docs/marketing-api/error-reference
 */
export const META_ERROR_CODES = {
  INVALID_ACCESS_TOKEN: 190,
  PERMISSION_DENIED: 200,
  RATE_LIMIT_EXCEEDED: 80004,
  ACCOUNT_TEMPORARILY_UNAVAILABLE: 2,
  UNKNOWN_ERROR: 1,
  INVALID_PARAMETER: 100,
  SESSION_EXPIRED: 463,
  ACCOUNT_DISABLED: 368,
  AD_ACCOUNT_DISABLED: 2635,
  BUSINESS_ACCOUNT_ERROR: 3920
} as const;

/**
 * Categorize errors by recoverability
 */
export const RECOVERABLE_ERROR_CODES = new Set([
  META_ERROR_CODES.RATE_LIMIT_EXCEEDED,
  META_ERROR_CODES.ACCOUNT_TEMPORARILY_UNAVAILABLE,
  META_ERROR_CODES.UNKNOWN_ERROR
]);

export const USER_FIXABLE_ERROR_CODES = new Set([
  META_ERROR_CODES.INVALID_ACCESS_TOKEN,
  META_ERROR_CODES.SESSION_EXPIRED,
  META_ERROR_CODES.INVALID_PARAMETER
]);

export const TERMINAL_ERROR_CODES = new Set([
  META_ERROR_CODES.PERMISSION_DENIED,
  META_ERROR_CODES.ACCOUNT_DISABLED,
  META_ERROR_CODES.AD_ACCOUNT_DISABLED,
  META_ERROR_CODES.BUSINESS_ACCOUNT_ERROR
]);

// ============================================================================
// PUBLISH STAGE PROGRESS MAPPING
// ============================================================================

/**
 * Maps publishing stages to progress percentages
 */
export const STAGE_PROGRESS_MAP = {
  IDLE: 0,
  PREPARING: 5,
  VALIDATING: 10,
  UPLOADING_IMAGES: 30,
  CREATING_CREATIVES: 50,
  CREATING_CAMPAIGN: 60,
  CREATING_ADSET: 70,
  CREATING_ADS: 80,
  VERIFYING: 90,
  COMPLETE: 100,
  FAILED: 0,
  ROLLING_BACK: 0
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Feature flags for gradual rollout
 */
export const FEATURE_FLAGS = {
  enableDynamicCreative: false, // Not yet implemented
  enableCarousel: false, // Not yet implemented
  enableVideo: false, // Not yet implemented
  enableAdvancedTargeting: false, // Not yet implemented
  enableBudgetOptimization: true,
  enableCreativeOptimization: false
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get minimum budget for a given currency
 */
export function getMinimumBudget(currency: string): number {
  return BUDGET_MINIMUMS[currency.toUpperCase()] || DEFAULT_BUDGET_MINIMUM;
}

/**
 * Get objective mapping for a goal
 */
export function getObjectiveMapping(goal: GoalType): GoalToObjectiveMapping {
  return GOAL_TO_OBJECTIVE_MAP[goal];
}

/**
 * Check if error code is recoverable
 */
export function isRecoverableError(code: number): boolean {
  return RECOVERABLE_ERROR_CODES.has(code as 80004 | 2 | 1);
}

/**
 * Check if error code is user-fixable
 */
export function isUserFixableError(code: number): boolean {
  return USER_FIXABLE_ERROR_CODES.has(code as 190 | 463 | 100);
}

/**
 * Check if error code is terminal
 */
export function isTerminalError(code: number): boolean {
  return TERMINAL_ERROR_CODES.has(code as 200 | 368 | 2635 | 3920);
}

/**
 * Get progress percentage for a stage
 */
export function getStageProgress(stage: keyof typeof STAGE_PROGRESS_MAP): number {
  return STAGE_PROGRESS_MAP[stage];
}

