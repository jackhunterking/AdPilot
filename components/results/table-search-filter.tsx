/**
 * Feature: Table Search and Filter Controls
 * Purpose: Reusable search input with debounced onChange and date range filtering
 * References:
 *  - shadcn/ui Input: https://ui.shadcn.com/docs/components/input
 *  - shadcn/ui Button: https://ui.shadcn.com/docs/components/button
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { debounce } from '@/lib/utils/table-helpers'
import type { TableFilterConfig } from '@/lib/types/workspace'
import { Search, X } from 'lucide-react'

interface TableSearchFilterProps {
  filterConfig: TableFilterConfig
  onFilterChange: (config: TableFilterConfig) => void
  showDateFilters?: boolean
  placeholder?: string
}

export function TableSearchFilter({
  filterConfig,
  onFilterChange,
  showDateFilters = true,
  placeholder = 'Search...',
}: TableSearchFilterProps) {
  const [searchInput, setSearchInput] = useState(filterConfig.search)

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      onFilterChange({ ...filterConfig, search: value })
    }, 300),
    [filterConfig]
  )

  useEffect(() => {
    debouncedSearch(searchInput)
  }, [searchInput, debouncedSearch])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  const handleDateFromChange = (value: string) => {
    onFilterChange({
      ...filterConfig,
      dateFrom: value || null,
    })
  }

  const handleDateToChange = (value: string) => {
    onFilterChange({
      ...filterConfig,
      dateTo: value || null,
    })
  }

  const handleClearFilters = () => {
    setSearchInput('')
    onFilterChange({
      search: '',
      dateFrom: null,
      dateTo: null,
    })
  }

  const hasActiveFilters =
    searchInput.length > 0 ||
    filterConfig.dateFrom !== null ||
    filterConfig.dateTo !== null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Search input */}
        <div className="flex-1 space-y-2">
          <Label htmlFor="search" className="text-sm font-medium">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder={placeholder}
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Date filters */}
        {showDateFilters && (
          <>
            <div className="space-y-2 sm:w-[180px]">
              <Label htmlFor="dateFrom" className="text-sm font-medium">
                From date
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={filterConfig.dateFrom || ''}
                onChange={(e) => handleDateFromChange(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:w-[180px]">
              <Label htmlFor="dateTo" className="text-sm font-medium">
                To date
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={filterConfig.dateTo || ''}
                onChange={(e) => handleDateToChange(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="shrink-0"
          >
            <X className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}

