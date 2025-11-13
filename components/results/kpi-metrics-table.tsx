/**
 * Feature: KPI Metrics Table
 * Purpose: Display comprehensive campaign performance metrics in a single table
 * References:
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights
 *  - shadcn/ui Table: https://ui.shadcn.com/docs/components/table
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMetricValue } from '@/lib/utils/table-helpers'
import type { KPIMetricsRow } from '@/lib/types/workspace'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ColumnDefinition {
  key: keyof KPIMetricsRow
  label: string
  type: 'number' | 'currency' | 'percentage'
}

const COLUMNS: ColumnDefinition[] = [
  { key: 'impressions', label: 'Impressions', type: 'number' },
  { key: 'reach', label: 'Reach', type: 'number' },
  { key: 'clicks', label: 'Clicks', type: 'number' },
  { key: 'ctr', label: 'CTR', type: 'percentage' },
  { key: 'cpc', label: 'CPC', type: 'currency' },
  { key: 'cpm', label: 'CPM', type: 'currency' },
  { key: 'spend', label: 'Spend', type: 'currency' },
  { key: 'results', label: 'Results', type: 'number' },
  { key: 'cost_per_result', label: 'Cost per Result', type: 'currency' },
]

interface KPIMetricsTableProps {
  metrics: KPIMetricsRow | null
  loading?: boolean
  error?: string | null
  currency?: string
  onRefresh?: () => void
  lastSyncAt?: string | null
}

export function KPIMetricsTable({
  metrics,
  loading = false,
  error = null,
  currency = 'USD',
  onRefresh,
  lastSyncAt,
}: KPIMetricsTableProps) {
  // Loading state
  if (loading && !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Loading metrics data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error && !metrics) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="flex-1 space-y-1">
              <CardTitle className="text-red-900 dark:text-red-100">Unable to load metrics</CardTitle>
              <CardDescription className="text-red-700 dark:text-red-300">
                {error}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {onRefresh && (
          <CardContent>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        )}
      </Card>
    )
  }

  // Empty state
  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>
            No metrics available yet. Give the campaign a little more time, then refresh.
          </CardDescription>
        </CardHeader>
        {onRefresh && (
          <CardContent>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Metrics
            </Button>
          </CardContent>
        )}
      </Card>
    )
  }

  // Success state with data
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>
              Key performance indicators for your campaign
              {lastSyncAt && (
                <span className="ml-2 text-xs">
                  • Last updated {new Date(lastSyncAt).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column.key} className="whitespace-nowrap font-semibold">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {COLUMNS.map((column) => {
                  const value = metrics[column.key]
                  const formattedValue = formatMetricValue(value, column.type, currency)
                  
                  return (
                    <TableCell key={column.key} className="whitespace-nowrap font-medium">
                      {formattedValue}
                    </TableCell>
                  )
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        {/* Mobile-friendly card view for small screens */}
        <div className="mt-4 grid gap-3 sm:hidden">
          {COLUMNS.map((column) => {
            const value = metrics[column.key]
            const formattedValue = formatMetricValue(value, column.type, currency)
            
            return (
              <div key={column.key} className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                <span className="text-sm font-medium text-muted-foreground">{column.label}</span>
                <span className="text-base font-semibold">{formattedValue}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

