'use client'

import { useMemo, useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCampaignContext } from '@/lib/context/campaign-context'

function toInputDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

interface BudgetState {
  dailyBudget: number
  startTime?: string | null
  endTime?: string | null
}

export function CampaignEditor() {
  const { campaign } = useCampaignContext()
  const campaignId = campaign?.id ?? null
  const initialBudget = useMemo(() => {
    // Budget now stored in campaigns.campaign_budget_cents (campaign_states table removed)
    const budgetCents = campaign?.campaign_budget_cents ?? null
    return {
      dailyBudget: typeof budgetCents === 'number' ? budgetCents / 100 : 20,
      startTime: null, // Schedule data not yet migrated
      endTime: null, // Schedule data not yet migrated
    }
  }, [campaign?.campaign_budget_cents])

  const [budget, setBudget] = useState<BudgetState>(initialBudget)
  const [savingBudget, setSavingBudget] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!campaignId) {
    return null
  }

  const handleBudgetSave = async () => {
    setSavingBudget(true)
    setFeedback(null)
    try {
      const response = await fetch(`/api/v1/campaigns/${campaignId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyBudget: budget.dailyBudget,
          startTime: budget.startTime ?? null,
          endTime: budget.endTime ?? null,
        }),
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to update budget')
      }
      setFeedback('Budget updated successfully. Meta will use the new amount within a few minutes.')
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to update budget')
    } finally {
      setSavingBudget(false)
    }
  }

  const handleBudgetReset = () => {
    setBudget(initialBudget)
    setFeedback(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Pencil className="h-4 w-4 text-muted-foreground" />
          Edit campaign setup
        </CardTitle>
        <CardDescription>Fine-tune live campaigns without leaving the Results tab.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue="budget">
          <AccordionItem value="budget">
            <AccordionTrigger className="text-left">
              Budget & schedule
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="daily-budget">Daily budget</label>
                  <Input
                    id="daily-budget"
                    type="number"
                    min={1}
                    value={budget.dailyBudget}
                    onChange={(event) => setBudget((prev) => ({ ...prev, dailyBudget: Number(event.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Update the average amount you want to spend each day.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="start-time">Start time (optional)</label>
                    <Input
                      id="start-time"
                      type="datetime-local"
                      value={toInputDateTime(budget.startTime)}
                      onChange={(event) => setBudget((prev) => ({ ...prev, startTime: toIsoOrNull(event.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="end-time">End time (optional)</label>
                    <Input
                      id="end-time"
                      type="datetime-local"
                      value={toInputDateTime(budget.endTime)}
                      onChange={(event) => setBudget((prev) => ({ ...prev, endTime: toIsoOrNull(event.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleBudgetSave} disabled={savingBudget}>
                    {savingBudget ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                  <Button variant="ghost" onClick={handleBudgetReset} disabled={savingBudget}>
                    Reset
                  </Button>
                  {feedback ? <span className="text-sm text-muted-foreground">{feedback}</span> : null}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="location" disabled>
            <AccordionTrigger className="text-left opacity-60">
              Locations (coming soon)
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Location tweaks from the Results tab are coming soon. For now, switch to the Setup tab to change locations.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="creative" disabled>
            <AccordionTrigger className="text-left opacity-60">
              Creative updates (coming soon)
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Ask the AI chat on the left to refresh your copy or creative. We’ll surface quick-edit controls right here in a future update.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
