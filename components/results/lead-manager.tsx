'use client'

import { useCallback, useEffect, useState } from 'react'

import { LeadsTable } from '@/components/results/leads-table'
import { WebhookConfigCard } from '@/components/results/webhook-config-card'

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

export function LeadManager({ campaignId, goal }: LeadManagerProps) {
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfigResponse['config']>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  const isLeadGoal = (goal || '').toLowerCase() === 'leads'

  const loadWebhookConfig = useCallback(async () => {
    if (!campaignId) return
    setLoadingConfig(true)
    try {
      const response = await fetch(`/api/v1/meta/leads/webhook?campaignId=${encodeURIComponent(campaignId)}`, { 
        cache: 'no-store' 
      })
      if (response.ok) {
        const data = (await response.json()) as WebhookConfigResponse
        setWebhookConfig(data.config)
      }
    } catch (err) {
      console.warn('[LeadManager] Failed to load webhook config', err)
    } finally {
      setLoadingConfig(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (campaignId && isLeadGoal) {
      void loadWebhookConfig()
    }
  }, [campaignId, isLeadGoal, loadWebhookConfig])

  if (!isLeadGoal) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Leads Table with built-in filtering, sorting, pagination */}
      <LeadsTable campaignId={campaignId} />

      {/* Webhook Configuration */}
      {!loadingConfig && (
        <WebhookConfigCard campaignId={campaignId} initialConfig={webhookConfig} />
      )}
    </div>
  )
}
