/**
 * Feature: Campaign Data Validator
 * Purpose: Validate campaign state data completeness before publishing
 * References:
 *  - Campaign Structure: https://developers.facebook.com/docs/marketing-api/campaign-structure
 */

import type { CampaignDataCheck, ValidationError } from '../types/publishing';

// ============================================================================
// TYPES
// ============================================================================

interface CampaignStateData {
  goal_data?: unknown;
  location_data?: unknown;
  budget_data?: unknown;
  ad_copy_data?: unknown;
  ad_preview_data?: unknown;
  publish_data?: unknown;
}

// ============================================================================
// CAMPAIGN DATA VALIDATOR CLASS
// ============================================================================

export class CampaignDataValidator {
  /**
   * Validate campaign state data completeness
   */
  validate(campaignStates: CampaignStateData | null | undefined): CampaignDataCheck {
    const errors: ValidationError[] = [];

    if (!campaignStates) {
      errors.push({
        code: 'NO_CAMPAIGN_STATE',
        message: 'Campaign state data not found',
        severity: 'CRITICAL',
        suggestedFix: 'Campaign setup incomplete'
      });

      return {
        hasGoal: false,
        hasLocation: false,
        hasBudget: false,
        hasAdCopy: false,
        hasImages: false,
        hasDestination: false,
        allFieldsComplete: false,
        errors
      };
    }

    // ====================================================================
    // CHECK EACH REQUIRED FIELD
    // ====================================================================
    
    // Goal data
    const hasGoal = this.validateGoalData(campaignStates.goal_data, errors);

    // Location data
    const hasLocation = this.validateLocationData(campaignStates.location_data, errors);

    // Budget data
    const hasBudget = this.validateBudgetData(campaignStates.budget_data, errors);

    // Ad copy data
    const hasAdCopy = this.validateAdCopyData(campaignStates.ad_copy_data, errors);

    // Ad preview data (images)
    const hasImages = this.validateAdPreviewData(campaignStates.ad_preview_data, errors);

    // Destination (for now, check if goal exists - destination is derived)
    const hasDestination = hasGoal;

    const allFieldsComplete = hasGoal && hasLocation && hasBudget && hasAdCopy && hasImages && hasDestination;

    return {
      hasGoal,
      hasLocation,
      hasBudget,
      hasAdCopy,
      hasImages,
      hasDestination,
      allFieldsComplete,
      errors
    };
  }

  /**
   * Validate goal_data
   */
  private validateGoalData(goalData: unknown, errors: ValidationError[]): boolean {
    if (!goalData || typeof goalData !== 'object') {
      errors.push({
        code: 'MISSING_GOAL',
        field: 'goal_data',
        message: 'Campaign goal not set',
        severity: 'CRITICAL',
        suggestedFix: 'Select a goal (Leads, Website Visits, or Calls)'
      });
      return false;
    }

    const data = goalData as { selectedGoal?: string };
    
    if (!data.selectedGoal) {
      errors.push({
        code: 'NO_SELECTED_GOAL',
        field: 'goal_data.selectedGoal',
        message: 'No goal selected',
        severity: 'CRITICAL',
        suggestedFix: 'Select a campaign goal'
      });
      return false;
    }

    const validGoals = ['leads', 'website-visits', 'calls'];
    if (!validGoals.includes(data.selectedGoal)) {
      errors.push({
        code: 'INVALID_GOAL',
        field: 'goal_data.selectedGoal',
        message: `Invalid goal: ${data.selectedGoal}`,
        severity: 'ERROR',
        suggestedFix: 'Select a valid goal'
      });
      return false;
    }

    return true;
  }

  /**
   * Validate location_data
   */
  private validateLocationData(locationData: unknown, errors: ValidationError[]): boolean {
    if (!locationData || typeof locationData !== 'object') {
      errors.push({
        code: 'MISSING_LOCATION',
        field: 'location_data',
        message: 'Location targeting not set',
        severity: 'CRITICAL',
        suggestedFix: 'Add at least one target location'
      });
      return false;
    }

    const data = locationData as { locations?: unknown[] };

    if (!Array.isArray(data.locations) || data.locations.length === 0) {
      errors.push({
        code: 'NO_LOCATIONS',
        field: 'location_data.locations',
        message: 'No locations selected',
        severity: 'CRITICAL',
        suggestedFix: 'Add at least one target location'
      });
      return false;
    }

    return true;
  }

  /**
   * Validate budget_data
   */
  private validateBudgetData(budgetData: unknown, errors: ValidationError[]): boolean {
    if (!budgetData || typeof budgetData !== 'object') {
      errors.push({
        code: 'MISSING_BUDGET',
        field: 'budget_data',
        message: 'Budget not set',
        severity: 'CRITICAL',
        suggestedFix: 'Set a daily budget'
      });
      return false;
    }

    const data = budgetData as { dailyBudget?: number; currency?: string };

    if (typeof data.dailyBudget !== 'number' || data.dailyBudget <= 0) {
      errors.push({
        code: 'INVALID_BUDGET',
        field: 'budget_data.dailyBudget',
        message: 'Daily budget not set or invalid',
        severity: 'CRITICAL',
        suggestedFix: 'Set a daily budget (minimum $5)'
      });
      return false;
    }

    if (data.dailyBudget < 5) {
      errors.push({
        code: 'BUDGET_TOO_LOW',
        field: 'budget_data.dailyBudget',
        message: `Budget $${data.dailyBudget} is below recommended minimum $5`,
        severity: 'WARNING',
        suggestedFix: 'Increase budget to at least $5 for better results'
      });
    }

    return true;
  }

  /**
   * Validate ad_copy_data
   */
  private validateAdCopyData(adCopyData: unknown, errors: ValidationError[]): boolean {
    if (!adCopyData || typeof adCopyData !== 'object') {
      errors.push({
        code: 'MISSING_AD_COPY',
        field: 'ad_copy_data',
        message: 'Ad copy not set',
        severity: 'CRITICAL',
        suggestedFix: 'Generate or enter ad copy'
      });
      return false;
    }

    const data = adCopyData as { customCopyVariations?: unknown[] };

    if (!Array.isArray(data.customCopyVariations) || data.customCopyVariations.length === 0) {
      errors.push({
        code: 'NO_COPY_VARIATIONS',
        field: 'ad_copy_data.customCopyVariations',
        message: 'No ad copy variations available',
        severity: 'CRITICAL',
        suggestedFix: 'Generate ad copy variations'
      });
      return false;
    }

    // Validate each variation has required fields
    for (let i = 0; i < data.customCopyVariations.length; i++) {
      const variation = data.customCopyVariations[i];

      if (!variation || typeof variation !== 'object') {
        continue;
      }

      const v = variation as { primaryText?: string; headline?: string };

      if (!v.primaryText || v.primaryText.trim().length === 0) {
        errors.push({
          code: 'MISSING_PRIMARY_TEXT',
          field: `ad_copy_data.customCopyVariations[${i}].primaryText`,
          message: `Variation ${i + 1} missing primary text`,
          severity: 'ERROR'
        });
      }

      if (!v.headline || v.headline.trim().length === 0) {
        errors.push({
          code: 'MISSING_HEADLINE',
          field: `ad_copy_data.customCopyVariations[${i}].headline`,
          message: `Variation ${i + 1} missing headline`,
          severity: 'ERROR'
        });
      }
    }

    return data.customCopyVariations.length > 0;
  }

  /**
   * Validate ad_preview_data (images)
   */
  private validateAdPreviewData(adPreviewData: unknown, errors: ValidationError[]): boolean {
    if (!adPreviewData || typeof adPreviewData !== 'object') {
      errors.push({
        code: 'MISSING_PREVIEW',
        field: 'ad_preview_data',
        message: 'Ad preview data not set',
        severity: 'CRITICAL',
        suggestedFix: 'Generate ad images'
      });
      return false;
    }

    const data = adPreviewData as { adContent?: { imageVariations?: string[] } };

    if (!data.adContent || !Array.isArray(data.adContent.imageVariations) || data.adContent.imageVariations.length === 0) {
      errors.push({
        code: 'NO_IMAGES',
        field: 'ad_preview_data.adContent.imageVariations',
        message: 'No ad images available',
        severity: 'CRITICAL',
        suggestedFix: 'Generate ad images'
      });
      return false;
    }

    // Validate image URLs
    for (let i = 0; i < data.adContent.imageVariations.length; i++) {
      const imageUrl = data.adContent.imageVariations[i];

      if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
        errors.push({
          code: 'INVALID_IMAGE_URL',
          field: `ad_preview_data.adContent.imageVariations[${i}]`,
          message: `Image ${i + 1} URL is invalid`,
          severity: 'ERROR'
        });
      }
    }

    return data.adContent.imageVariations.length > 0;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a campaign data validator instance
 */
export function createCampaignDataValidator(): CampaignDataValidator {
  return new CampaignDataValidator();
}

/**
 * Quick check if campaign data is complete
 */
export function isCampaignDataComplete(campaignStates: CampaignStateData): boolean {
  const validator = new CampaignDataValidator();
  const result = validator.validate(campaignStates);
  return result.allFieldsComplete;
}

/**
 * Get list of missing campaign data
 */
export function getMissingData(campaignStates: CampaignStateData): string[] {
  const validator = new CampaignDataValidator();
  const result = validator.validate(campaignStates);

  const missing: string[] = [];
  if (!result.hasGoal) missing.push('Goal');
  if (!result.hasLocation) missing.push('Location');
  if (!result.hasBudget) missing.push('Budget');
  if (!result.hasAdCopy) missing.push('Ad Copy');
  if (!result.hasImages) missing.push('Images');
  if (!result.hasDestination) missing.push('Destination');

  return missing;
}

