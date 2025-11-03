/**
 * Feature: Meta business-owned assets (Pages list)
 * Purpose: Fetch pages owned by a Business (ownership, not just access)
 * References:
 *  - Business owned pages: https://developers.facebook.com/docs/marketing-api/business-manager/asset-management#pages
 */

export interface MetaPage {
  id: string
  name?: string
  access_token?: string
}

export async function fetchBusinessOwnedPages(params: { token: string; businessId: string }): Promise<MetaPage[]> {
  const { token, businessId } = params
  const url = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(businessId)}/owned_pages`)
  url.searchParams.set('fields', 'id,name')
  url.searchParams.set('limit', '5000')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json: unknown = await res.json()
  const data = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
    ? (json as { data: Array<{ id?: string; name?: string }> }).data
    : []
  return data
    .filter((p) => typeof p.id === 'string')
    .map((p) => ({ id: p.id as string, name: typeof p.name === 'string' ? p.name : undefined }))
}


