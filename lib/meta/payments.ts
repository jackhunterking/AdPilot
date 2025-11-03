/**
 * Feature: Meta payment capability
 * Purpose: Compute a user's ability to add/manage payment for an ad account by
 *          checking business role (role, finance_permission), ad-account tasks
 *          (MANAGE), and current funding presence on the ad account.
 * References:
 *  - Graph API AdAccount: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 *  - Business Users (role, finance_permission): https://developers.facebook.com/docs/graph-api/reference/business-user/
 *  - Vercel AI Gateway (n/a) | Supabase (server client): https://supabase.com/docs/reference/javascript/installing#server-environments
 */

import { getGraphVersion } from '@/lib/meta/service'
import { getConnectionWithToken, validateAdAccount, fetchUserId } from '@/lib/meta/service'

export interface PaymentCapability {
  businessId: string
  adAccountId: string
  role: string | null
  financePermission: string | null
  hasFinance: boolean
  hasManage: boolean
  hasFunding: boolean
}

function includesManage(tasks: unknown): boolean {
  return Array.isArray(tasks) && tasks.some((t) => typeof t === 'string' && t.toUpperCase() === 'MANAGE')
}

function hasFinanceFrom(role: string | null, financePermission: string | null): boolean {
  const r = (role || '').toUpperCase()
  const fp = (financePermission || '').toUpperCase()
  return r === 'ADMIN' || fp === 'FINANCE_EDITOR'
}

/**
 * Compute payment capability for current connection (campaign-scoped).
 */
export async function getPaymentCapability(campaignId: string): Promise<PaymentCapability> {
  const conn = await getConnectionWithToken({ campaignId })
  if (!conn) throw new Error('No Meta connection found for campaign')

  const businessId = conn.selected_business_id || ''
  const adAccountId = conn.selected_ad_account_id || ''
  if (!businessId || !adAccountId) throw new Error('Missing business or ad account selection')

  // Prefer user token for role checks; fall back to long-lived user/system token
  const token = conn.user_app_token || conn.long_lived_user_token || ''
  if (!token) throw new Error('Missing user token for role checks')

  const gv = getGraphVersion()

  // Identify the fb user id represented by the token
  const fbUserId = await fetchUserId({ token })

  // role + finance_permission on the Business user
  let role: string | null = null
  let financePermission: string | null = null
  try {
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/business_users?user=${encodeURIComponent(
      fbUserId ?? ''
    )}&fields=role,finance_permission`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (res.ok) {
      const j: unknown = await res.json()
      const row = (j && typeof j === 'object' && j !== null && Array.isArray((j as { data?: unknown[] }).data))
        ? ((j as { data: Array<{ role?: string; finance_permission?: string }> }).data[0] || null)
        : null
      role = (row && typeof row.role === 'string') ? row.role : null
      financePermission = (row && typeof row.finance_permission === 'string') ? row.finance_permission : null
    }
  } catch {
    // ignore; keep nulls
  }

  // Ad-account tasks for this user within the business context
  let hasManage = false
  try {
    const normalizedActId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(normalizedActId)}/assigned_users?business=${encodeURIComponent(
      businessId
    )}&fields=user{id},tasks&limit=5000`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (res.ok) {
      type Row = { user?: { id?: string }; tasks?: unknown }
      const j: unknown = await res.json()
      const rows = (j && typeof j === 'object' && j !== null && Array.isArray((j as { data?: unknown[] }).data))
        ? (j as { data: Row[] }).data
        : []
      const me = rows.find((r) => r.user?.id === fbUserId) || null
      hasManage = includesManage(me?.tasks)
    }
  } catch {
    // ignore; default false
  }

  // Funding presence
  let hasFunding = false
  try {
    const v = await validateAdAccount({ token, actId: adAccountId })
    hasFunding = Boolean(v.hasFunding)
  } catch {
    // ignore
  }

  const hasFinance = hasFinanceFrom(role, financePermission)

  return {
    businessId,
    adAccountId,
    role,
    financePermission,
    hasFinance,
    hasManage,
    hasFunding,
  }
}

export function getBusinessBillingUrl(businessId: string): string {
  return `https://business.facebook.com/settings/payment-methods?business_id=${encodeURIComponent(businessId)}`
}

export function getAdAccountBillingUrl(adAccountId: string): string {
  const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  return `https://www.facebook.com/ads/manager/account_settings/account_billing/?act=${encodeURIComponent(id)}`
}


