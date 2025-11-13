/**
 * Feature: Compliance Validator
 * Purpose: Validate creative content against Meta advertising policies
 * References:
 *  - Meta Ad Policies: https://www.facebook.com/policies/ads
 *  - Advertising Standards: https://www.facebook.com/policies/ads/prohibited_content
 */

import type { ComplianceCheck, ValidationError } from '../types/publishing';
import { TextSanitizer } from '../creative-generation/text-sanitizer';

// ============================================================================
// COMPLIANCE VALIDATOR CLASS
// ============================================================================

export class ComplianceValidator {
  private textSanitizer: TextSanitizer;

  constructor() {
    this.textSanitizer = new TextSanitizer();
  }

  /**
   * Validate content compliance with Meta policies
   */
  async validate(
    primaryText: string,
    headline: string,
    description: string | undefined,
    destinationUrl: string | undefined
  ): Promise<ComplianceCheck> {
    const errors: ValidationError[] = [];

    // ====================================================================
    // CHECK 1: Text Content Compliance
    // ====================================================================
    const textCompliant = this.validateTextContent(primaryText, headline, description, errors);

    // ====================================================================
    // CHECK 2: Destination URL Validity
    // ====================================================================
    const destinationValid = await this.validateDestination(destinationUrl, errors);

    // ====================================================================
    // CHECK 3: Image Compliance (placeholder - would need image analysis)
    // ====================================================================
    const imagesCompliant = true; // Assume compliant for now

    // ====================================================================
    // CHECK 4: Overall Policy Compliance
    // ====================================================================
    const noPolicyViolations = errors.filter(e => e.severity === 'CRITICAL' || e.severity === 'ERROR').length === 0;

    return {
      textCompliant,
      imagesCompliant,
      destinationValid,
      noPolicyViolations,
      errors
    };
  }

  /**
   * Validate text content
   */
  private validateTextContent(
    primaryText: string,
    headline: string,
    description: string | undefined,
    errors: ValidationError[]
  ): boolean {
    let compliant = true;

    // Check primary text
    const primaryPolicy = this.textSanitizer.checkPolicyCompliance(primaryText);
    if (!primaryPolicy.compliant) {
      compliant = false;
      primaryPolicy.violations.forEach(violation => {
        errors.push({
          code: violation.type,
          field: 'primaryText',
          message: violation.message,
          severity: violation.severity === 'ERROR' ? 'ERROR' : 'WARNING',
          suggestedFix: violation.suggestion
        });
      });
    }

    // Add warnings
    primaryPolicy.warnings.forEach(warning => {
      errors.push({
        code: 'POLICY_WARNING',
        field: 'primaryText',
        message: warning,
        severity: 'WARNING'
      });
    });

    // Check headline
    const headlinePolicy = this.textSanitizer.checkPolicyCompliance(headline);
    headlinePolicy.warnings.forEach(warning => {
      errors.push({
        code: 'POLICY_WARNING',
        field: 'headline',
        message: warning,
        severity: 'WARNING'
      });
    });

    // Check description if present
    if (description) {
      const descPolicy = this.textSanitizer.checkPolicyCompliance(description);
      descPolicy.warnings.forEach(warning => {
        errors.push({
          code: 'POLICY_WARNING',
          field: 'description',
          message: warning,
          severity: 'WARNING'
        });
      });
    }

    return compliant;
  }

  /**
   * Validate destination URL
   */
  private async validateDestination(
    destinationUrl: string | undefined,
    errors: ValidationError[]
  ): Promise<boolean> {
    if (!destinationUrl) {
      // No destination URL is OK for some goal types (e.g., lead forms)
      return true;
    }

    // Validate URL format
    try {
      const url = new URL(destinationUrl);

      // Must be http or https
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push({
          code: 'INVALID_URL_PROTOCOL',
          field: 'destinationUrl',
          message: 'Destination URL must use HTTP or HTTPS',
          severity: 'ERROR',
          suggestedFix: 'Use a valid https:// URL'
        });
        return false;
      }

      // Warn if using http instead of https
      if (url.protocol === 'http:') {
        errors.push({
          code: 'INSECURE_URL',
          field: 'destinationUrl',
          message: 'Destination URL uses insecure HTTP protocol',
          severity: 'WARNING',
          suggestedFix: 'Use HTTPS for better security and trust'
        });
      }

    } catch {
      errors.push({
        code: 'MALFORMED_URL',
        field: 'destinationUrl',
        message: 'Destination URL is malformed',
        severity: 'ERROR',
        suggestedFix: 'Enter a valid URL'
      });
      return false;
    }

    // Optional: Test if URL is accessible (can be slow, so optional)
    // const accessible = await this.testUrlAccessible(destinationUrl);
    // if (!accessible) {
    //   errors.push({
    //     code: 'URL_NOT_ACCESSIBLE',
    //     field: 'destinationUrl',
    //     message: 'Destination URL is not accessible',
    //     severity: 'WARNING',
    //     suggestedFix: 'Verify the URL is correct and the site is online'
    //   });
    // }

    return true;
  }

  /**
   * Test if URL is accessible (optional expensive check)
   */
  private async testUrlAccessible(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a compliance validator instance
 */
export function createComplianceValidator(): ComplianceValidator {
  return new ComplianceValidator();
}

/**
 * Quick check if content is compliant
 */
export async function isContentCompliant(
  primaryText: string,
  headline: string,
  description?: string,
  destinationUrl?: string
): Promise<boolean> {
  const validator = new ComplianceValidator();
  const result = await validator.validate(primaryText, headline, description, destinationUrl);
  return result.noPolicyViolations;
}

