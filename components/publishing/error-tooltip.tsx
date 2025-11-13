/**
 * Feature: Error Tooltip Component
 * Purpose: Small info icon with hover tooltip for quick error preview
 * References:
 *  - Shadcn Tooltip: https://ui.shadcn.com/docs/components/tooltip
 */

"use client"

import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { PublishError } from "@/lib/types/workspace"

interface ErrorTooltipProps {
  error: PublishError
  onClick?: () => void
  className?: string
}

export function ErrorTooltip({ error, onClick, className }: ErrorTooltipProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClick?.()
            }}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full",
              "bg-red-100 text-red-600 hover:bg-red-200 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
              className
            )}
            aria-label="View error details"
          >
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="center"
          className="max-w-xs bg-red-900 text-white border-red-800"
        >
          <div className="space-y-2 p-1">
            <p className="font-semibold text-xs">
              {error.code === 'validation_error' && 'Validation Error'}
              {error.code === 'policy_violation' && 'Policy Violation'}
              {error.code === 'payment_required' && 'Payment Required'}
              {error.code === 'token_expired' && 'Connection Expired'}
              {error.code === 'api_error' && 'API Error'}
              {error.code === 'network_error' && 'Network Error'}
              {error.code === 'unknown_error' && 'Unknown Error'}
            </p>
            <p className="text-xs opacity-90">
              {error.userMessage}
            </p>
            {onClick && (
              <p className="text-xs opacity-75 italic pt-1 border-t border-red-800">
                Click for full details
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Compact version without tooltip, just the icon
export function ErrorIcon({ 
  onClick, 
  className 
}: { 
  onClick?: () => void
  className?: string 
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        "inline-flex h-4 w-4 items-center justify-center rounded-full",
        "bg-red-100 text-red-600 hover:bg-red-200 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1",
        className
      )}
      aria-label="Error"
    >
      <Info className="h-2.5 w-2.5" />
    </button>
  )
}

