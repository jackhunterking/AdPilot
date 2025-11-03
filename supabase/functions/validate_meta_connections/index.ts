/**
 * Feature: Validate Meta connections funding (Edge Function)
 * Purpose: Periodically verify funding for meta_connections and update status/has_funding
 * References:
 *  - Supabase Edge Functions: https://supabase.com/docs/guides/functions
 *  - PostgREST pagination: https://postgrest.org/en/stable/references/api/pagination.html
 *  - Meta Ad Account fields: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 */

type MetaConnection = {
  id: string
  user_id: string
  ad_account_id: string | null
  has_funding: boolean
  status: 'pending' | 'connected' | 'ready'
}

type ValidationResult = {
  id: string
  from: MetaConnection['status']
  to: MetaConnection['status'] | null
  funded: boolean
  reason?: string
}

const PAGE_SIZE = 500

function getGraphVersion(): string {
  // Prefer explicit secret; fall back to app env; default to v24.0 used in app
  return (
    Deno.env.get('FB_GRAPH_VERSION') ||
    Deno.env.get('NEXT_PUBLIC_FB_GRAPH_VERSION') ||
    'v24.0'
  )
}

function normalizeActId(adAccountId: string): string {
  return adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
}

function getClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  const headers = {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
  }
  return { url, headers }
}

async function fetchConnections(page: number): Promise<MetaConnection[]> {
  const { url, headers } = getClient()
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const endpoint = new URL(`${url}/rest/v1/meta_connections`)
  endpoint.searchParams.set('status', 'in.(pending,connected)')
  endpoint.searchParams.set('select', 'id,user_id,status,ad_account_id,has_funding')
  const resp = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: { ...headers, 'Range': `${from}-${to}` },
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Failed to fetch meta_connections: ${resp.status} ${text}`)
  }
  return await resp.json() as MetaConnection[]
}

async function getUserAccessToken(userId: string): Promise<string | null> {
  const { url, headers } = getClient()
  // Try user token first
  const u = new URL(`${url}/rest/v1/meta_tokens`)
  u.searchParams.set('user_id', `eq.${userId}`)
  u.searchParams.set('token_type', 'eq.user')
  u.searchParams.set('select', 'token')
  u.searchParams.set('limit', '1')
  let resp = await fetch(u.toString(), { headers })
  if (!resp.ok) return null
  let rows = await resp.json() as Array<{ token?: string }>
  if (rows?.[0]?.token) return rows[0].token!
  // Fallback to system token
  const s = new URL(`${url}/rest/v1/meta_tokens`)
  s.searchParams.set('user_id', `eq.${userId}`)
  s.searchParams.set('token_type', 'eq.system')
  s.searchParams.set('select', 'token')
  s.searchParams.set('limit', '1')
  resp = await fetch(s.toString(), { headers })
  if (!resp.ok) return null
  rows = await resp.json() as Array<{ token?: string }>
  return rows?.[0]?.token ?? null
}

async function hasSufficientFunding(conn: Pick<MetaConnection, 'user_id' | 'ad_account_id'>): Promise<boolean> {
  if (!conn.ad_account_id) return false
  const token = await getUserAccessToken(conn.user_id)
  if (!token) return false
  const gv = getGraphVersion()
  const actId = normalizeActId(conn.ad_account_id)
  const fields = 'account_status,disable_reason,funding_source,funding_source_details,currency'
  const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(actId)}?fields=${fields}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!resp.ok) return false
  const data = await resp.json() as Record<string, unknown>
  const funded = Boolean((data as { funding_source?: unknown }).funding_source || (data as { funding_source_details?: unknown }).funding_source_details)
  return funded
}

function decideStatus(funded: boolean): MetaConnection['status'] {
  return funded ? 'ready' : 'connected'
}

async function updateStatuses(results: ValidationResult[], dryRun: boolean): Promise<number> {
  if (dryRun) return 0
  const payload = results
    .filter((r) => r.to && r.to !== r.from)
    .map((r) => ({ id: r.id, status: r.to!, has_funding: r.funded, updated_at: new Date().toISOString() }))
  if (payload.length === 0) return 0
  const { url, headers } = getClient()
  const resp = await fetch(`${url}/rest/v1/meta_connections`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Failed to update statuses: ${resp.status} ${text}`)
  }
  return payload.length
}

async function validateBatch(conns: MetaConnection[]): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  for (const c of conns) {
    const funded = await hasSufficientFunding({ user_id: c.user_id, ad_account_id: c.ad_account_id })
    const next = decideStatus(funded)
    const to = next === c.status ? null : next
    results.push({ id: c.id, from: c.status, to, funded })
  }
  return results
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    const dryRun = url.searchParams.get('dry_run') === 'true'

    let page = 0
    let totalChecked = 0
    let updatesPlanned = 0
    let updatesApplied = 0

    for (;;) {
      const batch = await fetchConnections(page)
      if (batch.length === 0) break
      const results = await validateBatch(batch)
      totalChecked += results.length
      const toChange = results.filter((r) => r.to && r.to !== r.from).length
      updatesPlanned += toChange
      const applied = await updateStatuses(results, dryRun)
      updatesApplied += applied
      if (batch.length < PAGE_SIZE) break
      page += 1
    }

    const summary = { dryRun, total_checked: totalChecked, updates_planned: updatesPlanned, updates_applied: updatesApplied, graph_version: getGraphVersion() }
    return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' } })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})


