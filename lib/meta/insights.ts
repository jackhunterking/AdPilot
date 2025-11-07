/**
 * Feature: Campaign Metrics Insights
 * Purpose: Fetch Meta Insights data, cache it in Supabase, and expose helpers for the Results tab.
 * References:
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights
 *  - Supabase Server Client: https://supabase.com/docs/reference/javascript/select
 */

import { supabaseServer } from '@/lib/supabase/server'
import { getConnectionWithToken, getGraphVersion } from '@/lib/meta/service'
import { getPublishStatus } from '@/lib/meta/publisher'

export type MetricsRangeKey = '7d' | '30d' | 'lifetime'
export type MetricsBreakdownType = 'age' | 'gender'

interface GraphInsightRow {
  date_start?: string
  date_stop?: string
  impressions?: string
  reach?: string
  clicks?: string
  ctr?: string
  cpc?: string
  cpm?: string
  spend?: string
  actions?: Array<{ action_type?: string; value?: string }>
}

interface GoalData {
  selectedGoal?: string | null
}

export interface CampaignMetricsSnapshot {
  campaign_id: string
  range_key: MetricsRangeKey
  impressions: number
  reach: number
  clicks: number
  spend: number
  results: number
  ctr: number | null
  cpc: number | null
  cpm: number | null
  cost_per_result: number | null
  date_start: string
  date_end: string
  cached_at: string
}

// Type alias for backward compatibility
export type CampaignMetrics = Omit<CampaignMetricsSnapshot, 'range_key' | 'campaign_id' | 'date_start' | 'date_end' | 'cached_at'> & {
  costPerResult: number | null
}

export interface TimelinePoint {
  date: string
  results: number
  spend: number
  reach: number
}

export interface MetricsBreakdownRow {
  label: string
  reach: number
  results: number
  spend: number
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function parseOptionalNumber(value: unknown): number | null {
  const parsed = parseNumber(value)
  return parsed === 0 && (value === null || value === undefined || value === '' || value === '0') ? null : parsed
}

function pickResultValue(actions: GraphInsightRow['actions'], goal: string | null): number {
  if (!Array.isArray(actions)) {
    return 0
  }

  const normalizedGoal = goal ? goal.toLowerCase() : null
  const priorities: string[] = (() => {
    switch (normalizedGoal) {
      case 'leads':
        return ['lead', 'on_facebook_lead', 'offsite_conversion.lead', 'onsite_conversion.lead_grouped']
      case 'calls':
        return ['call_click', 'onsite_conversion.messaging_phone_call']
      case 'website-visits':
        return ['link_click', 'landing_page_view', 'view_content']
      default:
        return ['lead', 'link_click', 'landing_page_view']
    }
  })()

  for (const priority of priorities) {
    const match = actions.find((action) => typeof action.action_type === 'string' && action.action_type.includes(priority))
    if (match) {
      return parseNumber(match.value)
    }
  }

  // fall back to first numeric value
  const firstAction = actions.find((action) => typeof action.value === 'string' && action.value.trim().length > 0)
  return firstAction ? parseNumber(firstAction.value) : 0
}

async function loadGoalType(campaignId: string): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from('campaign_states')
    .select('goal_data')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (error) {
    console.error('[MetaInsights] Failed to load goal data:', error)
    return null
  }

  const goalData = (data?.goal_data ?? null) as GoalData | null
  return goalData?.selectedGoal ?? null
}

function resolveDatePreset(range: MetricsRangeKey): string {
  switch (range) {
    case '30d':
      return 'last_30d'
    case 'lifetime':
      return 'lifetime'
    case '7d':
    default:
      return 'last_7d'
  }
}

export async function refreshCampaignMetrics(campaignId: string, range: MetricsRangeKey): Promise<CampaignMetricsSnapshot> {
  const publishStatus = await getPublishStatus(campaignId)
  if (!publishStatus || !publishStatus.metaCampaignId) {
    throw new Error('Campaign has not been published yet.')
  }

  const connection = await getConnectionWithToken({ campaignId })
  if (!connection || !connection.long_lived_user_token) {
    throw new Error('Missing Meta token. Please reconnect Meta before refreshing metrics.')
  }

  const graphVersion = getGraphVersion()
  const params = new URLSearchParams({
    level: 'campaign',
    fields: 'impressions,reach,clicks,ctr,cpc,cpm,spend,actions,date_start,date_stop',
    date_preset: resolveDatePreset(range),
    time_increment: 'all_days',
  })

  const url = `https://graph.facebook.com/${graphVersion}/${publishStatus.metaCampaignId}/insights?${params.toString()}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${connection.long_lived_user_token}` },
    cache: 'no-store',
  })

  const text = await response.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    const message = json && typeof json === 'object' && json !== null && 'error' in json && typeof (json as { error?: { message?: string } }).error?.message === 'string'
      ? (json as { error: { message: string } }).error.message
      : text || `Meta API error ${response.status}`
    throw new Error(message)
  }

  const dataArray = Array.isArray((json as { data?: unknown[] } | null)?.data)
    ? (json as { data: unknown[] }).data
    : []
  const insight = (dataArray[0] ?? null) as GraphInsightRow | null

  if (!insight) {
    throw new Error('Meta API returned no insight rows for this campaign.')
  }

  const goalType = await loadGoalType(campaignId)

  const impressions = parseNumber(insight.impressions)
  const reach = parseNumber(insight.reach)
  const clicks = parseNumber(insight.clicks)
  const spend = parseNumber(insight.spend)
  const results = pickResultValue(insight.actions, goalType ?? null)
  const ctr = parseOptionalNumber(insight.ctr)
  const cpc = parseOptionalNumber(insight.cpc)
  const cpm = parseOptionalNumber(insight.cpm)
  const costPerResult = results > 0 && spend > 0 ? Number((spend / results).toFixed(2)) : null

  const dateStart = insight.date_start ?? new Date().toISOString().slice(0, 10)
  const dateEnd = insight.date_stop ?? new Date().toISOString().slice(0, 10)
  const cachedAt = new Date().toISOString()

  const upsertPayload = {
    campaign_id: campaignId,
    range_key: range,
    impressions,
    reach,
    clicks,
    spend,
    results,
    ctr,
    cpc,
    cpm,
    cost_per_result: costPerResult,
    date_start: dateStart,
    date_end: dateEnd,
    cached_at: cachedAt,
    created_at: cachedAt,
  }

  const { error: upsertError } = await supabaseServer
    .from('campaign_metrics_cache')
    .upsert(upsertPayload, { onConflict: 'campaign_id,range_key,date_start,date_end' })

  if (upsertError) {
    console.error('[MetaInsights] Upsert error:', upsertError)
    throw new Error('Failed to cache metrics in Supabase.')
  }

  const { error: campaignUpdateError } = await supabaseServer
    .from('campaigns')
    .update({ last_metrics_sync_at: cachedAt })
    .eq('id', campaignId)

  if (campaignUpdateError) {
    console.error('[MetaInsights] Failed to update campaign sync timestamp:', campaignUpdateError)
  }

  return {
    campaign_id: campaignId,
    range_key: range,
    impressions,
    reach,
    clicks,
    spend,
    results,
    ctr,
    cpc,
    cpm,
    cost_per_result: costPerResult,
    date_start: dateStart,
    date_end: dateEnd,
    cached_at: cachedAt,
  }
}

export async function getCachedMetrics(campaignId: string, range: MetricsRangeKey): Promise<CampaignMetricsSnapshot | null> {
  const { data, error } = await supabaseServer
    .from('campaign_metrics_cache')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('range_key', range)
    .order('cached_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[MetaInsights] getCachedMetrics error:', error)
    throw new Error('Failed to load cached metrics.')
  }

  if (!data) {
    return null
  }

  return {
    campaign_id: data.campaign_id,
    range_key: data.range_key as MetricsRangeKey,
    impressions: parseNumber(data.impressions),
    reach: parseNumber(data.reach),
    clicks: parseNumber(data.clicks),
    spend: parseNumber(data.spend),
    results: parseNumber(data.results),
    ctr: data.ctr == null ? null : parseNumber(data.ctr),
    cpc: data.cpc == null ? null : parseNumber(data.cpc),
    cpm: data.cpm == null ? null : parseNumber(data.cpm),
    cost_per_result: data.cost_per_result == null ? null : parseNumber(data.cost_per_result),
    date_start: data.date_start,
    date_end: data.date_end,
    cached_at: data.cached_at,
  }
}

export async function fetchMetricsBreakdown(
  campaignId: string,
  type: MetricsBreakdownType,
  range: MetricsRangeKey = '7d'
): Promise<MetricsBreakdownRow[]> {
  const publishStatus = await getPublishStatus(campaignId)
  if (!publishStatus || !publishStatus.metaCampaignId) {
    throw new Error('Campaign has not been published yet.')
  }

  const connection = await getConnectionWithToken({ campaignId })
  if (!connection || !connection.long_lived_user_token) {
    throw new Error('Missing Meta token. Please reconnect Meta before requesting breakdowns.')
  }

  const graphVersion = getGraphVersion()
  const params = new URLSearchParams({
    level: 'campaign',
    fields: 'reach,spend,actions',
    date_preset: resolveDatePreset(range),
    breakdowns: type,
  })

  const url = `https://graph.facebook.com/${graphVersion}/${publishStatus.metaCampaignId}/insights?${params.toString()}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${connection.long_lived_user_token}` },
    cache: 'no-store',
  })

  const text = await response.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    const message = json && typeof json === 'object' && json !== null && 'error' in json && typeof (json as { error?: { message?: string } }).error?.message === 'string'
      ? (json as { error: { message: string } }).error.message
      : text || `Meta API error ${response.status}`
    throw new Error(message)
  }

  const dataArray = Array.isArray((json as { data?: unknown[] } | null)?.data)
    ? (json as { data: unknown[] }).data
    : []

  const goalType = await loadGoalType(campaignId)

  return dataArray.map((row) => {
    const record = row as Record<string, unknown>
    const labelKey = type === 'age' ? 'age' : 'gender'
    const labelRaw = typeof record[labelKey] === 'string' ? (record[labelKey] as string) : 'unknown'
    const reach = parseNumber(record.reach)
    const spend = parseNumber(record.spend)
    const actions = Array.isArray(record.actions) ? (record.actions as Array<{ action_type?: string; value?: string }>) : []
    const results = pickResultValue(actions, goalType)
    return {
      label: labelRaw,
      reach,
      spend,
      results,
    }
  })
}



