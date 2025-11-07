'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw, Loader2 } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

import { useCampaignContext } from '@/lib/context/campaign-context'
import { useBudget } from '@/lib/context/budget-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { CampaignMetrics, TimelinePoint } from '@/lib/meta/insights'
import { LeadManager } from '@/components/results/lead-manager'

interface MetricsApiResponse {
  metrics: CampaignMetrics
  cachedAt: string
  dateRange: string
  dateStart: string
  dateEnd: string
  source: 'cache' | 'live'
  timeline: TimelinePoint[]
}

type ResultGoal = 'leads' | 'calls' | 'website-visits' | string | null | undefined

type WorkspaceState = {
  loading: boolean
  error: string | null
  metrics: CampaignMetrics | null
  timeline: TimelinePoint[]
  cachedAt: string | null
  source: 'cache' | 'live' | null
}

const numberFormatter = Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

function getCurrencyFormatter(currency: string) {
  try {
    return Intl.NumberFormat('en-US', { style: 'currency', currency })
  } catch {
    return Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
  }
}

function getResultLabel(goal: ResultGoal): { label: string; action: string } {
  switch (goal) {
    case 'leads':
      return { label: 'Leads Collected', action: 'filled out your form' }
    case 'calls':
      return { label: 'Calls Received', action: 'called your business' }
    case 'website-visits':
      return { label: 'Website Visits', action: 'visited your website' }
    default:
      return { label: 'People Who Responded', action: 'took action after seeing your ad' }
  }
}

function prettify(value: number | null, formatter: Intl.NumberFormat, fallback = 'Not enough data yet') {
  if (value === null || Number.isNaN(value)) {
    return fallback
  }
  return formatter.format(value)
}

function buildSummary(metrics: CampaignMetrics, actionPhrase: string): string {
  if (metrics.results > 0 && metrics.reach > 0) {
    const rate = (metrics.results / metrics.reach) * 100
    return `About ${numberFormatter.format(metrics.results)} people ${actionPhrase}. That’s roughly ${rate.toFixed(1)}% of everyone who saw your ad.`
  }

  if (metrics.reach > 0) {
    return `Your ad has reached ${numberFormatter.format(metrics.reach)} people so far. No one has responded yet, but this is common during the first few hours—try checking back later.`
  }

  return `We’re waiting on Meta to deliver your ad. Once people start seeing it, we’ll summarize the results for you here.`
}

function mapTimeline(timeline: TimelinePoint[]): Array<{ date: string; results: number; spend: number; reach: number }> {
  return timeline
    .filter((point) => Boolean(point.date))
    .map((point) => ({
      date: point.date,
      results: point.results,
      spend: Math.round(point.spend * 100) / 100,
      reach: point.reach,
    }))
}

function TimelineTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const spendEntry = payload.find((item: { name?: string }) => item.name === 'Spend')
  const resultsEntry = payload.find((item: { name?: string }) => item.name === 'Results')
  const reachEntry = payload.find((item: { name?: string }) => item.name === 'Reach')

  return (
    <div className="rounded-md border bg-card/95 px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{label}</p>
      {resultsEntry ? <p>{`People responded: ${numberFormatter.format(resultsEntry.value ?? 0)}`}</p> : null}
      {reachEntry ? <p>{`People reached: ${numberFormatter.format(reachEntry.value ?? 0)}`}</p> : null}
      {spendEntry ? <p>{`Amount spent: $${Number(spendEntry.value ?? 0).toFixed(2)}`}</p> : null}
    </div>
  )
}

export function AnalyticsPanel() {
  const { campaign } = useCampaignContext()
  const { budgetState } = useBudget()
  const [state, setState] = useState<WorkspaceState>({
    loading: false,
    error: null,
    metrics: null,
    timeline: [],
    cachedAt: null,
    source: null,
  })

  const campaignId = campaign?.id
  const analyticsEnabled = (campaign?.published_status ?? '').toLowerCase() === 'active'
  const goalInfo = getResultLabel(campaign?.initial_goal)
  const currencyFormatter = useMemo(() => getCurrencyFormatter(budgetState.currency || 'USD'), [budgetState.currency])

  const fetchMetrics = useCallback(async (forceRefresh: boolean) => {
    if (!campaignId) return
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const params = new URLSearchParams({ campaignId, dateRange: '7d' })
      if (forceRefresh) {
        params.set('refresh', 'true')
      }
      const response = await fetch(`/api/meta/metrics?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to load metrics')
      }
      const data = (await response.json()) as MetricsApiResponse
      setState({
        loading: false,
        error: null,
        metrics: data.metrics,
        timeline: data.timeline ?? [],
        cachedAt: data.cachedAt,
        source: data.source ?? 'live',
      })
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load metrics',
        metrics: null,
        timeline: [],
        cachedAt: null,
        source: null,
      })
    }
  }, [campaignId])

  useEffect(() => {
    if (!analyticsEnabled) {
      setState((prev) => ({ ...prev, metrics: null, timeline: [], cachedAt: null }))
      return
    }
    void fetchMetrics(false)
  }, [analyticsEnabled, fetchMetrics])

  if (!analyticsEnabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
        <p>Your campaign is still in draft mode.</p>
        <p>Publish it to unlock real-time results.</p>
      </div>
    )
  }

  if (state.loading && !state.metrics) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Fetching your latest results…
      </div>
    )
  }

  if (state.error && !state.metrics) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">{state.error}</p>
        <Button onClick={() => fetchMetrics(true)} variant="secondary" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    )
  }

  const metrics = state.metrics
  const timelineData = mapTimeline(state.timeline)
  const lastUpdatedLabel = state.cachedAt
    ? `Updated ${formatDistanceToNow(new Date(state.cachedAt), { addSuffix: true })}`
    : 'Waiting for first results'
  const sourceLabel = state.source === 'cache' ? 'Showing cached data' : 'Showing live data'
  const summary = metrics ? buildSummary(metrics, goalInfo.action) : ''

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Results Overview</h2>
          <p className="text-sm text-muted-foreground">
            Plain-language metrics for the last 7 days. {sourceLabel}.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
          <span>{lastUpdatedLabel}</span>
          <Button size="sm" variant="outline" onClick={() => fetchMetrics(true)} disabled={state.loading}>
            <RefreshCw className={state.loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh
          </Button>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      {metrics ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="People Reached" value={numberFormatter.format(metrics.reach)} description="How many people saw your ad." />
          <MetricCard
            title={goalInfo.label}
            value={numberFormatter.format(metrics.results)}
            description={`People who ${goalInfo.action}.`}
          />
          <MetricCard
            title="Amount Spent"
            value={currencyFormatter.format(metrics.spend)}
            description="What Meta has billed so far."
          />
          <MetricCard
            title="Cost per Result"
            value={metrics.costPerResult !== null ? currencyFormatter.format(metrics.costPerResult) : 'Not enough data yet'}
            description={metrics.costPerResult !== null ? 'Average cost for each response.' : 'We need at least one response to calculate this.'}
          />
          <MetricCard
            title="People Who Clicked"
            value={numberFormatter.format(metrics.clicks)}
            description="How many people tapped or clicked your ad."
          />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
          <CardDescription>Daily results for the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip content={<TimelineTooltip />} />
                  <Line type="monotone" dataKey="results" name="Results" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reach" name="Reach" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="spend" name="Spend" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">We’ll chart your performance here once Meta shares daily results.</p>
          )}
        </CardContent>
      </Card>

      {metrics ? (
        <Card>
          <CardHeader>
            <CardTitle>What this means</CardTitle>
            <CardDescription>Your assistant’s plain-language take on the numbers.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{summary}</p>
          </CardContent>
        </Card>
      ) : null}

      {campaignId ? <LeadManager campaignId={campaignId} goal={campaign?.initial_goal ?? null} /> : null}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  description: string
}

function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
