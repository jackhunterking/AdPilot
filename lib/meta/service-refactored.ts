/**
 * Feature: Meta connectivity service (Refactored - localStorage based)
 * Purpose: Centralize Graph API calls with comprehensive logging, no Supabase
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Graph API: https://developers.facebook.com/docs/graph-api
 */

import { env } from '@/lib/env';
import { metaLogger, timeGraphApi } from './logger';
import { metaStorage } from './storage';
import type {
  MetaTokens,
  MetaBusiness,
  MetaPage,
  MetaAdAccount,
  MetaAssets,
} from './types';

const CONTEXT = 'MetaService';

export function getGraphVersion(): string {
  return env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0';
}

/**
 * Exchange OAuth code for short-lived and long-lived tokens
 */
export async function exchangeCodeForTokens(args: {
  code: string;
  redirectUri: string;
}): Promise<MetaTokens> {
  const gv = getGraphVersion();
  const appId = env.NEXT_PUBLIC_FB_APP_ID;
  const appSecret = env.FB_APP_SECRET;

  metaLogger.info(CONTEXT, 'Starting token exchange', {
    hasCode: !!args.code,
    redirectUri: args.redirectUri,
    graphVersion: gv,
  });

  // Step 1: Exchange code for short-lived token
  const shortTokenUrl = `https://graph.facebook.com/${gv}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&code=${encodeURIComponent(args.code)}`;

  const shortToken = await timeGraphApi(
    CONTEXT,
    'Exchange code for short-lived token',
    shortTokenUrl,
    async () => {
      const res = await fetch(shortTokenUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to exchange code: ${res.status} ${res.statusText}`);
      }
      const json: unknown = await res.json();
      const token =
        json &&
        typeof json === 'object' &&
        json !== null &&
        typeof (json as { access_token?: string }).access_token === 'string'
          ? (json as { access_token: string }).access_token
          : '';
      if (!token) throw new Error('No access_token in response');
      return token;
    }
  );

  // Step 2: Exchange short-lived for long-lived token
  const longTokenUrl = `https://graph.facebook.com/${gv}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortToken)}`;

  const longToken = await timeGraphApi(
    CONTEXT,
    'Exchange for long-lived token',
    longTokenUrl,
    async () => {
      const res = await fetch(longTokenUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to exchange for long-lived token: ${res.status} ${res.statusText}`);
      }
      const json: unknown = await res.json();
      const token =
        json &&
        typeof json === 'object' &&
        json !== null &&
        typeof (json as { access_token?: string }).access_token === 'string'
          ? (json as { access_token: string }).access_token
          : '';
      if (!token) throw new Error('No access_token in response');
      return token;
    }
  );

  metaLogger.info(CONTEXT, 'Token exchange completed successfully');

  return { shortToken, longToken };
}

/**
 * Fetch Facebook user ID from token
 */
export async function fetchUserId(args: { token: string }): Promise<string | null> {
  const gv = getGraphVersion();
  const url = `https://graph.facebook.com/${gv}/me?fields=id`;

  return await timeGraphApi(
    CONTEXT,
    'Fetch user ID',
    url,
    async () => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${args.token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        metaLogger.warn(CONTEXT, 'Failed to fetch user ID', {
          status: res.status,
          statusText: res.statusText,
        });
        return null;
      }

      const json: unknown = await res.json();
      const id =
        json &&
        typeof json === 'object' &&
        json !== null &&
        typeof (json as { id?: string }).id === 'string'
          ? (json as { id: string }).id
          : null;

      return id;
    },
    { token: args.token }
  );
}

/**
 * Fetch businesses accessible to user
 */
export async function fetchBusinesses(args: { token: string }): Promise<MetaBusiness[]> {
  const gv = getGraphVersion();
  const url = `https://graph.facebook.com/${gv}/me/businesses?fields=id,name&limit=100`;

  return await timeGraphApi(
    CONTEXT,
    'Fetch businesses',
    url,
    async () => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${args.token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        metaLogger.warn(CONTEXT, 'Failed to fetch businesses', {
          status: res.status,
          statusText: res.statusText,
        });
        return [];
      }

      const json: unknown = await res.json();
      const list =
        json &&
        typeof json === 'object' &&
        json !== null &&
        Array.isArray((json as { data?: unknown[] }).data)
          ? (json as { data: Array<{ id?: string; name?: string }> }).data
          : [];

      const businesses = list.filter(
        (b): b is MetaBusiness => typeof b.id === 'string'
      );

      metaLogger.info(CONTEXT, 'Fetched businesses', { count: businesses.length });
      return businesses;
    },
    { token: args.token }
  );
}

/**
 * Fetch pages with access tokens and Instagram accounts
 */
export async function fetchPagesWithTokens(args: { token: string }): Promise<MetaPage[]> {
  const gv = getGraphVersion();
  const url = `https://graph.facebook.com/${gv}/me/accounts?fields=id,name,access_token,instagram_business_account{username}&limit=500`;

  return await timeGraphApi(
    CONTEXT,
    'Fetch pages with tokens',
    url,
    async () => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${args.token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        metaLogger.warn(CONTEXT, 'Failed to fetch pages', {
          status: res.status,
          statusText: res.statusText,
        });
        return [];
      }

      const json: unknown = await res.json();
      const list =
        json &&
        typeof json === 'object' &&
        json !== null &&
        Array.isArray((json as { data?: unknown[] }).data)
          ? (json as { data: MetaPage[] }).data
          : [];

      const pages = list.filter((p) => typeof p.id === 'string');

      metaLogger.info(CONTEXT, 'Fetched pages', {
        count: pages.length,
        withInstagram: pages.filter((p) => p.instagram_business_account?.id).length,
      });

      return pages;
    },
    { token: args.token }
  );
}

/**
 * Fetch ad accounts with business info
 */
export async function fetchAdAccounts(args: { token: string }): Promise<MetaAdAccount[]> {
  const gv = getGraphVersion();
  const url = `https://graph.facebook.com/${gv}/me/adaccounts?fields=id,name,account_status,currency,business{id,name}&limit=500`;

  return await timeGraphApi(
    CONTEXT,
    'Fetch ad accounts',
    url,
    async () => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${args.token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        metaLogger.warn(CONTEXT, 'Failed to fetch ad accounts', {
          status: res.status,
          statusText: res.statusText,
        });
        return [];
      }

      const json: unknown = await res.json();
      const list =
        json &&
        typeof json === 'object' &&
        json !== null &&
        Array.isArray((json as { data?: unknown[] }).data)
          ? (json as { data: MetaAdAccount[] }).data
          : [];

      const accounts = list.filter((a) => typeof a.id === 'string');

      metaLogger.info(CONTEXT, 'Fetched ad accounts', {
        count: accounts.length,
        active: accounts.filter((a) => a.account_status === 1).length,
      });

      return accounts;
    },
    { token: args.token }
  );
}

/**
 * Choose first valid assets from fetched data
 */
export function chooseAssets(args: {
  businesses: MetaBusiness[];
  pages: MetaPage[];
  adAccounts: MetaAdAccount[];
}): MetaAssets {
  const firstBiz = args.businesses.at(0) ?? null;
  const activeAccounts = args.adAccounts.filter((a) => a.account_status === 1);
  const firstAd = (activeAccounts.at(0) ?? args.adAccounts.at(0)) ?? null;

  // If no business from /me/businesses, get it from the ad account
  const business =
    firstBiz ??
    (firstAd?.business
      ? { id: firstAd.business.id, name: firstAd.business.name }
      : null);

  const firstPage = args.pages.at(0) ?? null;
  const ig = firstPage?.instagram_business_account?.id
    ? {
        id: firstPage.instagram_business_account.id,
        username: firstPage.instagram_business_account.username,
      }
    : null;

  metaLogger.info(CONTEXT, 'Chose assets', {
    hasBusiness: !!business,
    hasPage: !!firstPage,
    hasInstagram: !!ig,
    hasAdAccount: !!firstAd,
  });

  return {
    business,
    page: firstPage,
    instagram: ig,
    adAccount: firstAd,
  };
}

/**
 * Validate ad account status and capabilities
 */
export async function validateAdAccount(args: {
  token: string;
  actId: string;
}): Promise<{
  isActive: boolean;
  status: number | null;
  disableReason?: string;
  hasFunding?: boolean;
  hasToSAccepted?: unknown;
  hasBusiness?: boolean;
  hasOwner?: boolean;
  capabilities: string[];
  currency?: string;
  rawData: Record<string, unknown>;
}> {
  const gv = getGraphVersion();
  const id = args.actId.startsWith('act_') ? args.actId : `act_${args.actId}`;
  const fields =
    'account_status,disable_reason,capabilities,funding_source,funding_source_details,business,tos_accepted,owner,currency';
  const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(id)}?fields=${fields}`;

  return await timeGraphApi(
    CONTEXT,
    'Validate ad account',
    url,
    async () => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${args.token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Graph error ${res.status}: ${text}`);
      }

      const data: unknown = await res.json();
      const obj =
        data && typeof data === 'object' && data !== null
          ? (data as Record<string, unknown>)
          : {};

      const result = {
        isActive: obj.account_status === 1,
        status: typeof obj.account_status === 'number' ? obj.account_status : null,
        disableReason: typeof obj.disable_reason === 'string' ? obj.disable_reason : undefined,
        hasFunding: !!obj.funding_source,
        hasToSAccepted:
          typeof obj.tos_accepted === 'object' ? obj.tos_accepted : undefined,
        hasBusiness: !!obj.business,
        hasOwner: !!obj.owner,
        capabilities: Array.isArray(obj.capabilities)
          ? (obj.capabilities as string[])
          : [],
        currency: typeof obj.currency === 'string' ? obj.currency : undefined,
        rawData: obj,
      };

      metaLogger.info(CONTEXT, 'Ad account validated', {
        actId: args.actId,
        isActive: result.isActive,
        hasFunding: result.hasFunding,
        capabilities: result.capabilities,
      });

      return result;
    },
    { token: args.token, params: { actId: args.actId } }
  );
}

/**
 * Fetch business users with roles (tries multiple edges)
 */
async function fetchBusinessUsersWithRoles(
  token: string,
  businessId: string
): Promise<Array<{ id?: string; role?: string }>> {
  const gv = getGraphVersion();
  const tries = [
    {
      edge: 'users',
      url: `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/users?fields=id,role&limit=500`,
    },
    {
      edge: 'people',
      url: `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/people?fields=id,role&limit=500`,
    },
    {
      edge: 'assigned_users',
      url: `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/assigned_users?fields=id,role&limit=500`,
    },
    {
      edge: 'business_users',
      url: `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/business_users?fields=id,role&limit=500`,
    },
  ];

  for (const t of tries) {
    try {
      metaLogger.logApiCallStart({
        context: CONTEXT,
        operation: `Fetch business users (${t.edge})`,
        endpoint: t.url,
        token,
        metadata: { businessId, edge: t.edge },
      });

      const startTime = Date.now();
      const res = await fetch(t.url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const duration = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text();
        // Use debug instead of error - these fallback attempts are expected
        metaLogger.debug(CONTEXT, `Fetch business users (${t.edge}) - edge not available (expected for some business types)`, {
          endpoint: t.url,
          duration,
          statusCode: res.status,
          businessId,
          edge: t.edge,
        });
        continue;
      }

      const j: unknown = await res.json();
      const list =
        j &&
        typeof j === 'object' &&
        j !== null &&
        Array.isArray((j as { data?: unknown[] }).data)
          ? (j as { data: Array<{ id?: string; role?: string }> }).data
          : [];

      metaLogger.logApiCallSuccess({
        context: CONTEXT,
        operation: `Fetch business users (${t.edge})`,
        endpoint: t.url,
        duration,
        metadata: { businessId, edge: t.edge, count: list.length },
      });

      if (list.length > 0) return list;
    } catch (e) {
      metaLogger.error(
        CONTEXT,
        `Exception fetching business users (${t.edge})`,
        e as Error,
        { businessId, edge: t.edge }
      );
    }
  }

  metaLogger.info(CONTEXT, 'Business user edges not available - will rely on Ad Account roles only', {
    businessId,
    note: 'This is normal for some Meta business types'
  });
  return [];
}

/**
 * Fetch ad account users with tasks (maps to roles)
 */
async function fetchAdAccountUsers(
  token: string,
  adAccountId: string,
  businessId?: string
): Promise<Array<{ id?: string; role?: string }>> {
  const gv = getGraphVersion();
  const normalized = adAccountId.startsWith('act_')
    ? adAccountId.replace(/^act_/, '')
    : adAccountId;
  const actId = `act_${normalized}`;

  // Ad accounts use 'tasks' field (array), not 'role'
  const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(actId)}/users?fields=id,tasks&limit=500`;

  return await timeGraphApi(
    CONTEXT,
    'Fetch ad account users',
    url,
    async () => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        const errorText = await res.text();
        metaLogger.warn(CONTEXT, 'Failed to fetch ad account users', {
          status: res.status,
          error: errorText,
          adAccountId: actId,
        });
        return [];
      }

      const j: unknown = await res.json();

      type UserWithTasks = { id?: string; tasks?: string[] };
      const rawList =
        j &&
        typeof j === 'object' &&
        j !== null &&
        Array.isArray((j as { data?: unknown[] }).data)
          ? (j as { data: UserWithTasks[] }).data
          : [];

      // Convert tasks array to role string
      // ACCOUNT_ADMIN or MANAGE tasks indicate admin-level access
      const list = rawList
        .map((u) => {
          const hasAdminTask =
            u.tasks &&
            (u.tasks.includes('ACCOUNT_ADMIN') || u.tasks.includes('MANAGE'));
          return {
            id: u.id,
            role: hasAdminTask ? 'ADMIN' : null,
          };
        })
        .filter((u) => u.id && u.role !== null)
        .map((u) => ({ id: u.id!, role: u.role! }));

      metaLogger.info(CONTEXT, 'Fetched ad account users with mapped roles', {
        adAccountId: actId,
        count: list.length,
      });

      return list;
    },
    { token, params: { adAccountId: actId, businessId } }
  );
}

/**
 * Check if role indicates admin or finance access
 */
function hasAdminOrFinance(role: string | undefined | null): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r.includes('ADMIN') || r.includes('FINANCE_EDITOR') || r.includes('FINANCE');
}

/**
 * Verify admin access on business and ad account
 * Returns admin status without persisting (caller should store)
 */
export async function verifyAdminAccess(args: {
  token: string;
  businessId: string;
  adAccountId: string;
}): Promise<{
  adminConnected: boolean;
  businessRole: string | null;
  adAccountRole: string | null;
  fbUserId: string | null;
  businessUsers: Array<{ id?: string; role?: string }>;
  adAccountUsers: Array<{ id?: string; role?: string }>;
}> {
  metaLogger.info(CONTEXT, 'Starting admin verification', {
    businessId: args.businessId,
    adAccountId: args.adAccountId,
  });

  let businessRole: string | null = null;
  let adAccountRole: string | null = null;
  let adminConnected = false;
  let fbUserId: string | null = null;
  let businessUsers: Array<{ id?: string; role?: string }> = [];
  let adAccountUsers: Array<{ id?: string; role?: string }> = [];

  try {
    // Fetch user ID
    fbUserId = await fetchUserId({ token: args.token });

    if (!fbUserId) {
      throw new Error('Could not fetch Facebook user ID');
    }

    // Business role
    businessUsers = await fetchBusinessUsersWithRoles(args.token, args.businessId);
    const bRow = businessUsers.find((u) => u.id === fbUserId) || null;
    businessRole = bRow?.role ?? null;

    metaLogger.info(CONTEXT, 'Business user lookup completed', {
      fbUserId,
      businessUsersCount: businessUsers.length,
      businessRole,
    });

    // Ad account role
    adAccountUsers = await fetchAdAccountUsers(
      args.token,
      args.adAccountId,
      args.businessId
    );
    const aRow = adAccountUsers.find((u) => u.id === fbUserId) || null;
    adAccountRole = aRow?.role ?? null;

    metaLogger.info(CONTEXT, 'Ad account user lookup completed', {
      fbUserId,
      adAccountUsersCount: adAccountUsers.length,
      adAccountRole,
    });

    // Lean decision: if Business edges unavailable (role null), allow ad-account admin/finance to pass
    const adOk = hasAdminOrFinance(adAccountRole);
    const bizOk = businessRole == null ? true : hasAdminOrFinance(businessRole);
    adminConnected = adOk && bizOk;

    metaLogger.info(CONTEXT, 'Admin verification completed', {
      businessRole,
      adAccountRole,
      adminConnected,
      fbUserId,
    });
  } catch (e) {
    metaLogger.error(CONTEXT, 'Admin verification error', e as Error, {
      businessId: args.businessId,
      adAccountId: args.adAccountId,
    });
  }

  return {
    adminConnected,
    businessRole,
    adAccountRole,
    fbUserId,
    businessUsers,
    adAccountUsers,
  };
}

/**
 * Compute admin snapshot with full details
 * Returns data for caller to store
 */
export async function computeAdminSnapshot(args: {
  token: string;
  businessId: string;
  adAccountId: string;
}): Promise<{
  admin_connected: boolean;
  admin_business_role: string | null;
  admin_ad_account_role: string | null;
  admin_business_users_json: unknown;
  admin_ad_account_users_json: unknown;
  admin_ad_account_raw_json: unknown;
  admin_checked_at: string;
}> {
  metaLogger.info(CONTEXT, 'Computing admin snapshot', {
    businessId: args.businessId,
    adAccountId: args.adAccountId,
  });

  let fbUserId: string | null = null;
  let businessUsersRaw: Array<{ id?: string; role?: string }> = [];
  let adAccountUsersRaw: Array<{ id?: string; role?: string }> = [];
  let businessRole: string | null = null;
  let adAccountRole: string | null = null;
  let adAccountRaw: Record<string, unknown> | null = null;

  try {
    fbUserId = await fetchUserId({ token: args.token });

    // Business users/roles
    businessUsersRaw = await fetchBusinessUsersWithRoles(args.token, args.businessId);
    const bRow = businessUsersRaw.find((u) => u.id === fbUserId) || null;
    businessRole = bRow?.role ?? null;

    // Ad account users with tasks
    adAccountUsersRaw = await fetchAdAccountUsers(
      args.token,
      args.adAccountId,
      args.businessId
    );
    const aRow = adAccountUsersRaw.find((u) => u.id === fbUserId) || null;
    adAccountRole = aRow?.role ?? null;

    // Optional: include ad account raw details
    try {
      const v = await validateAdAccount({ token: args.token, actId: args.adAccountId });
      adAccountRaw = v.rawData;
    } catch {
      // ignore optional enrichment failures
    }
  } catch (e) {
    metaLogger.error(CONTEXT, 'Admin snapshot computation error', e as Error, {
      businessId: args.businessId,
      adAccountId: args.adAccountId,
    });
  }

  // Compute admin_connected using same logic
  const adOk = hasAdminOrFinance(adAccountRole);
  const bizOk = businessRole == null ? true : hasAdminOrFinance(businessRole);
  const adminConnected = adOk && bizOk;

  metaLogger.info(CONTEXT, 'Admin snapshot completed', {
    adminConnected,
    businessRole,
    adAccountRole,
  });

  return {
    admin_connected: adminConnected,
    admin_business_role: businessRole,
    admin_ad_account_role: adAccountRole,
    admin_business_users_json: businessUsersRaw,
    admin_ad_account_users_json: adAccountUsersRaw,
    admin_ad_account_raw_json: adAccountRaw ?? null,
    admin_checked_at: new Date().toISOString(),
  };
}

// Client-side only functions using localStorage storage
export const clientService = {
  /**
   * Store connection data (client-side only)
   */
  persistConnection(args: {
    campaignId: string;
    userId: string;
    fbUserId: string | null;
    longToken: string;
    assets: MetaAssets;
  }): void {
    const tokenExpiresAt = new Date(
      Date.now() + 100 * 365 * 24 * 60 * 60 * 1000
    ).toISOString();

    metaStorage.setConnection(args.campaignId, {
      campaign_id: args.campaignId,
      user_id: args.userId,
      fb_user_id: args.fbUserId || '',
      long_lived_user_token: args.longToken,
      token_expires_at: tokenExpiresAt,
      selected_business_id: args.assets.business?.id,
      selected_business_name: args.assets.business?.name,
      selected_page_id: args.assets.page?.id,
      selected_page_name: args.assets.page?.name,
      selected_page_access_token: args.assets.page?.access_token,
      selected_ig_user_id: args.assets.instagram?.id,
      selected_ig_username: args.assets.instagram?.username,
      selected_ad_account_id: args.assets.adAccount?.id,
      selected_ad_account_name: args.assets.adAccount?.name,
      ad_account_payment_connected: false,
      admin_connected: false,
      user_app_connected: false,
      status: 'connected',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    metaLogger.info(CONTEXT, 'Connection persisted to localStorage', {
      campaignId: args.campaignId,
    });
  },

  /**
   * Store user app token (client-side only)
   */
  persistUserAppToken(args: {
    campaignId: string;
    userAppToken: string;
    expiresAt: Date;
    fbUserId: string;
  }): void {
    metaStorage.setUserAppToken(args.campaignId, {
      user_app_token: args.userAppToken,
      user_app_token_expires_at: args.expiresAt.toISOString(),
      user_app_fb_user_id: args.fbUserId,
    });

    metaLogger.info(CONTEXT, 'User app token persisted to localStorage', {
      campaignId: args.campaignId,
    });
  },

  /**
   * Mark payment as connected (client-side only)
   */
  markPaymentConnected(campaignId: string): void {
    metaStorage.markPaymentConnected(campaignId);
    metaLogger.info(CONTEXT, 'Payment marked as connected in localStorage', {
      campaignId,
    });
  },

  /**
   * Update admin status (client-side only)
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
    metaStorage.updateAdminStatus(campaignId, data);
    metaLogger.info(CONTEXT, 'Admin status updated in localStorage', {
      campaignId,
      admin_connected: data.admin_connected,
    });
  },

  /**
   * Delete connection and clear all data (client-side only)
   */
  deleteConnection(campaignId: string): void {
    metaStorage.clearAllData(campaignId);
    metaLogger.info(CONTEXT, 'Connection deleted and all data cleared', {
      campaignId,
    });
  },

  /**
   * Get connection summary (client-side only)
   */
  getConnectionSummary(campaignId: string) {
    return metaStorage.getConnectionSummary(campaignId);
  },

  /**
   * Get connection with token (client-side only)
   */
  getConnectionWithToken(campaignId: string) {
    return metaStorage.getConnectionWithToken(campaignId);
  },
};
