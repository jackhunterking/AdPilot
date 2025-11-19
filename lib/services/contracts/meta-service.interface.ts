/**
 * Feature: Meta Service Contract
 * Purpose: Interface for Meta API integration and connection management
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 *  - Meta Marketing API v24.0
 */

import type { ServiceContract, ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Meta Types
// ============================================================================

export interface MetaConnectionStatus {
  connected: boolean;
  business?: { id: string; name?: string } | null;
  page?: { id: string; name?: string } | null;
  adAccount?: {
    id: string;
    name?: string;
    currency?: string;
  } | null;
  paymentConnected: boolean;
  adminConnected: boolean;
  status: string;
}

export interface MetaBusiness {
  id: string;
  name: string;
  verification_status?: string;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token?: string;
  tasks?: string[];
}

export interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  funding_source_details?: {
    type: number;
    display_string: string;
  };
}

export interface MetaAssets {
  businesses: MetaBusiness[];
  pages: MetaPage[];
  adAccounts: MetaAdAccount[];
}

export interface GetConnectionStatusInput {
  campaignId: string;
}

export interface GetAssetsInput {
  campaignId: string;
  type?: 'all' | 'businesses' | 'pages' | 'adAccounts';
}

export interface SelectAssetsInput {
  campaignId: string;
  businessId?: string;
  pageId?: string;
  adAccountId?: string;
}

export interface VerifyPaymentInput {
  campaignId: string;
  adAccountId: string;
}

export interface VerifyAdminInput {
  campaignId: string;
  pageId: string;
}

// ============================================================================
// Meta Service Interface
// ============================================================================

export interface MetaService {
  /**
   * Get Meta connection status
   */
  getConnectionStatus: ServiceContract<
    GetConnectionStatusInput,
    ServiceResult<MetaConnectionStatus>
  >;

  /**
   * Get Meta assets (businesses, pages, ad accounts)
   */
  getAssets: ServiceContract<GetAssetsInput, ServiceResult<MetaAssets>>;

  /**
   * Select Meta assets for campaign
   */
  selectAssets: ServiceContract<SelectAssetsInput, ServiceResult<void>>;

  /**
   * Verify payment method is connected
   */
  verifyPayment: ServiceContract<
    VerifyPaymentInput,
    ServiceResult<{ connected: boolean }>
  >;

  /**
   * Verify admin access to page
   */
  verifyAdmin: ServiceContract<
    VerifyAdminInput,
    ServiceResult<{ hasAccess: boolean }>
  >;

  /**
   * Initiate OAuth connection
   */
  initiateOAuth: ServiceContract<
    { redirectUri: string },
    ServiceResult<{ authUrl: string }>
  >;

  /**
   * Handle OAuth callback
   */
  handleOAuthCallback: ServiceContract<
    { code: string; state: string },
    ServiceResult<{ userId: string; token: string }>
  >;

  /**
   * Refresh long-lived token
   */
  refreshToken: ServiceContract<
    string,
    ServiceResult<{ token: string; expiresIn: number }>
  >;

  /**
   * Disconnect Meta account
   */
  disconnect: ServiceContract<string, ServiceResult<void>>;
}

