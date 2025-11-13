/**
 * Feature: Table Utility Functions
 * Purpose: Provide sorting, filtering, pagination, formatting, and export utilities for data tables.
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

import type { TableSortConfig, TableFilterConfig, PaginationState, SortOrder } from '@/lib/types/workspace'

// ============================================================================
// Sorting Utilities
// ============================================================================

export function sortData<T extends Record<string, unknown>>(
  data: T[],
  sortConfig: TableSortConfig | null
): T[] {
  if (!sortConfig) return data

  const { column, order } = sortConfig
  
  return [...data].sort((a, b) => {
    const aValue = a[column]
    const bValue = b[column]

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0
    if (aValue == null) return order === 'asc' ? 1 : -1
    if (bValue == null) return order === 'asc' ? -1 : 1

    // Handle different value types
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order === 'asc' ? aValue - bValue : bValue - aValue
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue)
      return order === 'asc' ? comparison : -comparison
    }

    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return order === 'asc' 
        ? aValue.getTime() - bValue.getTime() 
        : bValue.getTime() - aValue.getTime()
    }

    // Fallback: convert to string and compare
    const aStr = String(aValue)
    const bStr = String(bValue)
    const comparison = aStr.localeCompare(bStr)
    return order === 'asc' ? comparison : -comparison
  })
}

export function toggleSortOrder(currentOrder: SortOrder): SortOrder {
  return currentOrder === 'asc' ? 'desc' : 'asc'
}

// ============================================================================
// Filtering Utilities
// ============================================================================

export function filterData<T extends Record<string, unknown>>(
  data: T[],
  filterConfig: TableFilterConfig
): T[] {
  let filtered = data

  // Apply search filter
  if (filterConfig.search && filterConfig.search.trim().length > 0) {
    const searchLower = filterConfig.search.toLowerCase()
    filtered = filtered.filter((item) => {
      return Object.values(item).some((value) => {
        if (value == null) return false
        return String(value).toLowerCase().includes(searchLower)
      })
    })
  }

  // Apply date range filters
  if (filterConfig.dateFrom || filterConfig.dateTo) {
    filtered = filtered.filter((item) => {
      // Assume there's a date field (submitted_at, created_at, etc.)
      const dateField = item.submitted_at || item.created_at
      if (!dateField) return true

      const itemDate = new Date(String(dateField))
      if (Number.isNaN(itemDate.getTime())) return true

      if (filterConfig.dateFrom) {
        const fromDate = new Date(filterConfig.dateFrom)
        if (itemDate < fromDate) return false
      }

      if (filterConfig.dateTo) {
        const toDate = new Date(filterConfig.dateTo)
        if (itemDate > toDate) return false
      }

      return true
    })
  }

  return filtered
}

// ============================================================================
// Pagination Utilities
// ============================================================================

export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number
): T[] {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  return data.slice(startIndex, endIndex)
}

export function calculatePagination(
  totalItems: number,
  currentPage: number,
  pageSize: number
): PaginationState {
  const totalPages = Math.ceil(totalItems / pageSize)
  return {
    currentPage: Math.max(1, Math.min(currentPage, totalPages)),
    pageSize,
    totalItems,
    totalPages: Math.max(1, totalPages),
  }
}

export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, currentPage - half)
  let end = Math.min(totalPages, start + maxVisible - 1)

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

// ============================================================================
// Formatting Utilities
// ============================================================================

type MetricType = 'number' | 'currency' | 'percentage'

export function formatMetricValue(
  value: unknown,
  type: MetricType,
  currency: string = 'USD'
): string {
  if (value == null) return '—'

  const numValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numValue)) return '—'

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: numValue < 10 ? 2 : 0,
      }).format(numValue)

    case 'percentage':
      return new Intl.NumberFormat(undefined, {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue / 100) // Assuming value is in percentage points (e.g., 5.5 for 5.5%)

    case 'number':
    default:
      if (numValue >= 1000000) {
        return `${(numValue / 1000000).toFixed(1)}M`
      }
      if (numValue >= 1000) {
        return `${(numValue / 1000).toFixed(1)}K`
      }
      return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 0,
      }).format(numValue)
  }
}

export function formatDateTime(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(undefined, options || {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatFieldValue(value: unknown): string {
  if (value == null || value === '') return '—'
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  
  // For complex types, return JSON string
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

// ============================================================================
// Export Utilities
// ============================================================================

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: string[]
): string {
  if (data.length === 0) {
    return columns.join(',') + '\n'
  }

  const headers = columns.map((col) => `"${col}"`)
  const rows = data.map((row) => {
    return columns.map((col) => {
      const value = row[col]
      if (value == null || value === '') return '""'
      
      const strValue = String(value)
        .replace(/"/g, '""')  // Escape double quotes
        .replace(/\n/g, ' ')  // Replace newlines with spaces
      
      return `"${strValue}"`
    }).join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

export function exportToJSON<T>(data: T[]): string {
  return JSON.stringify(data, null, 2)
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadCSV(content: string, filename: string): void {
  downloadFile(content, filename, 'text/csv;charset=utf-8')
}

export function downloadJSON(content: string, filename: string): void {
  downloadFile(content, filename, 'application/json;charset=utf-8')
}

// ============================================================================
// Debounce Utility
// ============================================================================

export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

