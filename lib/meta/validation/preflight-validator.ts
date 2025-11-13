/**
 * Feature: Preflight Validator
 * Purpose: Orchestrate all pre-publish validation checks
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 */

import type { PreflightChecks, ValidationResult, TargetingCheck, ValidationError } from '../types/publishing';
import { ConnectionValidator } from './connection-validator';
import { FundingValidator } from './funding-validator';
import { CampaignDataValidator } from './campaign-data-validator';
import { ComplianceValidator } from './compliance-validator';

// ============================================================================
// TYPES
// ============================================================================

export interface PreflightParams {
  // Meta connection
  token: string | null | undefined;
  pageId: string | null | undefined;
  adAccountId: string | null | undefined;
  instagramActorId?: string | null;
  tokenExpiresAt?: string | null;
  hasPaymentConnected: boolean;

  // Campaign data
  campaignStates: {
    goal_data?: unknown;
    location_data?: unknown;
    budget_data?: unknown;
    ad_copy_data?: unknown;
    ad_preview_data?: unknown;
  } | null;

  // Creative content (for compliance check)
  primaryText?: string;
  headline?: string;
  description?: string;
  destinationUrl?: string;
}

// ============================================================================
// PREFLIGHT VALIDATOR CLASS
// ============================================================================

export class PreflightValidator {
  private connectionValidator: ConnectionValidator;
  private fundingValidator: FundingValidator;
  private campaignDataValidator: CampaignDataValidator;
  private complianceValidator: ComplianceValidator;

  constructor() {
    this.connectionValidator = new ConnectionValidator();
    this.fundingValidator = new FundingValidator();
    this.campaignDataValidator = new CampaignDataValidator();
    this.complianceValidator = new ComplianceValidator();
  }

  /**
   * Run all preflight validation checks
   */
  async runAll(params: PreflightParams): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    // Run all validators in parallel for speed
    const [
      connectionCheck,
      fundingCheck,
      campaignDataCheck,
      complianceCheck
    ] = await Promise.all([
      this.validateConnection(params),
      this.validateFunding(params),
      this.validateCampaignData(params),
      this.validateCompliance(params)
    ]);

    // Build preflight checks object
    const preflightChecks: PreflightChecks = {
      connection: connectionCheck,
      funding: fundingCheck,
      campaignData: campaignDataCheck,
      compliance: complianceCheck,
      targeting: this.createTargetingCheck() // Placeholder
    };

    // Collect all errors
    allErrors.push(...connectionCheck.errors);
    allErrors.push(...fundingCheck.errors);
    allErrors.push(...campaignDataCheck.errors);
    allErrors.push(...complianceCheck.errors);

    // Separate errors from warnings
    const criticalErrors = allErrors.filter(e => e.severity === 'CRITICAL' || e.severity === 'ERROR');
    const warningsOnly = allErrors.filter(e => e.severity === 'WARNING');
    
    // Convert warnings to proper type
    const warnings: Array<{code: string; field?: string; message: string; severity: 'WARNING'; suggestedFix?: string}> = 
      warningsOnly.map(w => ({ ...w, severity: 'WARNING' as const }));

    // Determine if can publish
    const isValid = criticalErrors.length === 0;
    const canPublish = isValid && connectionCheck.isConnected && fundingCheck.hasPaymentMethod && campaignDataCheck.allFieldsComplete;

    return {
      isValid,
      canPublish,
      errors: criticalErrors,
      warnings,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Validate connection
   */
  private async validateConnection(params: PreflightParams): Promise<PreflightChecks['connection']> {
    if (!params.token || !params.adAccountId || !params.pageId) {
      return {
        isConnected: false,
        tokenValid: false,
        adAccountAccessible: false,
        pageAccessible: false,
        hasRequiredPermissions: false,
        errors: [{
          code: 'NO_CONNECTION',
          message: 'Meta connection incomplete',
          severity: 'CRITICAL',
          suggestedFix: 'Connect your Facebook account'
        }]
      };
    }

    return await this.connectionValidator.validate(
      params.token,
      params.pageId,
      params.adAccountId,
      params.tokenExpiresAt || null
    );
  }

  /**
   * Validate funding
   */
  private async validateFunding(params: PreflightParams): Promise<PreflightChecks['funding']> {
    if (!params.token || !params.adAccountId) {
      return {
        hasPaymentMethod: false,
        accountActive: false,
        hasSpendingLimit: false,
        canCreateCampaign: false,
        errors: [{
          code: 'NO_AD_ACCOUNT',
          message: 'Ad account not connected',
          severity: 'CRITICAL',
          suggestedFix: 'Connect your Facebook ad account'
        }]
      };
    }

    return await this.fundingValidator.validate(
      params.token,
      params.adAccountId,
      params.hasPaymentConnected
    );
  }

  /**
   * Validate campaign data
   */
  private validateCampaignData(params: PreflightParams): PreflightChecks['campaignData'] {
    return this.campaignDataValidator.validate(params.campaignStates);
  }

  /**
   * Validate compliance
   */
  private async validateCompliance(params: PreflightParams): Promise<PreflightChecks['compliance']> {
    // If no content provided, skip compliance check
    if (!params.primaryText || !params.headline) {
      return {
        textCompliant: true,
        imagesCompliant: true,
        destinationValid: true,
        noPolicyViolations: true,
        errors: []
      };
    }

    return await this.complianceValidator.validate(
      params.primaryText,
      params.headline,
      params.description,
      params.destinationUrl
    );
  }

  /**
   * Create placeholder targeting check
   */
  private createTargetingCheck(): TargetingCheck {
    // Targeting validation happens in campaign data check
    return {
      audienceSizeAdequate: true,
      targetingValid: true,
      errors: []
    };
  }

  /**
   * Get validation summary
   */
  getSummary(result: ValidationResult): {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningCount: number;
    readyToPublish: boolean;
  } {
    const totalChecks = 5; // connection, funding, campaign data, compliance, targeting
    const failedChecks = result.errors.length;
    const passedChecks = result.canPublish ? totalChecks : totalChecks - failedChecks;

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      warningCount: result.warnings.length,
      readyToPublish: result.canPublish
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a preflight validator instance
 */
export function createPreflightValidator(): PreflightValidator {
  return new PreflightValidator();
}

/**
 * Run all preflight checks
 */
export async function runPreflightChecks(params: PreflightParams): Promise<ValidationResult> {
  const validator = new PreflightValidator();
  return await validator.runAll(params);
}

/**
 * Quick check if ready to publish
 */
export async function isReadyToPublish(params: PreflightParams): Promise<boolean> {
  const validator = new PreflightValidator();
  const result = await validator.runAll(params);
  return result.canPublish;
}

