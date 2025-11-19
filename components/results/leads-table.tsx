/**
 * Feature: Enhanced Leads Table
 * Purpose: Display lead form submissions with sorting, filtering, and pagination
 * References:
 *  - Meta Leads API: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *  - shadcn/ui Table: https://ui.shadcn.com/docs/components/table
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TablePagination } from '@/components/results/table-pagination'
import { TableSearchFilter } from '@/components/results/table-search-filter'
import { formatDateTime, formatFieldValue } from '@/lib/utils/table-helpers'
import type { LeadTableRow, TableFilterConfig, TableSortConfig, PaginationState } from '@/lib/types/workspace'
import { ArrowDown, ArrowUp, Download, RefreshCw, Loader2 } from 'lucide-react'

interface LeadsTableProps {
  campaignId: string
  onRefresh?: () => void
}

interface LeadsResponse {
  data: LeadTableRow[]
  pagination: PaginationState
  columns: string[]
}

export function LeadsTable({ campaignId, onRefresh }: LeadsTableProps) {
  const [leads, setLeads] = useState<LeadTableRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  })
  const [sortConfig, setSortConfig] = useState<TableSortConfig>({
    column: 'submitted_at',
    order: 'desc',
  })
  const [filterConfig, setFilterConfig] = useState<TableFilterConfig>({
    search: '',
    dateFrom: null,
    dateTo: null,
  })
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLeads = useCallback(async () => {
    if (!campaignId) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        campaignId,
        page: String(pagination.currentPage),
        pageSize: String(pagination.pageSize),
        sortBy: sortConfig.column,
        sortOrder: sortConfig.order,
      })

      if (filterConfig.search) {
        params.set('search', filterConfig.search)
      }
      if (filterConfig.dateFrom) {
        params.set('dateFrom', filterConfig.dateFrom)
      }
      if (filterConfig.dateTo) {
        params.set('dateTo', filterConfig.dateTo)
      }

      const response = await fetch(`/api/v1/leads?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to load leads')
      }

      const data: LeadsResponse = await response.json()
      setLeads(data.data)
      setColumns(data.columns)
      setPagination(data.pagination)
    } catch (err) {
      console.error('[LeadsTable] Load error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [campaignId, pagination.currentPage, pagination.pageSize, sortConfig, filterConfig])

  useEffect(() => {
    void loadLeads()
  }, [loadLeads])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadLeads()
    setRefreshing(false)
    onRefresh?.()
  }

  const handleSort = (column: string) => {
    setSortConfig((prev) => ({
      column,
      order: prev.column === column && prev.order === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize,
      currentPage: 1, // Reset to first page when changing page size
    }))
  }

  const handleExport = (format: 'csv' | 'json') => {
    const params = new URLSearchParams({
      campaignId,
      format,
      sortBy: sortConfig.column,
      sortOrder: sortConfig.order,
    })

    if (filterConfig.search) {
      params.set('search', filterConfig.search)
    }
    if (filterConfig.dateFrom) {
      params.set('dateFrom', filterConfig.dateFrom)
    }
    if (filterConfig.dateTo) {
      params.set('dateTo', filterConfig.dateTo)
    }

    const url = `/api/v1/leads/export?${params.toString()}`
    window.open(url, '_blank')
  }

  const renderSortIcon = (column: string) => {
    if (sortConfig.column !== column) return null
    return sortConfig.order === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    )
  }

  // Error state
  if (error && leads.length === 0) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
        <CardHeader>
          <CardTitle className="text-red-900 dark:text-red-100">Failed to load leads</CardTitle>
          <CardDescription className="text-red-700 dark:text-red-300">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Lead Inbox</CardTitle>
            <CardDescription>
              Every Meta form submission appears here within a few minutes.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and filters */}
        <TableSearchFilter
          filterConfig={filterConfig}
          onFilterChange={setFilterConfig}
          showDateFilters={true}
          placeholder="Search leads..."
        />

        {/* Empty state */}
        {leads.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No leads yet</h3>
              <p className="text-sm text-muted-foreground">
                As soon as people submit your form, they'll appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap font-semibold"
                      onClick={() => handleSort('submitted_at')}
                    >
                      <div className="flex items-center">
                        Submitted
                        {renderSortIcon('submitted_at')}
                      </div>
                    </TableHead>
                    {columns.map((column) => (
                      <TableHead
                        key={column}
                        className="whitespace-nowrap font-semibold"
                      >
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(lead.submitted_at)}
                      </TableCell>
                      {columns.map((column) => (
                        <TableCell key={column} className="whitespace-nowrap">
                          {formatFieldValue(lead.form_data?.[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <TablePagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

