/**
 * Meta Connection Storage (DEPRECATED)
 * 
 * ⚠️ DEPRECATION NOTICE ⚠️
 * This localStorage-based storage is DEPRECATED and will be removed in a future version.
 * 
 * NEW CODE SHOULD USE:
 * - lib/services/meta-connection-manager.ts for database-backed Meta connections
 * - lib/utils/migration-helper.ts to migrate existing localStorage data
 * 
 * Why deprecated:
 * - localStorage persists across campaigns/ads causing data mixing
 * - Database provides campaign-level data hierarchy (shared across ads)
 * - Better sync, reliability, and cross-device support with database
 * 
 * Migration path:
 * 1. Use migrateLegacyMetaConnection() from migration-helper.ts on campaign load
 * 2. Replace metaStorage calls with meta-connection-manager functions
 * 3. Test thoroughly before removing this file
 */

import type {
  MetaBusiness,
  MetaPage,
  MetaAdAccount,
  MetaAssets,
  CampaignMetaConnectionPayload,
  SelectionSummaryDTO
} from './types';
import { metaLogger } from './logger';
import { emitMetaConnectionUpdated } from '@/lib/utils/meta-events';

// Log deprecation warning once per session
let deprecationWarningShown = false;
function showDeprecationWarning(functionName: string): void {
  if (!deprecationWarningShown) {
    console.warn(
      `%c⚠️ DEPRECATED: metaStorage.${functionName}()`,
      'color: orange; font-weight: bold; font-size: 14px;',
      '\n\nThis localStorage-based Meta storage is deprecated.',
      '\n\n✅ Use instead: lib/services/meta-connection-manager.ts',
      '\n📖 Migration guide: lib/utils/migration-helper.ts',
      '\n\nReasons:',
      '\n- Database provides better data hierarchy (campaign vs ad level)',
      '\n- Eliminates localStorage persistence issues',
      '\n- Better sync and cross-device support'
    );
    deprecationWarningShown = true;
  }
}

const STORAGE_PREFIX = 'meta_connection_';
const LOGS_KEY = 'meta_api_logs';

interface StoredConnection {
  campaign_id: string;
  user_id: string;
  fb_user_id: string;
  long_lived_user_token: string;
  token_expires_at: string;

  // Business
  selected_business_id?: string;
  selected_business_name?: string;

  // Page
  selected_page_id?: string;
  selected_page_name?: string;
  selected_page_access_token?: string;

  // Instagram
  selected_ig_user_id?: string;
  selected_ig_username?: string;

  // Ad Account
  selected_ad_account_id?: string;
  selected_ad_account_name?: string;
  ad_account_payment_connected?: boolean;
  ad_account_currency_code?: string;

  // Admin verification
  admin_connected?: boolean;
  admin_checked_at?: string;
  admin_business_role?: string;
  admin_ad_account_role?: string;
  admin_business_users_json?: unknown;
  admin_ad_account_users_json?: unknown;
  admin_business_raw_json?: unknown;
  admin_ad_account_raw_json?: unknown;

  // User app token
  user_app_token?: string;
  user_app_token_expires_at?: string;
  user_app_connected?: boolean;
  user_app_fb_user_id?: string;

  // Status
  status?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

class MetaStorage {
  private isClient: boolean;

  constructor() {
    this.isClient = typeof window !== 'undefined';
  }

  /**
   * Get storage key for a campaign
   */
  private getKey(campaignId: string): string {
    return `${STORAGE_PREFIX}${campaignId}`;
  }

  /**
   * Store connection data
   * @deprecated Use saveCampaignMetaConnection() from lib/services/meta-connection-manager.ts instead
   */
  setConnection(campaignId: string, data: Partial<StoredConnection>): void {
    showDeprecationWarning('setConnection');
    
    if (!this.isClient) {
      metaLogger.warn('MetaStorage', 'Cannot use localStorage on server');
      return;
    }

    try {
      const key = this.getKey(campaignId);
      const existing = this.getConnection(campaignId);

      const updated = {
        ...existing,
        ...data,
        campaign_id: campaignId,
        updated_at: new Date().toISOString(),
      } as StoredConnection;

      // Ensure created_at exists
      if (!updated.created_at) {
        updated.created_at = new Date().toISOString();
      }

      localStorage.setItem(key, JSON.stringify(updated));

      metaLogger.debug('MetaStorage', 'Connection saved', {
        campaignId,
        hasToken: !!updated.long_lived_user_token,
        hasUserAppToken: !!updated.user_app_token,
        status: updated.status,
      });

      // Emit connection updated event for real-time UI updates
      emitMetaConnectionUpdated(campaignId);
    } catch (error) {
      metaLogger.error('MetaStorage', 'Failed to save connection', error as Error, {
        campaignId,
      });
    }
  }

  /**
   * Get connection data
   * @deprecated Use getCampaignMetaConnection() from lib/services/meta-connection-manager.ts instead
   */
  getConnection(campaignId: string): StoredConnection | null {
    showDeprecationWarning('getConnection');
    
    if (!this.isClient) {
      return null;
    }

    try {
      const key = this.getKey(campaignId);
      const data = localStorage.getItem(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as StoredConnection;
    } catch (error) {
      metaLogger.error('MetaStorage', 'Failed to retrieve connection', error as Error, {
        campaignId,
      });
      return null;
    }
  }

  /**
   * Get connection with full token (for API calls)
   */
  getConnectionWithToken(campaignId: string): StoredConnection | null {
    return this.getConnection(campaignId);
  }

  /**
   * Get connection summary (public data only)
   */
  getConnectionSummary(campaignId: string): SelectionSummaryDTO | null {
    const connection = this.getConnection(campaignId);

    if (!connection) {
      return null;
    }

    return {
      business: connection.selected_business_id ? {
        id: connection.selected_business_id,
        name: connection.selected_business_name || '',
      } : undefined,
      page: connection.selected_page_id ? {
        id: connection.selected_page_id,
        name: connection.selected_page_name || '',
      } : undefined,
      instagram: connection.selected_ig_user_id ? {
        id: connection.selected_ig_user_id,
        username: connection.selected_ig_username || '',
      } : undefined,
      adAccount: connection.selected_ad_account_id ? {
        id: connection.selected_ad_account_id,
        name: connection.selected_ad_account_name || '',
        currency: connection.ad_account_currency_code,
      } : undefined,
      paymentConnected: connection.ad_account_payment_connected || false,
      adminConnected: connection.admin_connected || false,
      adminBusinessRole: connection.admin_business_role || null,
      adminAdAccountRole: connection.admin_ad_account_role || null,
      userAppConnected: connection.user_app_connected || false,
      status: this.determineStatus(connection),
    };
  }

  /**
   * Determine connection status
   */
  private determineStatus(connection: StoredConnection): string {
    if (!connection.long_lived_user_token) {
      return 'disconnected';
    }

    if (connection.ad_account_payment_connected) {
      return 'payment_linked';
    }

    if (connection.selected_ad_account_id) {
      return 'selected_assets';
    }

    return 'connected';
  }

  /**
   * Update selected assets
   */
  updateAssets(campaignId: string, assets: Partial<MetaAssets>): void {
    const connection = this.getConnection(campaignId);

    if (!connection) {
      metaLogger.warn('MetaStorage', 'Cannot update assets - connection not found', {
        campaignId,
      });
      return;
    }

    this.setConnection(campaignId, {
      selected_business_id: assets.business?.id,
      selected_business_name: assets.business?.name,
      selected_page_id: assets.page?.id,
      selected_page_name: assets.page?.name,
      selected_page_access_token: assets.page?.access_token,
      selected_ig_user_id: assets.instagram?.id,
      selected_ig_username: assets.instagram?.username,
      selected_ad_account_id: assets.adAccount?.id,
      selected_ad_account_name: assets.adAccount?.name,
    });
  }

  /**
   * Update admin verification status
   */
  updateAdminStatus(
    campaignId: string,
    data: {
      admin_connected: boolean;
      admin_business_role?: string;
      admin_ad_account_role?: string;
      admin_business_users_json?: unknown;
      admin_ad_account_users_json?: unknown;
      admin_business_raw_json?: unknown;
      admin_ad_account_raw_json?: unknown;
    }
  ): void {
    this.setConnection(campaignId, {
      ...data,
      admin_checked_at: new Date().toISOString(),
    });

    metaLogger.info('MetaStorage', 'Admin status updated', {
      campaignId,
      admin_connected: data.admin_connected,
      business_role: data.admin_business_role,
      ad_account_role: data.admin_ad_account_role,
    });
  }

  /**
   * Mark payment as connected
   */
  markPaymentConnected(campaignId: string): void {
    this.setConnection(campaignId, {
      ad_account_payment_connected: true,
      status: 'payment_linked',
    });

    metaLogger.info('MetaStorage', 'Payment marked as connected', {
      campaignId,
    });
  }

  /**
   * Store user app token
   */
  setUserAppToken(
    campaignId: string,
    data: {
      user_app_token: string;
      user_app_token_expires_at: string;
      user_app_fb_user_id: string;
    }
  ): void {
    this.setConnection(campaignId, {
      ...data,
      user_app_connected: true,
    });

    metaLogger.info('MetaStorage', 'User app token stored', {
      campaignId,
      expires_at: data.user_app_token_expires_at,
    });
  }

  /**
   * Delete connection
   */
  deleteConnection(campaignId: string): void {
    if (!this.isClient) {
      return;
    }

    try {
      const key = this.getKey(campaignId);
      localStorage.removeItem(key);

      metaLogger.info('MetaStorage', 'Connection deleted', {
        campaignId,
      });
    } catch (error) {
      metaLogger.error('MetaStorage', 'Failed to delete connection', error as Error, {
        campaignId,
      });
    }
  }

  /**
   * Clear all Meta data (on disconnect)
   */
  clearAllData(campaignId: string): void {
    if (!this.isClient) {
      return;
    }

    // Delete connection
    this.deleteConnection(campaignId);

    // Clear logs
    this.clearLogs();

    metaLogger.info('MetaStorage', 'All Meta data cleared', {
      campaignId,
    });
  }

  /**
   * Get all stored campaign IDs
   */
  getAllCampaignIds(): string[] {
    if (!this.isClient) {
      return [];
    }

    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .map(key => key.replace(STORAGE_PREFIX, ''));
    } catch (error) {
      metaLogger.error('MetaStorage', 'Failed to get campaign IDs', error as Error);
      return [];
    }
  }

  /**
   * Store API log
   */
  storeLog(log: Record<string, unknown>): void {
    if (!this.isClient) {
      return;
    }

    try {
      const existingLogs = localStorage.getItem(LOGS_KEY);
      const logs: unknown[] = existingLogs ? JSON.parse(existingLogs) : [];

      logs.push({
        ...log,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.shift();
      }

      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('[MetaStorage] Failed to store log:', error);
    }
  }

  /**
   * Get stored logs
   */
  getLogs(): unknown[] {
    if (!this.isClient) {
      return [];
    }

    try {
      const existingLogs = localStorage.getItem(LOGS_KEY);
      return existingLogs ? JSON.parse(existingLogs) : [];
    } catch (error) {
      console.error('[MetaStorage] Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    if (!this.isClient) {
      return;
    }

    try {
      localStorage.removeItem(LOGS_KEY);
    } catch (error) {
      console.error('[MetaStorage] Failed to clear logs:', error);
    }
  }

  /**
   * Export all data (for debugging)
   */
  exportAllData(): Record<string, unknown> {
    if (!this.isClient) {
      return {};
    }

    const campaignIds = this.getAllCampaignIds();
    const data: Record<string, unknown> = {};

    for (const campaignId of campaignIds) {
      const connection = this.getConnection(campaignId);
      if (connection) {
        data[campaignId] = connection;
      }
    }

    return {
      connections: data,
      logs: this.getLogs(),
    };
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt: string | undefined): boolean {
    if (!expiresAt) {
      return true;
    }

    try {
      const expiry = new Date(expiresAt);
      return expiry.getTime() < Date.now();
    } catch {
      return true;
    }
  }

  /**
   * Get user app token (with expiry check)
   */
  getUserAppToken(campaignId: string): string | null {
    const connection = this.getConnection(campaignId);

    if (!connection || !connection.user_app_token) {
      return null;
    }

    if (this.isTokenExpired(connection.user_app_token_expires_at)) {
      metaLogger.warn('MetaStorage', 'User app token expired', {
        campaignId,
        expires_at: connection.user_app_token_expires_at,
      });
      return null;
    }

    return connection.user_app_token;
  }

  /**
   * Get long-lived user token (with expiry check)
   */
  getLongLivedToken(campaignId: string): string | null {
    const connection = this.getConnection(campaignId);

    if (!connection || !connection.long_lived_user_token) {
      return null;
    }

    if (this.isTokenExpired(connection.token_expires_at)) {
      metaLogger.warn('MetaStorage', 'Long-lived token expired', {
        campaignId,
        expires_at: connection.token_expires_at,
      });
      return null;
    }

    return connection.long_lived_user_token;
  }
}

// Export singleton instance
export const metaStorage = new MetaStorage();

// Export convenience functions
export const getMetaConnection = (campaignId: string) =>
  metaStorage.getConnection(campaignId);

export const setMetaConnection = (campaignId: string, data: Partial<StoredConnection>) =>
  metaStorage.setConnection(campaignId, data);

export const deleteMetaConnection = (campaignId: string) =>
  metaStorage.deleteConnection(campaignId);

export const clearMetaData = (campaignId: string) =>
  metaStorage.clearAllData(campaignId);

export type { StoredConnection };
