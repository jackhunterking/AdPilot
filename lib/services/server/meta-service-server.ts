/**
 * Feature: Meta Service Server Implementation
 * Purpose: Server-side Meta API integration and connection management
 * References:
 *  - Meta Service Contract: lib/services/contracts/meta-service.interface.ts
 *  - Meta API: lib/meta/service.ts
 *  - Supabase: https://supabase.com/docs
 */

import { supabaseServer } from '@/lib/supabase/server';
import { getConnectionWithToken } from '@/lib/meta/service';
import type {
  MetaService,
  MetaConnectionStatus,
  MetaAssets,
  GetConnectionStatusInput,
  GetAssetsInput,
  SelectAssetsInput,
  VerifyPaymentInput,
  VerifyAdminInput,
} from '../contracts/meta-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Meta Service Server Implementation
 * Handles Meta API connections and asset management
 */
class MetaServiceServer implements MetaService {
  getConnectionStatus = {
    async execute(input: GetConnectionStatusInput): Promise<ServiceResult<MetaConnectionStatus>> {
      try {
        const connection = await getConnectionWithToken({ campaignId: input.campaignId });
        
        if (!connection) {
          return {
            success: true,
            data: {
              connected: false,
              business: null,
              page: null,
              adAccount: null,
              paymentConnected: false,
              adminConnected: false,
              status: 'disconnected',
            },
          };
        }

        return {
          success: true,
          data: {
            connected: true,
            business: connection.selected_business_id
              ? { id: connection.selected_business_id, name: connection.selected_business_name || undefined }
              : null,
            page: connection.selected_page_id
              ? { id: connection.selected_page_id, name: connection.selected_page_name || undefined }
              : null,
            adAccount: connection.selected_ad_account_id
              ? {
                  id: connection.selected_ad_account_id,
                  name: connection.selected_ad_account_name || undefined,
                  currency: (connection as unknown as { currency_code?: string }).currency_code || undefined,
                }
              : null,
            paymentConnected: connection.ad_account_payment_connected || false,
            adminConnected: connection.admin_connected || false,
            status: (connection as unknown as { status?: string }).status || 'connected',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'fetch_failed',
            message: error instanceof Error ? error.message : 'Failed to get connection status',
          },
        };
      }
    },
  };

  getAssets = {
    async execute(_input: GetAssetsInput): Promise<ServiceResult<MetaAssets>> {
      try {
        // This method would call Meta API to fetch businesses, pages, ad accounts
        // For now, return empty arrays - implementation requires Meta API client
        // TODO: Implement full Meta API asset fetching
        
        return {
          success: true,
          data: {
            businesses: [],
            pages: [],
            adAccounts: [],
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'fetch_failed',
            message: error instanceof Error ? error.message : 'Failed to get assets',
          },
        };
      }
    },
  };

  selectAssets = {
    async execute(input: SelectAssetsInput): Promise<ServiceResult<void>> {
      try {
        const updates: Record<string, unknown> = {};
        
        if (input.businessId) updates.selected_business_id = input.businessId;
        if (input.pageId) updates.selected_page_id = input.pageId;
        if (input.adAccountId) updates.selected_ad_account_id = input.adAccountId;

        const { error } = await supabaseServer
          .from('campaign_meta_connections')
          .update(updates)
          .eq('campaign_id', input.campaignId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  verifyPayment = {
    async execute(input: VerifyPaymentInput): Promise<ServiceResult<{ connected: boolean }>> {
      try {
        // TODO: Implement actual payment verification via Meta API
        // For now, return basic check from database
        const connection = await getConnectionWithToken({ campaignId: input.campaignId });
        
        return {
          success: true,
          data: {
            connected: connection?.ad_account_payment_connected || false,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'verification_failed',
            message: error instanceof Error ? error.message : 'Failed to verify payment',
          },
        };
      }
    },
  };

  verifyAdmin = {
    async execute(input: VerifyAdminInput): Promise<ServiceResult<{ hasAccess: boolean }>> {
      try {
        // TODO: Implement actual admin verification via Meta API
        // For now, return basic check from database
        const connection = await getConnectionWithToken({ campaignId: input.campaignId });
        
        return {
          success: true,
          data: {
            hasAccess: connection?.admin_connected || false,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'verification_failed',
            message: error instanceof Error ? error.message : 'Failed to verify admin access',
          },
        };
      }
    },
  };

  initiateOAuth = {
    async execute(input: { redirectUri: string }): Promise<ServiceResult<{ authUrl: string }>> {
      try {
        // TODO: Implement OAuth initiation
        // This would generate FB.login URL with proper scopes
        
        const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_FB_APP_ID}&redirect_uri=${encodeURIComponent(input.redirectUri)}&scope=ads_management,pages_show_list,business_management`;
        
        return {
          success: true,
          data: { authUrl },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'oauth_failed',
            message: error instanceof Error ? error.message : 'Failed to initiate OAuth',
          },
        };
      }
    },
  };

  handleOAuthCallback = {
    async execute(_input: { code: string; state: string }): Promise<ServiceResult<{ userId: string; token: string }>> {
      try {
        // TODO: Implement OAuth callback handling
        // This would exchange code for access token via Meta API
        
        throw new Error('Not implemented - OAuth callback handling');
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'oauth_failed',
            message: error instanceof Error ? error.message : 'Failed to handle OAuth callback',
          },
        };
      }
    },
  };

  refreshToken = {
    async execute(oldToken: string): Promise<ServiceResult<{ token: string; expiresIn: number }>> {
      try {
        const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.FB_APP_SECRET;
        const graphVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0';

        if (!appId || !appSecret) {
          return {
            success: false,
            error: { code: 'config_error', message: 'Meta app credentials not configured' }
          };
        }

        // Exchange short-lived token for long-lived token (60 days)
        const tokenUrl = `https://graph.facebook.com/${graphVersion}/oauth/access_token`;
        const params = new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: oldToken,
        });

        const response = await fetch(`${tokenUrl}?${params.toString()}`);
        
        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: {
              code: 'meta_api_error',
              message: error.error?.message || 'Token refresh failed',
            }
          };
        }

        const result = await response.json();
        
        return {
          success: true,
          data: {
            token: result.access_token,
            expiresIn: result.expires_in || 5184000, // 60 days default
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'refresh_failed',
            message: error instanceof Error ? error.message : 'Failed to refresh token',
          },
        };
      }
    },
  };

  disconnect = {
    async execute(campaignId: string): Promise<ServiceResult<void>> {
      try {
        const { error } = await supabaseServer
          .from('campaign_meta_connections')
          .delete()
          .eq('campaign_id', campaignId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'deletion_failed',
              message: error.message,
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };
}

// Export singleton instance
export const metaServiceServer = new MetaServiceServer();

