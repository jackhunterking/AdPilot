/**
 * Feature: Payload Validator
 * Purpose: Comprehensive validation of complete publish_data before submission
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 */

import type {
  PublishData,
  ValidationError,
  ValidationWarning,
  ValidationResult,
  MetaCampaignPayload,
  MetaAdSetPayload,
  MetaAdPayload
} from '../types/publishing';
import { VALIDATION_THRESHOLDS } from '../config/publishing-config';

// ============================================================================
// PAYLOAD VALIDATOR CLASS
// ============================================================================

export class PayloadValidator {
  /**
   * Validate complete publish_data structure
   */
  validate(publishData: PublishData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate campaign
    const campaignErrors = this.validateCampaign(publishData.campaign);
    errors.push(...campaignErrors);

    // Validate adset
    const adsetErrors = this.validateAdSet(publishData.adset);
    errors.push(...adsetErrors);

    // Validate ads
    const adsErrors = this.validateAds(publishData.ads);
    errors.push(...adsErrors);

    // Cross-validate relationships
    const relationshipErrors = this.validateRelationships(publishData);
    errors.push(...relationshipErrors);

    // Check metadata
    if (!publishData.metadata) {
      warnings.push({
        code: 'MISSING_METADATA',
        message: 'Metadata section is missing',
        severity: 'WARNING'
      });
    }

    return {
      isValid: errors.length === 0,
      canPublish: errors.filter(e => e.severity === 'CRITICAL' || e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Validate campaign payload
   */
  private validateCampaign(campaign: MetaCampaignPayload): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!campaign) {
      errors.push({
        code: 'MISSING_CAMPAIGN',
        message: 'Campaign payload is missing',
        severity: 'CRITICAL'
      });
      return errors;
    }

    // Required fields
    if (!campaign.name || campaign.name.trim().length === 0) {
      errors.push({
        code: 'MISSING_CAMPAIGN_NAME',
        field: 'campaign.name',
        message: 'Campaign name is required',
        severity: 'ERROR'
      });
    }

    if (campaign.name && campaign.name.length > VALIDATION_THRESHOLDS.maxCampaignNameLength) {
      errors.push({
        code: 'CAMPAIGN_NAME_TOO_LONG',
        field: 'campaign.name',
        message: `Campaign name exceeds ${VALIDATION_THRESHOLDS.maxCampaignNameLength} characters`,
        severity: 'ERROR'
      });
    }

    if (!campaign.objective) {
      errors.push({
        code: 'MISSING_OBJECTIVE',
        field: 'campaign.objective',
        message: 'Campaign objective is required',
        severity: 'CRITICAL'
      });
    }

    if (!campaign.status) {
      errors.push({
        code: 'MISSING_CAMPAIGN_STATUS',
        field: 'campaign.status',
        message: 'Campaign status is required',
        severity: 'ERROR'
      });
    }

    if (!Array.isArray(campaign.special_ad_categories)) {
      errors.push({
        code: 'MISSING_SPECIAL_AD_CATEGORIES',
        field: 'campaign.special_ad_categories',
        message: 'special_ad_categories must be an array (can be empty)',
        severity: 'ERROR'
      });
    }

    return errors;
  }

  /**
   * Validate adset payload
   */
  private validateAdSet(adset: MetaAdSetPayload): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!adset) {
      errors.push({
        code: 'MISSING_ADSET',
        message: 'AdSet payload is missing',
        severity: 'CRITICAL'
      });
      return errors;
    }

    // Required fields
    if (!adset.name || adset.name.trim().length === 0) {
      errors.push({
        code: 'MISSING_ADSET_NAME',
        field: 'adset.name',
        message: 'AdSet name is required',
        severity: 'ERROR'
      });
    }

    if (adset.name && adset.name.length > VALIDATION_THRESHOLDS.maxAdSetNameLength) {
      errors.push({
        code: 'ADSET_NAME_TOO_LONG',
        field: 'adset.name',
        message: `AdSet name exceeds ${VALIDATION_THRESHOLDS.maxAdSetNameLength} characters`,
        severity: 'ERROR'
      });
    }

    // Budget validation
    if (!adset.daily_budget && !adset.lifetime_budget) {
      errors.push({
        code: 'MISSING_BUDGET',
        field: 'adset',
        message: 'Either daily_budget or lifetime_budget is required',
        severity: 'CRITICAL'
      });
    }

    if (adset.daily_budget && adset.lifetime_budget) {
      errors.push({
        code: 'BOTH_BUDGETS_SET',
        field: 'adset',
        message: 'Cannot set both daily_budget and lifetime_budget',
        severity: 'ERROR'
      });
    }

    if (adset.daily_budget && adset.daily_budget < VALIDATION_THRESHOLDS.minBudgetForTargeting) {
      errors.push({
        code: 'BUDGET_TOO_LOW',
        field: 'adset.daily_budget',
        message: `Budget too low (minimum: ${VALIDATION_THRESHOLDS.minBudgetForTargeting} cents)`,
        severity: 'ERROR'
      });
    }

    // Optimization settings
    if (!adset.optimization_goal) {
      errors.push({
        code: 'MISSING_OPTIMIZATION_GOAL',
        field: 'adset.optimization_goal',
        message: 'Optimization goal is required',
        severity: 'CRITICAL'
      });
    }

    if (!adset.billing_event) {
      errors.push({
        code: 'MISSING_BILLING_EVENT',
        field: 'adset.billing_event',
        message: 'Billing event is required',
        severity: 'CRITICAL'
      });
    }

    if (!adset.bid_strategy) {
      errors.push({
        code: 'MISSING_BID_STRATEGY',
        field: 'adset.bid_strategy',
        message: 'Bid strategy is required',
        severity: 'ERROR'
      });
    }

    // Targeting validation
    if (!adset.targeting) {
      errors.push({
        code: 'MISSING_TARGETING',
        field: 'adset.targeting',
        message: 'Targeting specification is required',
        severity: 'CRITICAL'
      });
    } else {
      const targetingErrors = this.validateTargeting(adset.targeting);
      errors.push(...targetingErrors);
    }

    // Status validation
    if (!adset.status) {
      errors.push({
        code: 'MISSING_ADSET_STATUS',
        field: 'adset.status',
        message: 'AdSet status is required',
        severity: 'ERROR'
      });
    }

    return errors;
  }

  /**
   * Validate targeting spec
   */
  private validateTargeting(targeting: MetaAdSetPayload['targeting']): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!targeting.geo_locations) {
      errors.push({
        code: 'MISSING_GEO_LOCATIONS',
        field: 'adset.targeting.geo_locations',
        message: 'Geographic targeting is required',
        severity: 'CRITICAL'
      });
      return errors;
    }

    // Must have at least one location
    const hasLocations = !!(
      targeting.geo_locations.countries?.length ||
      targeting.geo_locations.regions?.length ||
      targeting.geo_locations.cities?.length
    );

    if (!hasLocations) {
      errors.push({
        code: 'NO_LOCATIONS_TARGETED',
        field: 'adset.targeting.geo_locations',
        message: 'At least one location must be targeted',
        severity: 'CRITICAL'
      });
    }

    // Age validation
    if (targeting.age_min && targeting.age_min < 13) {
      errors.push({
        code: 'AGE_MIN_TOO_LOW',
        field: 'adset.targeting.age_min',
        message: 'Minimum age must be at least 13',
        severity: 'ERROR'
      });
    }

    if (targeting.age_max && targeting.age_min && targeting.age_max < targeting.age_min) {
      errors.push({
        code: 'INVALID_AGE_RANGE',
        field: 'adset.targeting',
        message: 'Maximum age cannot be less than minimum age',
        severity: 'ERROR'
      });
    }

    return errors;
  }

  /**
   * Validate ads array
   */
  private validateAds(ads: MetaAdPayload[]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Array.isArray(ads)) {
      errors.push({
        code: 'INVALID_ADS_ARRAY',
        message: 'Ads must be an array',
        severity: 'CRITICAL'
      });
      return errors;
    }

    if (ads.length === 0) {
      errors.push({
        code: 'NO_ADS',
        message: 'At least one ad is required',
        severity: 'CRITICAL'
      });
      return errors;
    }

    if (ads.length > VALIDATION_THRESHOLDS.maxAdCount) {
      errors.push({
        code: 'TOO_MANY_ADS',
        message: `Too many ads (${ads.length}). Maximum: ${VALIDATION_THRESHOLDS.maxAdCount}`,
        severity: 'ERROR'
      });
    }

    // Validate each ad
    ads.forEach((ad, index) => {
      if (!ad.name || ad.name.trim().length === 0) {
        errors.push({
          code: 'MISSING_AD_NAME',
          field: `ads[${index}].name`,
          message: `Ad ${index + 1} is missing a name`,
          severity: 'ERROR'
        });
      }

      if (ad.name && ad.name.length > VALIDATION_THRESHOLDS.maxAdNameLength) {
        errors.push({
          code: 'AD_NAME_TOO_LONG',
          field: `ads[${index}].name`,
          message: `Ad ${index + 1} name exceeds ${VALIDATION_THRESHOLDS.maxAdNameLength} characters`,
          severity: 'ERROR'
        });
      }

      if (!ad.creative || !ad.creative.creative_id) {
        errors.push({
          code: 'MISSING_CREATIVE_ID',
          field: `ads[${index}].creative.creative_id`,
          message: `Ad ${index + 1} is missing creative_id`,
          severity: 'CRITICAL',
          suggestedFix: 'Create ad creative first to get creative_id'
        });
      }

      if (!ad.status) {
        errors.push({
          code: 'MISSING_AD_STATUS',
          field: `ads[${index}].status`,
          message: `Ad ${index + 1} is missing status`,
          severity: 'ERROR'
        });
      }
    });

    return errors;
  }

  /**
   * Validate relationships between objects
   */
  private validateRelationships(publishData: PublishData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate objective matches optimization goal
    const objective = publishData.campaign.objective;
    const optimizationGoal = publishData.adset.optimization_goal;

    const validCombinations: Record<string, string[]> = {
      'OUTCOME_LEADS': ['LEAD_GENERATION', 'QUALITY_LEAD'],
      'OUTCOME_TRAFFIC': ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'IMPRESSIONS', 'REACH'],
      'OUTCOME_AWARENESS': ['REACH', 'IMPRESSIONS'],
      'OUTCOME_ENGAGEMENT': ['POST_ENGAGEMENT', 'PAGE_LIKES'],
      'OUTCOME_SALES': ['OFFSITE_CONVERSIONS', 'VALUE']
    };

    if (validCombinations[objective] && !validCombinations[objective].includes(optimizationGoal)) {
      errors.push({
        code: 'INVALID_OBJECTIVE_OPTIMIZATION_COMBO',
        field: 'campaign.objective + adset.optimization_goal',
        message: `Optimization goal ${optimizationGoal} is not valid for objective ${objective}`,
        severity: 'CRITICAL',
        suggestedFix: `Use one of: ${validCombinations[objective].join(', ')}`
      });
    }

    return errors;
  }

  /**
   * Quick validation check (fast, less comprehensive)
   */
  quickValidate(publishData: PublishData): boolean {
    return !!(
      publishData.campaign &&
      publishData.campaign.name &&
      publishData.campaign.objective &&
      publishData.adset &&
      (publishData.adset.daily_budget || publishData.adset.lifetime_budget) &&
      publishData.adset.targeting &&
      Array.isArray(publishData.ads) &&
      publishData.ads.length > 0
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a payload validator instance
 */
export function createPayloadValidator(): PayloadValidator {
  return new PayloadValidator();
}

/**
 * Validate publish data
 */
export function validatePublishData(publishData: PublishData): ValidationResult {
  const validator = new PayloadValidator();
  return validator.validate(publishData);
}

/**
 * Validate and throw if invalid
 */
export function validatePublishDataOrThrow(publishData: PublishData): void {
  const result = validatePublishData(publishData);

  if (!result.canPublish) {
    const criticalErrors = result.errors.filter(e => e.severity === 'CRITICAL' || e.severity === 'ERROR');
    const errorMessages = criticalErrors.map(e => `${e.field || 'publishData'}: ${e.message}`).join('; ');
    throw new Error(`Publish data validation failed: ${errorMessages}`);
  }
}

/**
 * Quick check if publish data is valid
 */
export function isPublishDataValid(publishData: PublishData): boolean {
  const validator = new PayloadValidator();
  return validator.quickValidate(publishData);
}

/**
 * Get validation summary
 */
export function getValidationSummary(publishData: PublishData): {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  criticalErrorCount: number;
} {
  const result = validatePublishData(publishData);

  return {
    isValid: result.isValid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    criticalErrorCount: result.errors.filter(e => e.severity === 'CRITICAL').length
  };
}

