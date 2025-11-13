"use client"

/**
 * Feature: Meta OAuth Bridge (Popup → Parent) - Refactored for localStorage
 * Purpose: After Meta Business Login callback redirects here inside the popup,
 *          notify the opener window with connection data for localStorage storage, then close.
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Facebook JS SDK (popup flows): https://developers.facebook.com/docs/javascript/reference/FB.ui/
 */

import { useEffect } from "react"

export default function MetaOAuthBridgePage() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const campaignId = url.searchParams.get("campaignId") || undefined
      const status = url.searchParams.get("meta") || "connected"
      const st = url.searchParams.get('st') || undefined
      const dataParam = url.searchParams.get('data') || undefined

      const opener = window.opener
      const origin = window.location.origin

      console.log('[MetaOAuthBridge] Processing bridge', {
        campaignId,
        status,
        hasData: !!dataParam,
      });

      // Optional CSRF state check (client-side only)
      try {
        const expected = sessionStorage.getItem('meta_oauth_state') || undefined
        if (st && expected && st !== expected) {
          console.warn('[MetaOAuthBridge] State mismatch', { st, expected })
        }
      } catch { /* ignore */ }

      // Decode connection data if present
      let connectionData: unknown = null;
      if (dataParam) {
        try {
          const decoded = atob(dataParam);
          connectionData = JSON.parse(decoded);
          console.log('[MetaOAuthBridge] Decoded connection data', {
            type: (connectionData as { type?: string })?.type,
          });
        } catch (err) {
          console.error('[MetaOAuthBridge] Failed to decode data', err);
        }
      }

      if (opener && typeof opener.postMessage === "function") {
        opener.postMessage(
          {
            type: "META_CONNECTED",
            campaignId,
            status,
            connectionData,
          },
          origin
        )

        console.log('[MetaOAuthBridge] Posted message to parent, closing in 150ms');

        // Give the message a moment to deliver, then close.
        setTimeout(() => {
          try { window.close() } catch { /* noop */ }
        }, 150)
      } else if (campaignId) {
        // Fallback: navigate the popup to the campaign page (opener will remain unchanged)
        console.warn('[MetaOAuthBridge] No opener found, navigating popup to campaign page');
        window.location.replace(`/${encodeURIComponent(campaignId)}?meta=${encodeURIComponent(status)}`)
      }
    } catch (err) {
      // If anything goes wrong, just attempt to close
      console.error('[MetaOAuthBridge] Bridge error', err);
      try { window.close() } catch { /* noop */ }
    }
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#666' }}>Finishing Meta connection…</p>
        <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>You can close this window.</p>
      </div>
    </div>
  )
}


