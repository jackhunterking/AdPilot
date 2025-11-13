/**
 * Feature: Funding Validator
 * Purpose: Validate ad account funding and payment setup before publishing
 * References:
 *  - Ad Account: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 *  - Funding Source: https://developers.facebook.com/docs/marketing-api/reference/funding-source
 */

import type { FundingCheck, ValidationError } from '../types/publishing';
import { META_GRAPH_BASE_URL } from '../config/publishing-config';

// ============================================================================
// FUNDING VALIDATOR CLASS
// ============================================================================

export class FundingValidator {
  /**
   * Validate ad account funding status
   */
  async validate(
    token: string,
    adAccountId: string,
    hasPaymentConnected: boolean
  ): Promise<FundingCheck> {
    const errors: ValidationError[] = [];

    // Normalize ad account ID
    const normalizedId = adAccountId.replace(/^act_/, '');

    // ====================================================================
    // CHECK 1: Payment Method Connected (from stored data)
    // ====================================================================
    if (!hasPaymentConnected) {
      errors.push({
        code: 'NO_PAYMENT_METHOD',
        message: 'No payment method connected to ad account',
        severity: 'CRITICAL',
        suggestedFix: 'Add a payment method in Meta Business Manager'
      });
    }

    // ====================================================================
    // CHECK 2: Ad Account Status and Capabilities
    // ====================================================================
    let accountActive = false;
    let canCreateCampaign = false;
    let hasSpendingLimit = true;

    try {
      const accountInfo = await this.getAdAccountInfo(token, normalizedId);

      accountActive = accountInfo.accountStatus === 1; // 1 = ACTIVE

      if (!accountActive) {
        errors.push({
          code: 'ACCOUNT_NOT_ACTIVE',
          message: `Ad account status: ${this.getAccountStatusName(accountInfo.accountStatus)}`,
          severity: 'CRITICAL',
          suggestedFix: 'Check ad account status in Meta Business Manager'
        });
      }

      // Check if account can create campaigns
      canCreateCampaign = accountInfo.capabilities?.includes('CAN_CREATE_AD_CAMPAIGNS') ?? false;

      if (!canCreateCampaign && accountActive) {
        errors.push({
          code: 'CANNOT_CREATE_CAMPAIGNS',
          message: 'Ad account does not have permission to create campaigns',
          severity: 'CRITICAL',
          suggestedFix: 'Check account permissions or contact your Business Manager admin'
        });
      }

      // Check disable reason if any
      if (accountInfo.disableReason) {
        errors.push({
          code: 'ACCOUNT_DISABLED',
          message: `Ad account disabled: ${accountInfo.disableReason}`,
          severity: 'CRITICAL',
          suggestedFix: 'Resolve the account issue in Meta Business Manager'
        });
      }

      // Check spending limit
      if (accountInfo.spendCap !== null && accountInfo.spendCap !== undefined) {
        const spendCap = Number(accountInfo.spendCap);
        const amountSpent = Number(accountInfo.amountSpent || 0);

        if (amountSpent >= spendCap) {
          hasSpendingLimit = false;
          errors.push({
            code: 'SPENDING_LIMIT_REACHED',
            message: 'Account spending limit reached',
            severity: 'CRITICAL',
            suggestedFix: 'Increase spending limit or wait for limit reset'
          });
        } else if ((spendCap - amountSpent) < 1000) { // Less than $10 remaining
          errors.push({
            code: 'SPENDING_LIMIT_LOW',
            message: 'Account spending limit almost reached',
            severity: 'WARNING',
            suggestedFix: 'Consider increasing spending limit'
          });
        }
      }

    } catch (error) {
      errors.push({
        code: 'ACCOUNT_INFO_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve ad account information',
        severity: 'ERROR',
        suggestedFix: 'Check your Meta connection and try again'
      });
    }

    return {
      hasPaymentMethod: hasPaymentConnected,
      accountActive,
      hasSpendingLimit,
      availableBalance: undefined, // Would need to fetch from funding_source_details
      canCreateCampaign,
      errors
    };
  }

  /**
   * Get ad account information from Meta API
   */
  private async getAdAccountInfo(token: string, adAccountId: string): Promise<{
    accountStatus: number;
    disableReason?: string;
    spendCap?: number;
    amountSpent?: number;
    capabilities?: string[];
  }> {
    const fields = [
      'account_status',
      'disable_reason',
      'spend_cap',
      'amount_spent',
      'capabilities'
    ].join(',');

    const url = `${META_GRAPH_BASE_URL}/act_${adAccountId}?fields=${fields}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get ad account info: HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      accountStatus: data.account_status,
      disableReason: data.disable_reason,
      spendCap: data.spend_cap,
      amountSpent: data.amount_spent,
      capabilities: data.capabilities || []
    };
  }

  /**
   * Get human-readable account status name
   */
  private getAccountStatusName(status: number): string {
    const statusNames: Record<number, string> = {
      1: 'ACTIVE',
      2: 'DISABLED',
      3: 'UNSETTLED',
      7: 'PENDING_RISK_REVIEW',
      8: 'PENDING_SETTLEMENT',
      9: 'IN_GRACE_PERIOD',
      100: 'PENDING_CLOSURE',
      101: 'CLOSED',
      201: 'ANY_ACTIVE',
      202: 'ANY_CLOSED'
    };

    return statusNames[status] || `UNKNOWN (${status})`;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a funding validator instance
 */
export function createFundingValidator(): FundingValidator {
  return new FundingValidator();
}

/**
 * Quick check if funding is set up
 */
export async function hasFunding(
  token: string,
  adAccountId: string,
  hasPaymentConnected: boolean
): Promise<boolean> {
  const validator = new FundingValidator();
  const result = await validator.validate(token, adAccountId, hasPaymentConnected);
  return result.hasPaymentMethod && result.accountActive && result.canCreateCampaign;
}

