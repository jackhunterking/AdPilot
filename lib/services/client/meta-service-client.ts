/**
 * Feature: Meta Service Client (Full Implementation)
 * Purpose: Client-side Meta integration operations
 * Microservices: Client service layer calling API routes
 * References:
 *  - API v1: app/api/v1/meta/*
 *  - Contract: lib/services/contracts/meta-service.interface.ts
 */

"use client";

import type { 
  MetaService,
  GetConnectionStatusInput,
  MetaConnectionStatus,
  GetAssetsInput,
  MetaAssets,
  SelectAssetsInput,
  VerifyPaymentInput,
  VerifyAdminInput,
} from '../contracts/meta-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Meta Service Client (Full Implementation)
 * 
 * Client-side implementation that calls API v1 Meta endpoints.
 * 
 * Architecture:
 * - Uses fetch to call /api/v1/meta/* endpoints
 * - Handles OAuth flows via Facebook SDK (window.FB)
 * - Returns standardized ServiceResult<T>
 * - Type-safe request/response handling
 */
class MetaServiceClient implements MetaService {
  getConnectionStatus = {
    async execute(input: GetConnectionStatusInput): Promise<ServiceResult<MetaConnectionStatus>> {
      try {
        const response = await fetch(`/api/v1/meta/status?campaignId=${input.campaignId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: MetaConnectionStatus };
        return {
          success: true,
          data: successResult.data,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to get connection status',
          },
        };
      }
    }
  };

  getAssets = {
    async execute(input: GetAssetsInput): Promise<ServiceResult<MetaAssets>> {
      try {
        const typeParam = input.type ? `&type=${input.type}` : '';
        const response = await fetch(`/api/v1/meta/assets?campaignId=${input.campaignId}${typeParam}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: MetaAssets };
        return {
          success: true,
          data: successResult.data,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to get assets',
          },
        };
      }
    }
  };

  selectAssets = {
    async execute(input: SelectAssetsInput): Promise<ServiceResult<void>> {
      try {
        // Store selected assets in campaign metadata
        const response = await fetch(`/api/v1/campaigns/${input.campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            metadata: {
              selectedBusinessId: input.businessId,
              selectedPageId: input.pageId,
              selectedAdAccountId: input.adAccountId,
            },
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to select assets',
          },
        };
      }
    }
  };

  verifyPayment = {
    async execute(input: VerifyPaymentInput): Promise<ServiceResult<{ connected: boolean }>> {
      try {
        const response = await fetch('/api/v1/meta/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            campaignId: input.campaignId,
            adAccountId: input.adAccountId,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { connected: boolean } };
        return {
          success: true,
          data: { connected: successResult.data.connected },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to verify payment',
          },
        };
      }
    }
  };

  verifyAdmin = {
    async execute(input: VerifyAdminInput): Promise<ServiceResult<{ hasAccess: boolean }>> {
      try {
        const response = await fetch('/api/v1/meta/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            campaignId: input.campaignId,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { hasAccess: boolean } };
        return {
          success: true,
          data: { hasAccess: successResult.data.hasAccess },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to verify admin',
          },
        };
      }
    }
  };

  initiateOAuth = {
    async execute(input: { redirectUri: string }): Promise<ServiceResult<{ authUrl: string }>> {
      try {
        // Generate Facebook OAuth URL
        const fbAppId = process.env.NEXT_PUBLIC_FB_APP_ID;
        const scope = 'public_profile,email,pages_show_list,ads_management,business_management';
        const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(input.redirectUri)}&scope=${scope}&response_type=code`;
        
        return {
          success: true,
          data: { authUrl },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'oauth_error',
            message: error instanceof Error ? error.message : 'Failed to initiate OAuth',
          },
        };
      }
    }
  };

  handleOAuthCallback = {
    async execute(input: { code: string; state: string }): Promise<ServiceResult<{ userId: string; token: string }>> {
      try {
        // The OAuth callback is typically handled by the API route
        // This method processes the result after redirect
        const response = await fetch('/api/v1/meta/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(input),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { userId: string; token: string } };
        return {
          success: true,
          data: { userId: successResult.data.userId, token: successResult.data.token },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'callback_error',
            message: error instanceof Error ? error.message : 'Failed to handle OAuth callback',
          },
        };
      }
    }
  };

  refreshToken = {
    async execute(oldToken: string): Promise<ServiceResult<{ token: string; expiresIn: number }>> {
      try {
        const response = await fetch('/api/v1/meta/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ oldToken }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { token: string; expiresIn: number } };
        return {
          success: true,
          data: successResult.data,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to refresh token',
          },
        };
      }
    }
  };

  disconnect = {
    async execute(campaignId: string): Promise<ServiceResult<void>> {
      try {
        const response = await fetch('/api/v1/meta/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ campaignId }),
        });

        const result: unknown = await response.json();

        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }

        return {
          success: true,
          data: undefined,
        };
        
        // const response = await fetch('/api/v1/meta/oauth/disconnect', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   credentials: 'include',
        //   body: JSON.stringify({ campaignId }),
        // });
        // 
        // const result: unknown = await response.json();
        // 
        // if (!response.ok) {
        //   const errorResult = result as { success: false; error: { code: string; message: string } };
        //   return {
        //     success: false,
        //     error: errorResult.error,
        //   };
        // }
        // 
        // return {
        //   success: true,
        //   data: undefined,
        // };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'disconnect_error',
            message: error instanceof Error ? error.message : 'Failed to disconnect',
          },
        };
      }
    }
  };
}

export const metaServiceClient = new MetaServiceClient();
