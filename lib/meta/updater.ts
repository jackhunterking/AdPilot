/**
 * Feature: Meta campaign updater
 * Purpose: Apply post-launch edits (budget, schedule) to Meta ad sets and persist to Supabase state.
 * References:
 *  - Meta Ad Set Update: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign#Updating
 *  - Supabase Server Client: https://supabase.com/docs/reference/javascript/update
 */

import { supabaseServer } from '@/lib/supabase/server'
import { getConnectionWithToken, getGraphVersion } from '@/lib/meta/service'
import { getPublishStatus } from '@/lib/meta/publisher'
import type { Json } from '@/lib/supabase/database.types'

interface BudgetUpdateInput {
  campaignId: string
  dailyBudget: number
  startTime?: string | null
  endTime?: string | null
}

function encodePayload(payload: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    params.append(key, String(value))
  })
  return params
}

export async function updateBudgetAndSchedule({ campaignId, dailyBudget, startTime, endTime }: BudgetUpdateInput) {
  if (dailyBudget <= 0) {
    throw new Error('Daily budget must be greater than zero')
  }

  const publishStatus = await getPublishStatus(campaignId)
  if (!publishStatus || !publishStatus.metaAdSetId || publishStatus.publishStatus !== 'active') {
    throw new Error('Campaign must be active before editing the budget')
  }

  const connection = await getConnectionWithToken({ campaignId })
  if (!connection || !connection.long_lived_user_token) {
    throw new Error('Missing Meta token. Please reconnect Meta before editing the budget.')
  }

  const graphVersion = getGraphVersion()
  const url = `https://graph.facebook.com/${graphVersion}/${publishStatus.metaAdSetId}`

  const payload: Record<string, unknown> = {
    daily_budget: Math.round(dailyBudget * 100),
  }

  if (startTime) {
    payload.start_time = new Date(startTime).toISOString()
  }
  if (endTime) {
    payload.end_time = new Date(endTime).toISOString()
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.long_lived_user_token}`,
    },
    body: encodePayload(payload),
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

  // Load current budget from campaigns table (campaign_states removed)
  const { data: campaign } = await supabaseServer
    .from('campaigns')
    .select('campaign_budget_cents, metadata')
    .eq('id', campaignId)
    .maybeSingle()

  const metadata = (campaign?.metadata as Record<string, unknown>) || {}
  const currentBudget = (metadata.budget_data as Record<string, unknown>) || {}
  
  const previousStart =
    'startTime' in currentBudget && typeof currentBudget.startTime === 'string'
      ? (currentBudget.startTime as string)
      : null
  const previousEnd =
    'endTime' in currentBudget && typeof currentBudget.endTime === 'string'
      ? (currentBudget.endTime as string)
      : null

  const nextBudget = {
    ...currentBudget,
    dailyBudget,
    startTime: startTime ?? previousStart ?? null,
    endTime: endTime ?? previousEnd ?? null,
  } satisfies Record<string, Json>

  // Update budget in campaigns table
  const { error: updateError } = await supabaseServer
    .from('campaigns')
    .update({
      campaign_budget_cents: dailyBudget * 100, // Store in cents
      metadata: {
        ...metadata,
        budget_data: nextBudget
      }
    })
    .eq('id', campaignId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  return nextBudget
}
