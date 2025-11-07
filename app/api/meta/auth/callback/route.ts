/**
 * Feature: Meta Business Login callback (Refactored - localStorage based)
 * Purpose: Exchange OAuth `code` for a user token, upgrade to long-lived,
 *          fetch first Business/Page/Ad Account, and return data for client storage.
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 * Build: trigger (no-op)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import {
  exchangeCodeForTokens,
  fetchUserId,
  fetchBusinesses,
  fetchPagesWithTokens,
  fetchAdAccounts,
  chooseAssets,
  computeAdminSnapshot,
} from '@/lib/meta/service-refactored'
import { metaLogger } from '@/lib/meta/logger'

// graph version is provided by the service

export async function GET(req: NextRequest) {
  metaLogger.info('MetaCallback', 'Callback started');

  try {
    const { searchParams, origin } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const callbackType = searchParams.get('type') || 'system';

    if (!code) {
      const paramsLog: Record<string, string> = {};
      searchParams.forEach((v, k) => {
        paramsLog[k] = v;
      });
      metaLogger.error('MetaCallback', 'Missing code parameter', 'No code in callback', {
        queryParams: paramsLog,
        state,
      });
      return NextResponse.redirect(`${origin}/?meta=missing_code`);
    }

    const cookieStore = await cookies();
    const campaignId = cookieStore.get('meta_cid')?.value || null;
    if (!campaignId) {
      metaLogger.error('MetaCallback', 'Missing campaign ID from cookie', 'No meta_cid cookie');
      return NextResponse.redirect(`${origin}/?meta=missing_campaign`);
    }

    metaLogger.info('MetaCallback', 'Processing callback', {
      campaignId,
      callbackType,
    });

    const redirectUri = `${origin}/api/meta/auth/callback?type=${callbackType}`;

    // 1) Exchange code → tokens
    metaLogger.info('MetaCallback', 'Exchanging code for token');
    let longToken: string | null = null;
    try {
      const tokens = await exchangeCodeForTokens({ code, redirectUri });
      longToken = tokens.longToken;
    } catch (err) {
      metaLogger.error('MetaCallback', 'Token exchange failed', err as Error);
      return NextResponse.redirect(`${origin}/${campaignId}?meta=token_exchange_failed`);
    }

    // Persist token for current user (new canonical table)
    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        metaLogger.error('MetaCallback', 'No authenticated user in callback context', new Error('unauthorized'))
        return NextResponse.redirect(`${origin}/?meta=unauthorized`)
      }

      // Approximate expiry (Meta long-lived user token ~60 days)
      const approxExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

      const appId = process.env.NEXT_PUBLIC_FB_APP_ID || 'unknown'

      // Prefer one row per user+app+token_type; conflict on user_id for simplicity
      const upsertRes = await supabase
        .from('meta_tokens')
        .upsert({
          user_id: user.id,
          app_id: appId,
          token: longToken!,
          token_type: 'user',
          expires_at: approxExpiresAt,
          scopes: [],
        }, { onConflict: 'user_id' })

      if (upsertRes.error) {
        metaLogger.error('MetaCallback', 'Failed to upsert meta_tokens', upsertRes.error)
        // Continue, but mark in URL for client to show a warning
      } else {
        metaLogger.info('MetaCallback', 'meta_tokens upserted for user')
      }
    } catch (e) {
      metaLogger.error('MetaCallback', 'Exception persisting meta_tokens', e as Error)
      // Continue to bridge
    }

    // If this is a user app callback, return user token data
    if (callbackType === 'user') {
      metaLogger.info('MetaCallback', 'User app callback detected');
      const fbUserId = await fetchUserId({ token: longToken! });

      if (!fbUserId) {
        metaLogger.error('MetaCallback', 'Failed to fetch user ID', 'User ID fetch returned null');
        return NextResponse.redirect(`${origin}/${campaignId}?meta=user_id_failed`);
      }

      // Approximate long-lived token expiry to 60 days from now
      const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      // Encode data in URL for client to store
      const connectionData = {
        type: 'user_app',
        user_app_token: longToken!,
        user_app_token_expires_at: expiresAt.toISOString(),
        user_app_fb_user_id: fbUserId,
        user_app_connected: true,
      };

      const bridgeUrl = new URL(`${origin}/meta/oauth/bridge`);
      bridgeUrl.searchParams.set('campaignId', campaignId);
      bridgeUrl.searchParams.set('meta', 'connected');
      bridgeUrl.searchParams.set('data', btoa(JSON.stringify(connectionData)));
      if (state) bridgeUrl.searchParams.set('st', state);

      metaLogger.info('MetaCallback', 'User app data prepared, redirecting to bridge');
      return NextResponse.redirect(bridgeUrl.toString());
    }

    // System app callback: fetch assets
    metaLogger.info('MetaCallback', 'Fetching Meta assets (system app)');
    const fbUserId = await fetchUserId({ token: longToken! });

    if (!fbUserId) {
      metaLogger.error('MetaCallback', 'Failed to fetch user ID', 'User ID fetch returned null');
      return NextResponse.redirect(`${origin}/${campaignId}?meta=user_id_failed`);
    }

    const businesses = await fetchBusinesses({ token: longToken! });
    const pages = await fetchPagesWithTokens({ token: longToken! });
    const adAccounts = await fetchAdAccounts({ token: longToken! });

    metaLogger.info('MetaCallback', 'Fetched assets', {
      businessesCount: businesses.length,
      pagesCount: pages.length,
      adAccountsCount: adAccounts.length,
    });

    const assets = chooseAssets({ businesses, pages, adAccounts });

    metaLogger.info('MetaCallback', 'Selected assets', {
      hasBusiness: !!assets.business?.id,
      hasPage: !!assets.page?.id,
      hasAdAccount: !!assets.adAccount?.id,
      hasInstagram: !!assets.instagram?.id,
    });

    // Compute admin snapshot (best-effort, non-blocking)
    let adminSnapshot: Awaited<ReturnType<typeof computeAdminSnapshot>> | null = null;
    if (assets.business?.id && assets.adAccount?.id) {
      try {
        adminSnapshot = await computeAdminSnapshot({
          token: longToken!,
          businessId: assets.business.id,
          adAccountId: assets.adAccount.id,
        });
        metaLogger.info('MetaCallback', 'Admin snapshot computed', {
          admin_connected: adminSnapshot.admin_connected,
        });
      } catch (e) {
        metaLogger.error('MetaCallback', 'Admin snapshot failed (non-fatal)', e as Error);
      }
    }

    // Prepare connection data for client storage
    const tokenExpiresAt = new Date(
      Date.now() + 100 * 365 * 24 * 60 * 60 * 1000
    ).toISOString();

    const connectionData = {
      type: 'system',
      fb_user_id: fbUserId,
      long_lived_user_token: longToken!,
      token_expires_at: tokenExpiresAt,
      selected_business_id: assets.business?.id,
      selected_business_name: assets.business?.name,
      selected_page_id: assets.page?.id,
      selected_page_name: assets.page?.name,
      selected_page_access_token: assets.page?.access_token,
      selected_ig_user_id: assets.instagram?.id,
      selected_ig_username: assets.instagram?.username,
      selected_ad_account_id: assets.adAccount?.id,
      selected_ad_account_name: assets.adAccount?.name,
      ad_account_currency_code: assets.adAccount?.currency,
      ad_account_payment_connected: false,
      admin_connected: adminSnapshot?.admin_connected || false,
      admin_business_role: adminSnapshot?.admin_business_role,
      admin_ad_account_role: adminSnapshot?.admin_ad_account_role,
      admin_checked_at: adminSnapshot?.admin_checked_at,
      user_app_connected: false,
      status: assets.adAccount?.id ? 'connected' : 'selected_assets',
    };

    // Encode data in URL (use base64 to handle special characters)
    const bridgeUrl = new URL(`${origin}/meta/oauth/bridge`);
    bridgeUrl.searchParams.set('campaignId', campaignId);
    bridgeUrl.searchParams.set('meta', 'connected');
    bridgeUrl.searchParams.set('data', btoa(JSON.stringify(connectionData)));
    if (state) bridgeUrl.searchParams.set('st', state);

    metaLogger.info('MetaCallback', 'Connection data prepared, redirecting to bridge');
    return NextResponse.redirect(bridgeUrl.toString());
  } catch (error) {
    metaLogger.error('MetaCallback', 'Unhandled error', error as Error);
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin;
    return NextResponse.redirect(`${origin}/?meta=error`);
  }
}


