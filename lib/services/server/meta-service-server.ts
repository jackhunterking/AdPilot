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
import { fetchUserBusinesses } from '@/lib/meta/business';
import { fetchBusinessOwnedPages } from '@/lib/meta/pages';
import { fetchBusinessOwnedAdAccounts } from '@/lib/meta/ad-accounts';
import { getPaymentCapability } from '@/lib/meta/payments';
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
    async execute(input: GetAssetsInput): Promise<ServiceResult<MetaAssets>> {
      try {
        // Get user token from campaign connection
        const connection = await getConnectionWithToken({ campaignId: input.campaignId });
        if (!connection || !connection.long_lived_user_token) {
          return {
            success: false,
            error: {
              code: 'no_connection',
              message: 'No Meta connection found or token missing',
            },
          };
        }

        const token = connection.long_lived_user_token;

        // Fetch businesses user administers
        const businesses = await fetchUserBusinesses({ token });

        // If businessId provided, fetch pages and ad accounts for that business
        let pages: Array<{ id: string; name?: string }> = [];
        let adAccounts: Array<{ id: string; name?: string; currency?: string }> = [];

        if (input.businessId) {
          const [pagesData, adAccountsData] = await Promise.all([
            fetchBusinessOwnedPages({ token, businessId: input.businessId }),
            fetchBusinessOwnedAdAccounts({ token, businessId: input.businessId }),
          ]);

          pages = pagesData.map((p) => ({ id: p.id, name: p.name }));
          adAccounts = adAccountsData.map((a) => ({ id: a.id, name: a.name, currency: a.currency }));
        }
        
        return {
          success: true,
          data: {
            businesses: businesses.map((b) => ({ id: b.id, name: b.name })),
            pages,
            adAccounts,
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
        // Get payment capability from Meta API
        const capability = await getPaymentCapability(input.campaignId);
        
        // User can manage payment if they have finance permission and MANAGE task
        const canManagePayment = capability.hasFinance && capability.hasManage;
        
        // Check if funding is already present
        const connected = capability.hasFunding && canManagePayment;
        
        // Update database with payment status
        if (capability.adAccountId) {
          await supabaseServer
            .from('campaign_meta_connections')
            .update({ ad_account_payment_connected: connected })
            .eq('campaign_id', input.campaignId);
        }
        
        return {
          success: true,
          data: { connected },
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
        // Get payment capability (includes admin role check)
        const capability = await getPaymentCapability(input.campaignId);
        
        // User has admin access if they have finance permission (ADMIN role or FINANCE_EDITOR)
        const hasAccess = capability.hasFinance;
        
        // Update database with admin status
        if (capability.businessId) {
          await supabaseServer
            .from('campaign_meta_connections')
            .update({ admin_connected: hasAccess })
            .eq('campaign_id', input.campaignId);
        }
        
        return {
          success: true,
          data: { hasAccess },
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
        const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
        const graphVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0';

        if (!appId) {
          return {
            success: false,
            error: {
              code: 'config_error',
              message: 'Facebook App ID not configured',
            },
          };
        }

        // Scopes required for Meta Ads management
        const scopes = [
          'ads_management',
          'ads_read',
          'business_management',
          'pages_show_list',
          'pages_manage_ads',
          'pages_read_engagement',
          'leads_retrieval',
        ].join(',');

        const authUrl = `https://www.facebook.com/${graphVersion}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(input.redirectUri)}&scope=${scopes}&response_type=code`;
        
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
    async execute(input: { code: string; state: string }): Promise<ServiceResult<{ userId: string; token: string }>> {
      try {
        const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.FB_APP_SECRET;
        const graphVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0';

        if (!appId || !appSecret) {
          return {
            success: false,
            error: {
              code: 'config_error',
              message: 'Meta app credentials not configured',
            },
          };
        }

        // Exchange authorization code for access token
        const tokenUrl = `https://graph.facebook.com/${graphVersion}/oauth/access_token`;
        const params = new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          code: input.code,
          redirect_uri: input.state, // state contains redirect_uri
        });

        const response = await fetch(`${tokenUrl}?${params.toString()}`);
        
        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: {
              code: 'oauth_exchange_failed',
              message: error.error?.message || 'Failed to exchange code for token',
            },
          };
        }

        const result = await response.json();
        const shortToken = result.access_token;

        // Exchange short-lived token for long-lived token (60 days)
        const longTokenResult = await this.refreshToken.execute(shortToken);
        
        if (!longTokenResult.success || !longTokenResult.data) {
          return {
            success: false,
            error: {
              code: 'token_exchange_failed',
              message: 'Failed to get long-lived token',
            },
          };
        }

        // Get user ID from token
        const meResponse = await fetch(`https://graph.facebook.com/${graphVersion}/me`, {
          headers: { Authorization: `Bearer ${longTokenResult.data.token}` },
        });

        if (!meResponse.ok) {
          return {
            success: false,
            error: {
              code: 'user_fetch_failed',
              message: 'Failed to fetch user info',
            },
          };
        }

        const meData = await meResponse.json();
        
        return {
          success: true,
          data: {
            userId: meData.id,
            token: longTokenResult.data.token,
          },
        };
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

