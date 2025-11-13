/**
 * Feature: Creative Validator
 * Purpose: Validate creative payloads before submission to Meta API v24.0
 * References:
 *  - AdCreative Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-creative
 *  - Creative Requirements: https://developers.facebook.com/docs/marketing-api/creative-specifications
 */

import type {
  MetaCreativePayload,
  ValidationError,
  ValidationWarning
} from '../types/publishing';
import { TEXT_LIMITS, VALIDATION_THRESHOLDS } from '../config/publishing-config';

// ============================================================================
// TYPES
// ============================================================================

export interface CreativeValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  creative: MetaCreativePayload;
}

// ============================================================================
// CREATIVE VALIDATOR CLASS
// ============================================================================

export class CreativeValidator {
  /**
   * Validate a creative payload
   */
  validate(creative: MetaCreativePayload): CreativeValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // ========================================================================
    // VALIDATE REQUIRED FIELDS
    // ========================================================================
    if (!creative.name || creative.name.trim().length === 0) {
      errors.push({
        code: 'MISSING_NAME',
        field: 'name',
        message: 'Creative name is required',
        severity: 'ERROR'
      });
    }

    if (creative.name && creative.name.length > VALIDATION_THRESHOLDS.maxCreativeNameLength) {
      errors.push({
        code: 'NAME_TOO_LONG',
        field: 'name',
        message: `Creative name exceeds ${VALIDATION_THRESHOLDS.maxCreativeNameLength} characters`,
        severity: 'ERROR'
      });
    }

    if (!creative.object_story_spec) {
      errors.push({
        code: 'MISSING_OBJECT_STORY_SPEC',
        message: 'object_story_spec is required',
        severity: 'CRITICAL'
      });
      // Cannot continue validation without object_story_spec
      return { isValid: false, errors, warnings, creative };
    }

    // ========================================================================
    // VALIDATE OBJECT STORY SPEC
    // ========================================================================
    const spec = creative.object_story_spec;

    if (!spec.page_id || spec.page_id.trim().length === 0) {
      errors.push({
        code: 'MISSING_PAGE_ID',
        field: 'object_story_spec.page_id',
        message: 'Facebook Page ID is required',
        severity: 'CRITICAL'
      });
    }

    // Validate page_id format (should be numeric)
    if (spec.page_id && !/^\d+$/.test(spec.page_id)) {
      warnings.push({
        code: 'INVALID_PAGE_ID_FORMAT',
        field: 'object_story_spec.page_id',
        message: 'Page ID should be numeric',
        severity: 'WARNING',
        suggestedFix: 'Verify page ID is correct'
      });
    }

    // ========================================================================
    // VALIDATE LINK DATA
    // ========================================================================
    if (spec.link_data) {
      const linkData = spec.link_data;

      // Validate link
      if (!linkData.link || linkData.link.trim().length === 0) {
        errors.push({
          code: 'MISSING_LINK',
          field: 'object_story_spec.link_data.link',
          message: 'Destination link is required',
          severity: 'ERROR'
        });
      }

      // Validate link format
      if (linkData.link && !this.isValidUrl(linkData.link) && !linkData.link.startsWith('tel:')) {
        errors.push({
          code: 'INVALID_LINK_FORMAT',
          field: 'object_story_spec.link_data.link',
          message: 'Link must be a valid URL or tel: URI',
          severity: 'ERROR',
          suggestedFix: 'Ensure URL starts with http:// or https://'
        });
      }

      // Validate primary text (message)
      if (!linkData.message || linkData.message.trim().length === 0) {
        errors.push({
          code: 'MISSING_MESSAGE',
          field: 'object_story_spec.link_data.message',
          message: 'Primary text is required',
          severity: 'ERROR'
        });
      }

      if (linkData.message && linkData.message.length > TEXT_LIMITS.primaryText.max) {
        errors.push({
          code: 'MESSAGE_TOO_LONG',
          field: 'object_story_spec.link_data.message',
          message: `Primary text exceeds ${TEXT_LIMITS.primaryText.max} characters`,
          severity: 'ERROR'
        });
      }

      if (linkData.message && linkData.message.length < 10) {
        warnings.push({
          code: 'MESSAGE_TOO_SHORT',
          field: 'object_story_spec.link_data.message',
          message: 'Primary text is very short, consider adding more context',
          severity: 'WARNING'
        });
      }

      // Validate headline (name)
      if (!linkData.name || linkData.name.trim().length === 0) {
        errors.push({
          code: 'MISSING_HEADLINE',
          field: 'object_story_spec.link_data.name',
          message: 'Headline is required',
          severity: 'ERROR'
        });
      }

      if (linkData.name && linkData.name.length > TEXT_LIMITS.headline.max) {
        errors.push({
          code: 'HEADLINE_TOO_LONG',
          field: 'object_story_spec.link_data.name',
          message: `Headline exceeds ${TEXT_LIMITS.headline.max} characters`,
          severity: 'ERROR'
        });
      }

      // Warn if headline is too long for desktop feed
      if (linkData.name && linkData.name.length > TEXT_LIMITS.headline.desktop) {
        warnings.push({
          code: 'HEADLINE_LONG_FOR_DESKTOP',
          field: 'object_story_spec.link_data.name',
          message: `Headline may be truncated on desktop feed (limit: ${TEXT_LIMITS.headline.desktop} chars)`,
          severity: 'WARNING'
        });
      }

      // Validate description
      if (linkData.description && linkData.description.length > TEXT_LIMITS.description.max) {
        errors.push({
          code: 'DESCRIPTION_TOO_LONG',
          field: 'object_story_spec.link_data.description',
          message: `Description exceeds ${TEXT_LIMITS.description.max} characters`,
          severity: 'ERROR'
        });
      }

      // Validate call to action
      if (!linkData.call_to_action) {
        errors.push({
          code: 'MISSING_CTA',
          field: 'object_story_spec.link_data.call_to_action',
          message: 'Call to action is required',
          severity: 'ERROR'
        });
      }

      if (linkData.call_to_action && !linkData.call_to_action.type) {
        errors.push({
          code: 'MISSING_CTA_TYPE',
          field: 'object_story_spec.link_data.call_to_action.type',
          message: 'Call to action type is required',
          severity: 'ERROR'
        });
      }

      // Validate image
      if (!linkData.image_hash && !linkData.picture) {
        errors.push({
          code: 'MISSING_IMAGE',
          field: 'object_story_spec.link_data',
          message: 'Either image_hash or picture URL is required',
          severity: 'ERROR',
          suggestedFix: 'Upload image to Meta first to get image_hash'
        });
      }

      // Prefer image_hash over picture
      if (linkData.picture && !linkData.image_hash) {
        warnings.push({
          code: 'USING_PICTURE_URL',
          field: 'object_story_spec.link_data.picture',
          message: 'Using picture URL instead of image_hash (image_hash is recommended)',
          severity: 'WARNING',
          suggestedFix: 'Upload image to Meta AdImage API to get image_hash'
        });
      }
    }

    // ========================================================================
    // VALIDATE INSTAGRAM ACTOR ID (if present)
    // ========================================================================
    if (spec.instagram_actor_id) {
      if (!/^\d+$/.test(spec.instagram_actor_id)) {
        warnings.push({
          code: 'INVALID_INSTAGRAM_ID_FORMAT',
          field: 'object_story_spec.instagram_actor_id',
          message: 'Instagram actor ID should be numeric',
          severity: 'WARNING'
        });
      }
    }

    // ========================================================================
    // RETURN RESULTS
    // ========================================================================
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      creative
    };
  }

  /**
   * Validate multiple creatives
   */
  validateBatch(creatives: MetaCreativePayload[]): {
    allValid: boolean;
    results: CreativeValidationResult[];
    totalErrors: number;
    totalWarnings: number;
  } {
    const results = creatives.map(creative => this.validate(creative));

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const allValid = results.every(r => r.isValid);

    return {
      allValid,
      results,
      totalErrors,
      totalWarnings
    };
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Verify destination URL is accessible (optional, expensive check)
   */
  async verifyDestinationAccessible(url: string, timeout: number = 5000): Promise<{
    accessible: boolean;
    statusCode?: number;
    error?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD', // Just check headers, don't download body
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      return {
        accessible: response.ok,
        statusCode: response.status
      };
    } catch (error) {
      return {
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get required fields for a creative
   */
  getRequiredFields(): string[] {
    return [
      'name',
      'object_story_spec',
      'object_story_spec.page_id',
      'object_story_spec.link_data',
      'object_story_spec.link_data.link',
      'object_story_spec.link_data.message',
      'object_story_spec.link_data.name',
      'object_story_spec.link_data.call_to_action',
      'object_story_spec.link_data.image_hash or picture'
    ];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a creative validator instance
 */
export function createCreativeValidator(): CreativeValidator {
  return new CreativeValidator();
}

/**
 * Quick validate single creative
 */
export function validateCreative(creative: MetaCreativePayload): CreativeValidationResult {
  const validator = new CreativeValidator();
  return validator.validate(creative);
}

/**
 * Validate creatives and throw if invalid
 */
export function validateCreativeOrThrow(creative: MetaCreativePayload): void {
  const result = validateCreative(creative);

  if (!result.isValid) {
    const errorMessages = result.errors.map(e => `${e.field || 'creative'}: ${e.message}`).join('; ');
    throw new Error(`Creative validation failed: ${errorMessages}`);
  }
}

/**
 * Check if all creatives are valid
 */
export function areAllCreativesValid(creatives: MetaCreativePayload[]): boolean {
  const validator = new CreativeValidator();
  const result = validator.validateBatch(creatives);
  return result.allValid;
}

/**
 * Get all errors from creative batch
 */
export function getAllCreativeErrors(creatives: MetaCreativePayload[]): ValidationError[] {
  const validator = new CreativeValidator();
  const result = validator.validateBatch(creatives);

  const allErrors: ValidationError[] = [];
  result.results.forEach((r, index) => {
    r.errors.forEach(error => {
      allErrors.push({
        ...error,
        field: `creative[${index}].${error.field || ''}`
      });
    });
  });

  return allErrors;
}

/**
 * Get validation summary
 */
export function getValidationSummary(creatives: MetaCreativePayload[]): {
  totalCreatives: number;
  validCreatives: number;
  invalidCreatives: number;
  totalErrors: number;
  totalWarnings: number;
  isValid: boolean;
} {
  const validator = new CreativeValidator();
  const result = validator.validateBatch(creatives);

  return {
    totalCreatives: creatives.length,
    validCreatives: result.results.filter(r => r.isValid).length,
    invalidCreatives: result.results.filter(r => !r.isValid).length,
    totalErrors: result.totalErrors,
    totalWarnings: result.totalWarnings,
    isValid: result.allValid
  };
}

