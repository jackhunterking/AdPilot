/**
 * Feature: CRM Webhook Configuration Card
 * Purpose: Configure webhook settings for real-time lead notifications
 * References:
 *  - shadcn/ui Card: https://ui.shadcn.com/docs/components/card
 *  - shadcn/ui Input: https://ui.shadcn.com/docs/components/input
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Send } from 'lucide-react'

interface WebhookConfig {
  webhook_url: string
  secret_key: string | null
  events: string[]
  active: boolean
  last_triggered_at: string | null
  last_status_code: number | null
  last_error_message: string | null
}

interface WebhookConfigCardProps {
  campaignId: string
  initialConfig?: WebhookConfig | null
}

export function WebhookConfigCard({ campaignId, initialConfig }: WebhookConfigCardProps) {
  const [webhookUrl, setWebhookUrl] = useState(initialConfig?.webhook_url || '')
  const [secretKey, setSecretKey] = useState(initialConfig?.secret_key || '')
  const [webhookActive, setWebhookActive] = useState(initialConfig?.active ?? true)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookFeedback, setWebhookFeedback] = useState<string | null>(null)

  const handleSaveWebhook = async () => {
    if (!campaignId) return
    setSavingWebhook(true)
    setWebhookFeedback(null)
    try {
      const response = await fetch('/api/v1/meta/leads/webhook', {
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
      // TODO: Migrate to v1 API - test webhook endpoint not yet implemented
      // For now, show a message that testing is not available
      setWebhookFeedback('Webhook testing is currently unavailable. Your webhook will receive real leads when they come in.')
      setTestingWebhook(false)
      return
      
      // const response = await fetch('/api/v1/meta/leads/test-webhook', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ campaignId }),
      // })
      // if (!response.ok) {
      //   const text = await response.text()
      //   throw new Error(text || 'Webhook test failed')
      // }
      // setWebhookFeedback('We just sent a sample lead to your webhook.')
    } catch (err) {
      setWebhookFeedback(err instanceof Error ? err.message : 'Webhook test failed')
    } finally {
      setTestingWebhook(false)
    }
  }

  return (
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
  )
}

