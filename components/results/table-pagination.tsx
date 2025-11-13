/**
 * Feature: Table Pagination Controls
 * Purpose: Reusable pagination component with page navigation and page size selector
 * References:
 *  - shadcn/ui Button: https://ui.shadcn.com/docs/components/button
 *  - shadcn/ui Select: https://ui.shadcn.com/docs/components/select
 */

'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPaginationRange } from '@/lib/utils/table-helpers'
import type { PaginationState } from '@/lib/types/workspace'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TablePaginationProps {
  pagination: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function TablePagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  const { currentPage, pageSize, totalItems, totalPages } = pagination

  const paginationRange = getPaginationRange(currentPage, totalPages, 5)
  
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  if (totalItems === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Results count and page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{startItem}</span>-
          <span className="font-medium text-foreground">{endItem}</span> of{' '}
          <span className="font-medium text-foreground">{totalItems}</span> results
        </span>
        
        <div className="flex items-center gap-2">
          <span className="text-xs">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {paginationRange.map((page, index) => {
          // Add ellipsis if there's a gap
          const showStartEllipsis = index === 0 && page > 1
          const showEndEllipsis = index === paginationRange.length - 1 && page < totalPages

          return (
            <div key={page} className="flex items-center">
              {showStartEllipsis && (
                <span className="px-2 text-sm text-muted-foreground">…</span>
              )}
              
              <Button
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon-sm"
                onClick={() => onPageChange(page)}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </Button>

              {showEndEllipsis && (
                <span className="px-2 text-sm text-muted-foreground">…</span>
              )}
            </div>
          )
        })}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

