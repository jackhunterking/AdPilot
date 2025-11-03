/**
 * Feature: Meta business-owned assets (Ad accounts list)
 * Purpose: Fetch ad accounts owned by a Business (ownership only)
 * References:
 *  - Business owned ad accounts: https://developers.facebook.com/docs/marketing-api/businessmanager/asset-management#ad-accounts
 */

export interface MetaAdAccount {
  id: string
  name?: string
  account_status?: number
  disable_reason?: string
  currency?: string
}

export async function fetchBusinessOwnedAdAccounts(params: { token: string; businessId: string }): Promise<MetaAdAccount[]> {
  const { token, businessId } = params
  const url = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(businessId)}/owned_ad_accounts`)
  url.searchParams.set('fields', 'id,name,account_status,disable_reason,currency')
  url.searchParams.set('limit', '5000')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json: unknown = await res.json()
  const data = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
    ? (json as { data: Array<{ id?: string; name?: string; account_status?: number; disable_reason?: string; currency?: string }> }).data
    : []
  return data
    .filter((a) => typeof a.id === 'string')
    .map((a) => ({
      id: a.id as string,
      name: typeof a.name === 'string' ? a.name : undefined,
      account_status: typeof a.account_status === 'number' ? a.account_status : undefined,
      disable_reason: typeof a.disable_reason === 'string' ? a.disable_reason : undefined,
      currency: typeof a.currency === 'string' ? a.currency : undefined,
    }))
}


