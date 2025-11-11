/**
 * Feature: Meta connectivity service
 * Purpose: Centralize Graph API calls and Supabase persistence for Meta connect
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Graph API: https://developers.facebook.com/docs/graph-api
 *  - Supabase JS (server): https://supabase.com/docs/reference/javascript/installing#server-environments
 */

import { env } from '@/lib/env'
import { supabaseServer } from '@/lib/supabase/server'
import type { MetaTokens, MetaBusiness, MetaPage, MetaAdAccount, MetaAssets, CampaignMetaConnectionPayload } from './types'

export function getGraphVersion(): string {
  return env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
}

function redactToken(token: string | null | undefined): string {
  if (!token) return ''
  return token.slice(0, 6) + '...' + token.slice(-4)
}

export async function exchangeCodeForTokens(args: { code: string; redirectUri: string }): Promise<MetaTokens> {
  const gv = getGraphVersion()
  const appId = env.NEXT_PUBLIC_FB_APP_ID
  const appSecret = env.FB_APP_SECRET

  const res1 = await fetch(
    `https://graph.facebook.com/${gv}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&code=${encodeURIComponent(args.code)}`,
    { cache: 'no-store' }
  )
  const json1: unknown = await res1.json()
  const shortToken = (json1 && typeof json1 === 'object' && json1 !== null && typeof (json1 as { access_token?: string }).access_token === 'string')
    ? (json1 as { access_token: string }).access_token
    : ''
  if (!shortToken) throw new Error('Failed to exchange code for short-lived token')

  const res2 = await fetch(
    `https://graph.facebook.com/${gv}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortToken)}`,
    { cache: 'no-store' }
  )
  const json2: unknown = await res2.json()
  const longToken = (json2 && typeof json2 === 'object' && json2 !== null && typeof (json2 as { access_token?: string }).access_token === 'string')
    ? (json2 as { access_token: string }).access_token
    : ''
  if (!longToken) throw new Error('Failed to exchange for long-lived token')

  return { shortToken, longToken }
}

export async function fetchUserId(args: { token: string }): Promise<string | null> {
  const gv = getGraphVersion()
  const res = await fetch(`https://graph.facebook.com/${gv}/me?fields=id`, {
    headers: { Authorization: `Bearer ${args.token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json: unknown = await res.json() 
  console.log('[MetaService] fetchUserId response:', json)
  const id = (json && typeof json === 'object' && json !== null && typeof (json as { id?: string }).id === 'string')
    ? (json as { id: string }).id
    : null
  return id
}

export async function fetchBusinesses(args: { token: string }): Promise<MetaBusiness[]> {
  const gv = getGraphVersion()
  const res = await fetch(`https://graph.facebook.com/${gv}/me/businesses?fields=id,name&limit=100`, {
    headers: { Authorization: `Bearer ${args.token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json: unknown = await res.json()
  const list = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
    ? (json as { data: Array<{ id?: string; name?: string }> }).data
    : []
  return list.filter((b): b is MetaBusiness => typeof b.id === 'string')
}

export async function fetchPagesWithTokens(args: { token: string }): Promise<MetaPage[]> {
  const gv = getGraphVersion()
  const res = await fetch(`https://graph.facebook.com/${gv}/me/accounts?fields=id,name,access_token,instagram_business_account{username}&limit=500`, {
    headers: { Authorization: `Bearer ${args.token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json: unknown = await res.json()
  const list = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
    ? (json as { data: MetaPage[] }).data
    : []
  return list.filter((p) => typeof p.id === 'string')
}

export async function fetchAdAccounts(args: { token: string }): Promise<MetaAdAccount[]> {
  const gv = getGraphVersion()
  const res = await fetch(`https://graph.facebook.com/${gv}/me/adaccounts?fields=id,name,account_status,currency,business{id,name}&limit=500`, {
    headers: { Authorization: `Bearer ${args.token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json: unknown = await res.json()
  console.log('[MetaService] fetchAdAccounts response:', json)
  const list = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
    ? (json as { data: MetaAdAccount[] }).data
    : []
  return list.filter((a) => typeof a.id === 'string')
}

export function chooseAssets(args: { businesses: MetaBusiness[]; pages: MetaPage[]; adAccounts: MetaAdAccount[] }): MetaAssets {
  const firstBiz = args.businesses.at(0) ?? null
  const activeAccounts = args.adAccounts.filter((a) => a.account_status === 1)
  const firstAd = (activeAccounts.at(0) ?? args.adAccounts.at(0)) ?? null
  
  // If no business from /me/businesses, get it from the ad account
  // This works even without business_management permission
  const business = firstBiz ?? (firstAd?.business ? { id: firstAd.business.id, name: firstAd.business.name } : null)
  
  const firstPage = args.pages.at(0) ?? null
  const ig = firstPage?.instagram_business_account?.id
    ? { id: firstPage.instagram_business_account.id, username: firstPage.instagram_business_account.username }
    : null
  return {
    business,
    page: firstPage,
    instagram: ig,
    adAccount: firstAd,
  }
}

export async function persistConnection(args: {
  campaignId: string
  userId: string
  fbUserId: string | null
  longToken: string
  assets: MetaAssets
}): Promise<void> {
  // System-user tokens with "Never" expiration - set far future date
  const tokenExpiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
  const payload: CampaignMetaConnectionPayload = {
    campaign_id: args.campaignId,
    user_id: args.userId,
    fb_user_id: args.fbUserId,
    long_lived_user_token: args.longToken,
    token_expires_at: tokenExpiresAt,
    selected_business_id: args.assets.business?.id ?? null,
    selected_business_name: args.assets.business?.name ?? null,
    selected_page_id: args.assets.page?.id ?? null,
    selected_page_name: args.assets.page?.name ?? null,
    selected_page_access_token: args.assets.page?.access_token ?? null,
    selected_ig_user_id: args.assets.instagram?.id ?? null,
    selected_ig_username: args.assets.instagram?.username ?? null,
    selected_ad_account_id: args.assets.adAccount?.id ?? null,
    selected_ad_account_name: args.assets.adAccount?.name ?? null,
    ad_account_currency_code: args.assets.adAccount?.currency ?? null,
    ad_account_payment_connected: false,
    admin_connected: false,
    user_app_connected: false,
  }

  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .upsert(payload, { onConflict: 'campaign_id' })

  if (error) {
    // Do not log raw token
    console.error('[MetaService] Upsert connection failed:', {
      error,
      campaignId: args.campaignId,
      userId: args.userId,
      fbUserId: args.fbUserId,
      token: redactToken(args.longToken),
    })
    throw error
  }
}

export async function getConnection(args: { campaignId: string }): Promise<{
  selected_business_id: string | null
  selected_business_name: string | null
  selected_page_id: string | null
  selected_page_name: string | null
  selected_ig_user_id: string | null
  selected_ig_username: string | null
  selected_ad_account_id: string | null
  selected_ad_account_name: string | null
  ad_account_payment_connected: boolean | null
  long_lived_user_token?: string | null
} | null> {
  const { data } = await supabaseServer
    .from('campaign_meta_connections')
    .select('selected_business_id,selected_business_name,selected_page_id,selected_page_name,selected_ig_user_id,selected_ig_username,selected_ad_account_id,selected_ad_account_name,ad_account_payment_connected,long_lived_user_token')
    .eq('campaign_id', args.campaignId)
    .maybeSingle()
  return (data as unknown as ReturnType<typeof getConnection> extends Promise<infer T> ? T : never) ?? null
}

export async function updateCampaignState(args: { campaignId: string; status: string; extra?: Record<string, unknown> }): Promise<void> {
  const meta_connect_data = { status: args.status, ...(args.extra ?? {}) }
  const { data: updatedRows, error } = await supabaseServer
    .from('campaign_states')
    .update({ meta_connect_data })
    .eq('campaign_id', args.campaignId)
    .select('campaign_id')

  if (error || !updatedRows || updatedRows.length === 0) {
    const { error: insertError } = await supabaseServer
      .from('campaign_states')
      .insert({ campaign_id: args.campaignId, meta_connect_data })
    if (insertError) throw insertError
  }
}

export async function validateAdAccount(args: { token: string; actId: string }): Promise<{
  isActive: boolean
  status: number | null
  disableReason?: string
  hasFunding?: boolean
  hasToSAccepted?: unknown
  hasBusiness?: boolean
  hasOwner?: boolean
  capabilities: string[]
  currency?: string
  rawData: Record<string, unknown>
}> {
  const gv = getGraphVersion()
  const id = args.actId.startsWith('act_') ? args.actId : `act_${args.actId}`
  const fields = 'account_status,disable_reason,capabilities,funding_source,funding_source_details,business,tos_accepted,owner,currency'
  const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(id)}?fields=${fields}`
  
  console.log('[validateAdAccount] Calling Graph API', {
    adAccountId: id,
    url,
    fields,
  })
  
  const res = await fetch(url, { headers: { Authorization: `Bearer ${args.token}` }, cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    console.error('[validateAdAccount] Graph API error', {
      status: res.status,
      response: text,
    })
    throw new Error(`Graph error ${res.status}: ${text}`)
  }
  
  const data: unknown = await res.json()
  console.log('[validateAdAccount] Graph API response', {
    adAccountId: id,
    data,
  })
  
  const obj = (data && typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {}
  
  const hasFunding = !!obj.funding_source
  const fundingSourceDetails = obj.funding_source_details
  
  console.log('[validateAdAccount] Funding analysis', {
    adAccountId: id,
    fundingSource: obj.funding_source,
    fundingSourceType: typeof obj.funding_source,
    fundingSourceDetails,
    fundingSourceDetailsType: typeof fundingSourceDetails,
    hasFunding,
  })
  
  return {
    isActive: obj.account_status === 1,
    status: typeof obj.account_status === 'number' ? obj.account_status : null,
    disableReason: typeof obj.disable_reason === 'string' ? obj.disable_reason : undefined,
    hasFunding,
    hasToSAccepted: typeof obj.tos_accepted === 'object' ? obj.tos_accepted : undefined,
    hasBusiness: !!obj.business,
    hasOwner: !!obj.owner,
    capabilities: Array.isArray(obj.capabilities) ? (obj.capabilities as string[]) : [],
    currency: typeof obj.currency === 'string' ? obj.currency : undefined,
    rawData: obj,
  }
}

export async function markPaymentConnected(args: { campaignId: string }): Promise<void> {
  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .update({ ad_account_payment_connected: true })
    .eq('campaign_id', args.campaignId)
  if (error) throw error
}

export async function deleteConnection(args: { campaignId: string }): Promise<void> {
  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .delete()
    .eq('campaign_id', args.campaignId)
  if (error) throw error
}

export async function setDisconnected(args: { campaignId: string }): Promise<void> {
  const { error } = await supabaseServer
    .from('campaign_states')
    .update({ meta_connect_data: { status: 'disconnected', disconnectedAt: new Date().toISOString() } })
    .eq('campaign_id', args.campaignId)
  if (error) {
    // non-fatal
    console.error('[MetaService] setDisconnected error:', error)
  }
}

/**
 * Return only non-sensitive connection fields for client consumption.
 */
export async function getConnectionPublic(args: { campaignId: string }): Promise<{
  selected_business_id: string | null
  selected_business_name: string | null
  selected_page_id: string | null
  selected_page_name: string | null
  selected_page_access_token: string | null
  selected_ig_user_id: string | null
  selected_ig_username: string | null
  selected_ad_account_id: string | null
  selected_ad_account_name: string | null
  ad_account_payment_connected: boolean | null
  admin_connected: boolean | null
  admin_checked_at: string | null
  admin_business_role: string | null
  admin_ad_account_role: string | null
  user_app_connected: boolean | null
} | null> {
  const { data, error } = await supabaseServer
    .from('campaign_meta_connections')
    .select('selected_business_id,selected_business_name,selected_page_id,selected_page_name,selected_page_access_token,selected_ig_user_id,selected_ig_username,selected_ad_account_id,selected_ad_account_name,ad_account_payment_connected,admin_connected,admin_checked_at,admin_business_role,admin_ad_account_role,user_app_connected')
    .eq('campaign_id', args.campaignId)
    .maybeSingle()
  if (error) {
    console.error('[MetaService] getConnectionPublic error:', error)
    return null
  }
  return data as unknown as ReturnType<typeof getConnectionPublic> extends Promise<infer T> ? T : never
}

/**
 * Persist the user app token fields on the connection row.
 */
export async function persistUserAppToken(
  campaignId: string,
  userAppToken: string,
  expiresAt: Date,
  userId: string,
): Promise<void> {
  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .update({
      user_app_token: userAppToken,
      user_app_token_expires_at: expiresAt.toISOString(),
      user_app_connected: true,
      user_app_fb_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', campaignId)
  if (error) throw error
}

/**
 * Fetch only the user app token.
 */
export async function getUserAppToken(campaignId: string): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from('campaign_meta_connections')
    .select('user_app_token')
    .eq('campaign_id', campaignId)
    .maybeSingle()
  if (error) return null
  return (data as { user_app_token?: string | null } | null)?.user_app_token ?? null
}

/**
 * Return connection including sensitive token for server-side use only.
 */
export async function getConnectionWithToken(args: { campaignId: string }): Promise<{
  long_lived_user_token: string | null
  user_app_token: string | null
  user_app_token_expires_at: string | null
} & NonNullable<Awaited<ReturnType<typeof getConnectionPublic>>> | null> {
  const { data, error } = await supabaseServer
    .from('campaign_meta_connections')
    .select('selected_business_id,selected_business_name,selected_page_id,selected_page_name,selected_page_access_token,selected_ig_user_id,selected_ig_username,selected_ad_account_id,selected_ad_account_name,ad_account_payment_connected,admin_connected,admin_checked_at,admin_business_role,admin_ad_account_role,user_app_connected,long_lived_user_token,user_app_token,user_app_token_expires_at')
    .eq('campaign_id', args.campaignId)
    .maybeSingle()
  if (error) {
    console.error('[MetaService] getConnectionWithToken error:', error)
    return null
  }
  return data as unknown as ReturnType<typeof getConnectionWithToken> extends Promise<infer T> ? T : never
}

/**
 * Update selected assets in SSOT. Fetches names/tokens as needed using the stored user token.
 */
export async function setSelectedAssets(args: {
  campaignId: string
  businessId?: string | null
  pageId?: string | null
  adAccountId?: string | null
}): Promise<void> {
  const current = await getConnectionWithToken({ campaignId: args.campaignId })
  if (!current) throw new Error('No existing Meta connection to update')

  const token = current.long_lived_user_token || ''
  if (!token) throw new Error('Missing long-lived user token')

  const updates: Record<string, unknown> = {}

  // Business
  if (typeof args.businessId !== 'undefined') {
    updates.selected_business_id = args.businessId
    updates.selected_business_name = null
    if (args.businessId) {
      try {
        const gv = getGraphVersion()
        const res = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(args.businessId)}?fields=name`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const j: unknown = await res.json()
          const name = (j && typeof j === 'object' && j !== null && typeof (j as { name?: string }).name === 'string') ? (j as { name: string }).name : null
          updates.selected_business_name = name
        }
      } catch {}
    }
  }

  // Page (and IG via page)
  if (typeof args.pageId !== 'undefined') {
    updates.selected_page_id = args.pageId
    updates.selected_page_name = null
    updates.selected_page_access_token = null
    updates.selected_ig_user_id = null
    updates.selected_ig_username = null
    if (args.pageId) {
      try {
        const pages = await fetchPagesWithTokens({ token })
        const match = pages.find(p => p.id === args.pageId) || null
        if (match) {
          updates.selected_page_name = match.name ?? null
          updates.selected_page_access_token = match.access_token ?? null
          if (match.instagram_business_account?.id) {
            updates.selected_ig_user_id = match.instagram_business_account.id
            updates.selected_ig_username = match.instagram_business_account.username ?? null
          }
        }
      } catch {}
    }
  }

  // Ad Account
  if (typeof args.adAccountId !== 'undefined') {
    const rawId = args.adAccountId
    updates.selected_ad_account_id = rawId
    updates.selected_ad_account_name = null
    updates.ad_account_currency_code = null
    if (rawId) {
      try {
        const accounts = await fetchAdAccounts({ token })
        const normalized = rawId.startsWith('act_') ? rawId.replace(/^act_/, '') : rawId
        const match = accounts.find(a => a.id === normalized) || accounts.find(a => `act_${a.id}` === rawId) || null
        if (match) {
          updates.selected_ad_account_id = match.id
          updates.selected_ad_account_name = match.name ?? null
          updates.ad_account_currency_code = match.currency ?? null
        }
      } catch {}
    }
  }

  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .update(updates)
    .eq('campaign_id', args.campaignId)
  if (error) throw error

  // Reflect status
  try {
    await updateCampaignState({ campaignId: args.campaignId, status: 'connected' })
  } catch {}

  // Best-effort: recompute admin snapshot when business/ad account may have changed
  try {
    const finalBusinessId = typeof args.businessId !== 'undefined' ? args.businessId : (current.selected_business_id || null)
    const finalAdAccountId = typeof args.adAccountId !== 'undefined' ? args.adAccountId : (current.selected_ad_account_id || null)
    if (finalBusinessId && finalAdAccountId) {
      await computeAndPersistAdminSnapshot(args.campaignId)
    }
  } catch (e) {
    console.error('[MetaService] setSelectedAssets snapshot failed (non-fatal):', e)
  }
}


/**
 * Feature: Admin verification
 * Purpose: Verify that the connected fb user has admin/payment roles on Business & Ad Account
 * References:
 *  - Business assigned users: https://developers.facebook.com/docs/graph-api/reference/business/assigned_users/
 *  - Ad Account users/roles: https://developers.facebook.com/docs/marketing-api/reference/ad-account/
 */
async function fetchBusinessUsersWithRoles(token: string, businessId: string): Promise<Array<{ id?: string; role?: string }>> {
  const gv = getGraphVersion()
  const tries = [
    { edge: 'users', url: `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/users?fields=id,role&limit=500` },
    { edge: 'people', url: `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/people?fields=id,role&limit=500` },
    { edge: 'assigned_users', url: `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/assigned_users?fields=id,role&limit=500` },
    { edge: 'business_users', url: `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/business_users?fields=id,role&limit=500` },
  ] as Array<{ edge: string; url: string }>

  for (const t of tries) {
    try {
      console.log('[fetchBusinessUsersWithRoles] Trying edge:', { edge: t.edge, url: t.url, businessId, graphVersion: gv, tokenPrefix: token.substring(0, 10) + '...' })
      const res = await fetch(t.url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      console.log('[fetchBusinessUsersWithRoles] Edge response:', { edge: t.edge, status: res.status, statusText: res.statusText, ok: res.ok })
      if (!res.ok) {
        const errorText = await res.text()
        console.warn('[fetchBusinessUsersWithRoles] Edge failed:', { edge: t.edge, status: res.status, errorText })
        continue
      }
      const j: unknown = await res.json()
      const list = (j && typeof j === 'object' && j !== null && Array.isArray((j as { data?: unknown[] }).data))
        ? (j as { data: Array<{ id?: string; role?: string }> }).data
        : []
      console.log('[fetchBusinessUsersWithRoles] Edge result:', { edge: t.edge, count: list.length, users: list.map(u => ({ id: u.id, role: u.role })) })
      if (list.length > 0) return list
    } catch (e) {
      console.error('[fetchBusinessUsersWithRoles] Edge exception:', { edge: t.edge, error: e instanceof Error ? e.message : String(e) })
    }
  }

  console.warn('[fetchBusinessUsersWithRoles] All edges returned no users/roles for business:', { businessId })
  return []
}

async function fetchAdAccountUsers(token: string, adAccountId: string, businessId?: string): Promise<Array<{ id?: string; role?: string }>> {
  const gv = getGraphVersion()
  const normalized = adAccountId.startsWith('act_') ? adAccountId.replace(/^act_/, '') : adAccountId
  const actId = `act_${normalized}`
  
  console.log('[fetchAdAccountUsers] Fetching ad account users:', {
    originalId: adAccountId,
    normalizedId: actId,
    graphVersion: gv,
    tokenPrefix: token.substring(0, 10) + '...',
    businessId: businessId || 'none',
  })
  
  // Ad accounts use 'tasks' field (array), not 'role'
  // tasks array contains permissions like: ['ACCOUNT_ADMIN', 'MANAGE', 'ADVERTISE', etc.]
  const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(actId)}/users?fields=id,tasks&limit=500`
  
  console.log('[fetchAdAccountUsers] Calling /users with tasks field:', { url })
  
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  
  console.log('[fetchAdAccountUsers] API response:', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[fetchAdAccountUsers] API error:', {
      status: res.status,
      errorText,
      adAccountId: actId,
    })
    return []
  }
  
  const j: unknown = await res.json()
  
  // Parse tasks array and convert to role format for consistency with business users
  type UserWithTasks = { id?: string; tasks?: string[] }
  const rawList = (j && typeof j === 'object' && j !== null && Array.isArray((j as { data?: unknown[] }).data))
    ? (j as { data: UserWithTasks[] }).data
    : []
  
  console.log('[fetchAdAccountUsers] Raw API response with tasks:', {
    count: rawList.length,
    usersWithTasks: rawList.map(u => ({ id: u.id, tasks: u.tasks })),
  })
  
  // Convert tasks array to role string for storage/comparison
  // ACCOUNT_ADMIN or MANAGE tasks indicate admin-level access
  const list = rawList
    .map(u => {
      const hasAdminTask = u.tasks && (u.tasks.includes('ACCOUNT_ADMIN') || u.tasks.includes('MANAGE'))
      return {
        id: u.id,
        role: hasAdminTask ? 'ADMIN' : null,
        originalTasks: u.tasks || []
      }
    })
    .filter(u => u.id && u.role !== null)
    .map(u => ({ id: u.id!, role: u.role! }))
  
  console.log('[fetchAdAccountUsers] Mapped tasks to roles:', {
    count: list.length,
    users: list.map(u => ({ id: u.id, role: u.role })),
  })
  
  return list
}

function hasAdminOrFinance(role: string | undefined | null): boolean {
  if (!role) return false
  const r = role.toUpperCase()
  return r.includes('ADMIN') || r.includes('FINANCE_EDITOR') || r.includes('FINANCE')
}

export async function verifyAdminAccess(campaignId: string): Promise<{
  adminConnected: boolean
  businessRole: string | null
  adAccountRole: string | null
}> {
  const conn = await getConnectionWithToken({ campaignId })
  if (!conn) throw new Error('No Meta connection found for campaign')
  
  // Use user app token for admin verification (required for role checks)
  const userToken = conn.user_app_token || ''
  const userTokenExpiry = conn.user_app_token_expires_at

  if (!userToken) {
    throw new Error('User app token required for admin verification. Please complete "Login with Facebook (User Access)" first.')
  }

  // Check token expiry
  if (userTokenExpiry) {
    const expiryDate = new Date(userTokenExpiry)
    const now = new Date()
    if (expiryDate <= now) {
      throw new Error('User app token has expired. Please reconnect via "Login with Facebook (User Access)".')
    }
  }

  const token = userToken

  const businessId = conn.selected_business_id || ''
  const adAccountId = conn.selected_ad_account_id || ''
  if (!businessId || !adAccountId) throw new Error('Missing business or ad account selection')

  console.log('[MetaService] verifyAdminAccess starting:', {
    campaignId,
    hasSystemToken: !!conn.long_lived_user_token,
    hasUserToken: !!conn.user_app_token,
    userTokenExpiry: conn.user_app_token_expires_at,
    businessId: conn.selected_business_id,
    adAccountId: conn.selected_ad_account_id,
  })

  let businessRole: string | null = null
  let adAccountRole: string | null = null
  let adminConnected = false

  try {
    // Identify fb user id from token
    const fbUserId = await fetchUserId({ token })
    // Business role
    const bu = await fetchBusinessUsersWithRoles(token, businessId)
    const bRow = bu.find(u => u.id === fbUserId) || null
    businessRole = bRow?.role ?? null

    console.log('[MetaService] verifyAdminAccess business user lookup:', {
      fbUserId,
      businessUsersCount: bu.length,
      allBusinessUsers: bu.map(u => ({ id: u.id, role: u.role })),
      foundUser: bRow,
      businessRole,
    })

    // Ad account role
    const au = await fetchAdAccountUsers(token, adAccountId, businessId)
    const aRow = au.find(u => u.id === fbUserId) || null
    adAccountRole = aRow?.role ?? null

    console.log('[MetaService] verifyAdminAccess ad account user lookup:', {
      fbUserId,
      adAccountUsersCount: au.length,
      allAdAccountUsers: au.map(u => ({ id: u.id, role: u.role })),
      foundUser: aRow,
      adAccountRole,
    })

    // Lean decision: if Business edges are unavailable (role null), allow ad-account admin/finance to pass
    const adOk = hasAdminOrFinance(adAccountRole)
    const bizOk = businessRole == null ? true : hasAdminOrFinance(businessRole)
    adminConnected = adOk && bizOk

    console.log('[MetaService] verifyAdminAccess final determination:', {
      businessRole,
      adAccountRole,
      businessHasAdminOrFinance: hasAdminOrFinance(businessRole),
      adAccountHasAdminOrFinance: hasAdminOrFinance(adAccountRole),
      decision: { adOk, bizOk },
      adminConnected,
    })

    console.log('[MetaService] verifyAdminAccess roles fetched:', {
      businessRole,
      adAccountRole,
      adminConnected,
      fbUserId,
    })
  } catch (e) {
    console.error('[MetaService] verifyAdminAccess error during graph checks:', e)
  }

  const updates = {
    admin_connected: adminConnected,
    admin_checked_at: new Date().toISOString(),
    admin_business_role: businessRole,
    admin_ad_account_role: adAccountRole,
  }

  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .update(updates)
    .eq('campaign_id', campaignId)
  if (error) throw error

  return { adminConnected, businessRole, adAccountRole }
}


/**
 * Feature: Admin snapshot on connect
 * Purpose: Fetch and persist raw role/user JSON plus computed roles immediately after connect
 */
export async function computeAndPersistAdminSnapshot(campaignId: string): Promise<void> {
  const conn = await getConnectionWithToken({ campaignId })
  if (!conn) return

  const businessId = conn.selected_business_id || ''
  const adAccountId = conn.selected_ad_account_id || ''
  if (!businessId || !adAccountId) return

  // Prefer user app token, else fall back to long-lived user token
  const token = conn.user_app_token || conn.long_lived_user_token || ''
  if (!token) return

  let fbUserId: string | null = null
  let businessUsersRaw: Array<{ id?: string; role?: string }> = []
  let adAccountUsersRaw: Array<{ id?: string; role?: string }> = []
  let businessRole: string | null = null
  let adAccountRole: string | null = null
  let adAccountRaw: Record<string, unknown> | null = null

  try {
    fbUserId = await fetchUserId({ token })

    // Business users/roles (try multiple edges inside helper)
    businessUsersRaw = await fetchBusinessUsersWithRoles(token, businessId)
    const bRow = businessUsersRaw.find(u => u.id === fbUserId) || null
    businessRole = bRow?.role ?? null

    // Ad account users with tasks (mapped to role)
    adAccountUsersRaw = await fetchAdAccountUsers(token, adAccountId, businessId)
    const aRow = adAccountUsersRaw.find(u => u.id === fbUserId) || null
    adAccountRole = aRow?.role ?? null

    // Optional: include ad account raw details using existing validator
    try {
      const v = await validateAdAccount({ token, actId: adAccountId })
      adAccountRaw = v.rawData
    } catch {
      // ignore optional enrichment failures
    }
  } catch (e) {
    console.error('[MetaService] computeAndPersistAdminSnapshot error:', e)
  }

  // Compute admin_connected using the same logic as verifyAdminAccess
  const adOk = hasAdminOrFinance(adAccountRole)
  const bizOk = businessRole == null ? true : hasAdminOrFinance(businessRole)
  const adminConnected = adOk && bizOk

  const updates: Record<string, unknown> = {
    admin_connected: adminConnected,
    admin_checked_at: new Date().toISOString(),
    admin_business_role: businessRole,
    admin_ad_account_role: adAccountRole,
    admin_business_users_json: businessUsersRaw,
    admin_ad_account_users_json: adAccountUsersRaw,
    admin_ad_account_raw_json: adAccountRaw ?? null,
  }

  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .update(updates)
    .eq('campaign_id', campaignId)
  if (error) throw error
}


