'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Download, Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface LeadRow {
  id: string
  meta_lead_id: string
  meta_form_id: string
  submitted_at: string
  form_data: Record<string, unknown>
}

interface LeadsResponse {
  leads: LeadRow[]
}

interface WebhookConfigResponse {
  config: {
    webhook_url: string
    secret_key: string | null
    events: string[]
    active: boolean
    last_triggered_at: string | null
    last_status_code: number | null
    last_error_message: string | null
  } | null
}

interface LeadManagerProps {
  campaignId: string
  goal: string | null | undefined
}

const dateFormatter = Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function LeadManager({ campaignId, goal }: LeadManagerProps) {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leadMessage, setLeadMessage] = useState<string | null>(null)

  const [webhookUrl, setWebhookUrl] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [webhookActive, setWebhookActive] = useState(true)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookFeedback, setWebhookFeedback] = useState<string | null>(null)

  const isLeadGoal = (goal || '').toLowerCase() === 'leads'

  const loadLeads = useCallback(async () => {
    if (!campaignId) return
    setLoadingLeads(true)
    setError(null)
    try {
      const response = await fetch(`/api/meta/leads?campaignId=${encodeURIComponent(campaignId)}`, { cache: 'no-store' })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to load leads')
      }
      const data = (await response.json()) as LeadsResponse
      setLeads(data.leads ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoadingLeads(false)
    }
  }, [campaignId])

  const loadWebhookConfig = useCallback(async () => {
    if (!campaignId) return
    try {
      const response = await fetch(`/api/meta/leads/webhook?campaignId=${encodeURIComponent(campaignId)}`, { cache: 'no-store' })
      if (!response.ok) {
        return
      }
      const data = (await response.json()) as WebhookConfigResponse
      if (data.config) {
        setWebhookUrl(data.config.webhook_url)
        setSecretKey(data.config.secret_key ?? '')
        setWebhookActive(data.config.active)
      }
    } catch (err) {
      console.warn('[LeadManager] Failed to load webhook config', err)
    }
  }, [campaignId])

  useEffect(() => {
    if (!campaignId || !isLeadGoal) {
      return
    }
    void loadLeads()
    void loadWebhookConfig()
  }, [campaignId, isLeadGoal, loadLeads, loadWebhookConfig])

  const handleRefreshFromMeta = async () => {
    if (!campaignId) return
    setRefreshing(true)
    setLeadMessage(null)
    try {
      const response = await fetch('/api/meta/leads/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to refresh leads')
      }
      setLeadMessage(`Imported ${json.inserted ?? 0} of ${json.total ?? 0} leads from Meta.`)
      await loadLeads()
    } catch (err) {
      setLeadMessage(err instanceof Error ? err.message : 'Failed to refresh leads')
    } finally {
      setRefreshing(false)
    }
  }

  const columns = useMemo(() => {
    const set = new Set<string>()
    leads.forEach((lead) => {
      Object.keys(lead.form_data ?? {}).forEach((key) => set.add(key))
    })
    return Array.from(set)
  }, [leads])

  const handleExport = (format: 'csv' | 'json') => {
    const url = new URL('/api/meta/leads/export', window.location.origin)
    url.searchParams.set('campaignId', campaignId)
    url.searchParams.set('format', format)
    window.open(url.toString(), '_blank')
  }

  const handleSaveWebhook = async () => {
    if (!campaignId) return
    setSavingWebhook(true)
    setWebhookFeedback(null)
    try {
      const response = await fetch('/api/meta/leads/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          webhookUrl,
          secretKey: secretKey.length > 0 ? secretKey : null,
          events: ['lead_received'],
          active: webhookActive,
        }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to save webhook settings')
      }
      setWebhookFeedback('Webhook settings saved.')
    } catch (err) {
      setWebhookFeedback(err instanceof Error ? err.message : 'Failed to save webhook settings')
    } finally {
      setSavingWebhook(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!campaignId) return
    setTestingWebhook(true)
    setWebhookFeedback(null)
    try {
      const response = await fetch('/api/meta/leads/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Webhook test failed')
      }
      setWebhookFeedback('We just sent a sample lead to your webhook.')
    } catch (err) {
      setWebhookFeedback(err instanceof Error ? err.message : 'Webhook test failed')
    } finally {
      setTestingWebhook(false)
    }
  }

  if (!isLeadGoal) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Lead Inbox</CardTitle>
            <CardDescription>Every Meta form submission appears here within a few minutes.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download className="mr-2 h-4 w-4" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button size="sm" onClick={handleRefreshFromMeta} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh from Meta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {leadMessage ? <p className="text-sm text-muted-foreground">{leadMessage}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="border-b px-3 py-2 font-medium text-muted-foreground">Submitted</th>
                  {columns.map((column) => (
                    <th key={column} className="border-b px-3 py-2 font-medium text-muted-foreground">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingLeads ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                      Loading leads…
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                      No leads yet. As soon as people submit your form, they’ll appear here.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 align-top text-muted-foreground">
                        {dateFormatter.format(new Date(lead.submitted_at))}
                      </td>
                      {columns.map((column) => (
                        <td key={column} className="px-3 py-2 align-top">
                          {lead.form_data?.[column] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CRM Webhook</CardTitle>
          <CardDescription>Send every new lead to your CRM or Slack webhook in real time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://your-crm.com/webhook"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Signing secret (optional)</Label>
            <Input
              id="webhook-secret"
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
              placeholder="Used to sign webhook requests"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="webhook-active" checked={webhookActive} onCheckedChange={setWebhookActive} />
            <Label htmlFor="webhook-active">Send webhooks for new leads</Label>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={handleSaveWebhook} disabled={savingWebhook || webhookUrl.trim().length === 0}>
              {savingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save settings
            </Button>
            <Button variant="outline" onClick={handleTestWebhook} disabled={testingWebhook || webhookUrl.trim().length === 0}>
              {testingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send test lead
            </Button>
            {webhookFeedback && webhookUrl.trim().length > 0 ? (
              <span className="text-sm text-muted-foreground">{webhookFeedback}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
