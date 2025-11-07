/**
 * Feature: Lead synchronization
 * Purpose: Fetch Meta instant form leads, persist them in Supabase, and expose utilities for export/webhooks.
 * References:
 *  - Meta Graph API Leads: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *  - Supabase Server Client: https://supabase.com/docs/reference/javascript/select
 */

import { createHmac } from 'crypto'

import { supabaseServer } from '@/lib/supabase/server'
import { getConnectionWithToken, getGraphVersion } from '@/lib/meta/service'

interface MetaLeadField {
  name?: string
  values?: string[]
}

interface MetaLeadResponse {
  id?: string
  created_time?: string
  field_data?: MetaLeadField[]
}

export interface LeadRecord {
  id: string
  campaign_id: string
  meta_form_id: string
  meta_lead_id: string
  form_data: Record<string, unknown>
  submitted_at: string
  exported_at: string | null
  webhook_sent: boolean
  webhook_sent_at: string | null
}

export interface WebhookConfig {
  webhook_url: string
  secret_key: string | null
  events: string[]
  active: boolean
  last_triggered_at: string | null
  last_status_code: number | null
  last_error_message: string | null
}

function mapFieldDataToRecord(data: MetaLeadField[] | undefined): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  if (!Array.isArray(data)) {
    return record
  }
  data.forEach((field, index) => {
    const key = field.name && field.name.trim().length > 0 ? field.name : `field_${index + 1}`
    if (Array.isArray(field.values)) {
      record[key] = field.values.length === 1 ? field.values[0] : field.values.join(', ')
    }
  })
  return record
}

async function getLeadFormId(campaignId: string): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from('campaign_states')
    .select('goal_data')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (error) {
    console.error('[LeadService] Failed to load goal data:', error)
    return null
  }

  const goalData = (data?.goal_data ?? null) as { formData?: { id?: string } } | null
  const formId = goalData?.formData?.id
  return typeof formId === 'string' && formId.length > 0 ? formId : null
}

export async function refreshLeadsFromMeta(campaignId: string): Promise<{ inserted: number; total: number }> {
  const formId = await getLeadFormId(campaignId)
  if (!formId) {
    throw new Error('No Meta lead form connected to this campaign.')
  }

  const connection = await getConnectionWithToken({ campaignId })
  if (!connection || !connection.long_lived_user_token) {
    throw new Error('Missing Meta token. Please reconnect Meta before refreshing leads.')
  }

  const graphVersion = getGraphVersion()
  const params = new URLSearchParams({ fields: 'id,created_time,field_data', limit: '200' })
  const url = `https://graph.facebook.com/${graphVersion}/${formId}/leads?${params.toString()}`

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

  const leads = Array.isArray((json as { data?: unknown[] } | null)?.data)
    ? (json as { data: unknown[] }).data as MetaLeadResponse[]
    : []

  if (leads.length === 0) {
    return { inserted: 0, total: 0 }
  }

  const rows = leads
    .map((lead) => {
      const metaLeadId = typeof lead.id === 'string' ? lead.id : null
      const createdTime = typeof lead.created_time === 'string' ? lead.created_time : null
      if (!metaLeadId || !createdTime) {
        return null
      }
      return {
        campaign_id: campaignId,
        meta_form_id: formId,
        meta_lead_id: metaLeadId,
        form_data: mapFieldDataToRecord(lead.field_data),
        submitted_at: new Date(createdTime).toISOString(),
      }
    })
    .filter((row): row is { campaign_id: string; meta_form_id: string; meta_lead_id: string; form_data: Record<string, unknown>; submitted_at: string } => Boolean(row))

  if (rows.length === 0) {
    return { inserted: 0, total: leads.length }
  }

  const { error: upsertError } = await supabaseServer
    .from('lead_form_submissions')
    .upsert(rows, { onConflict: 'meta_lead_id' })

  if (upsertError) {
    throw new Error(upsertError.message)
  }

  return { inserted: rows.length, total: leads.length }
}

export async function getStoredLeads(campaignId: string): Promise<LeadRecord[]> {
  const { data, error } = await supabaseServer
    .from('lead_form_submissions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('submitted_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data as LeadRecord[]) ?? []
}

export function formatLeadsAsCsv(leads: LeadRecord[]): string {
  if (leads.length === 0) {
    return 'Submitted At\n'
  }

  const fieldKeys = new Set<string>()
  leads.forEach((lead) => {
    Object.keys(lead.form_data ?? {}).forEach((key) => fieldKeys.add(key))
  })

  const headers = ['Submitted At', ...Array.from(fieldKeys)]
  const rows = leads.map((lead) => {
    const base = [new Date(lead.submitted_at).toISOString()]
    Array.from(fieldKeys).forEach((key) => {
      const value = lead.form_data?.[key]
      base.push(typeof value === 'string' ? value.replace(/\n/g, ' ') : value == null ? '' : String(value))
    })
    return base
  })

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export async function getWebhookConfig(campaignId: string): Promise<WebhookConfig | null> {
  const { data, error } = await supabaseServer
    .from('crm_webhooks')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return {
    webhook_url: data.webhook_url,
    secret_key: data.secret_key,
    events: data.events ?? ['lead_received'],
    active: data.active,
    last_triggered_at: data.last_triggered_at,
    last_status_code: data.last_status_code,
    last_error_message: data.last_error_message,
  }
}

export async function upsertWebhookConfig(campaignId: string, config: { webhookUrl: string; secretKey?: string | null; events?: string[]; active?: boolean }) {
  if (!config.webhookUrl || !config.webhookUrl.startsWith('http')) {
    throw new Error('Webhook URL must start with http or https')
  }

  const payload = {
    campaign_id: campaignId,
    webhook_url: config.webhookUrl,
    secret_key: config.secretKey ?? null,
    events: config.events && config.events.length > 0 ? config.events : ['lead_received'],
    active: config.active ?? true,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseServer
    .from('crm_webhooks')
    .upsert(payload, { onConflict: 'campaign_id' })

  if (error) {
    throw new Error(error.message)
  }
}

function buildWebhookPayload(campaignId: string, lead: LeadRecord) {
  return {
    type: 'lead_received',
    campaign_id: campaignId,
    lead: {
      id: lead.meta_lead_id,
      submitted_at: lead.submitted_at,
      form_id: lead.meta_form_id,
      data: lead.form_data,
    },
  }
}

function createSignature(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function sendWebhookTest(campaignId: string, config: WebhookConfig) {
  if (!config.webhook_url) {
    throw new Error('Webhook URL is required')
  }

  const leads = await getStoredLeads(campaignId)
  const sampleLead = leads[0] ?? {
    id: 'sample',
    campaign_id: campaignId,
    meta_form_id: 'form_sample',
    meta_lead_id: 'sample_lead',
    form_data: { full_name: 'Test Lead', email: 'test@example.com' },
    submitted_at: new Date().toISOString(),
    exported_at: null,
    webhook_sent: false,
    webhook_sent_at: null,
  }

  const payload = buildWebhookPayload(campaignId, sampleLead)
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.secret_key) {
    headers['x-adpilot-signature'] = createSignature(config.secret_key, body)
  }

  const response = await fetch(config.webhook_url, {
    method: 'POST',
    headers,
    body,
  })

  const text = await response.text().catch(() => '')

  if (!response.ok) {
    throw new Error(text || `Webhook responded with status ${response.status}`)
  }

  return { status: response.status, body: text }
}
