/**
 * Feature: Meta business-owned assets (Business list)
 * Purpose: Fetch businesses the current user administers (business-managed only)
 * References:
 *  - Meta Graph API Business: https://developers.facebook.com/docs/graph-api/reference/business
 */

export interface MetaBusiness {
  id: string
  name?: string
}

export async function fetchUserBusinesses(params: { token: string }): Promise<MetaBusiness[]> {
  const { token } = params
  const url = new URL(`https://graph.facebook.com/v19.0/me/businesses`)
  url.searchParams.set('fields', 'id,name')
  url.searchParams.set('limit', '200')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    return []
  }
  const json: unknown = await res.json()
  const data = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
    ? (json as { data: Array<{ id?: string; name?: string }> }).data
    : []
  return data
    .filter((b) => typeof b.id === 'string')
    .map((b) => ({ id: b.id as string, name: typeof b.name === 'string' ? b.name : undefined }))
}


