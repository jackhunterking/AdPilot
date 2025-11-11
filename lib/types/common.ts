/**
 * Common type definitions shared across the application
 * Purpose: Provide reusable type definitions to avoid 'any' types
 */

/**
 * Generic dictionary/map type for unknown object structures
 */
export type Dict = Record<string, unknown>

/**
 * Type definition for chart tooltip components (e.g., Recharts)
 */
export interface ChartTooltipPayloadItem {
  name?: string
  value?: number | string
  payload?: unknown
  dataKey?: string
  color?: string
}

export interface ChartTooltipProps {
  active?: boolean
  payload?: ChartTooltipPayloadItem[]
  label?: string
}

