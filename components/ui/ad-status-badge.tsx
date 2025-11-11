/**
 * Feature: Ad Status Badge Component
 * Purpose: Reusable status badge with colors, tooltips, and animations
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Supabase: https://supabase.com/docs/guides/database
 */

"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getStatusConfig } from "@/lib/utils/ad-status"
import type { AdStatus } from "@/lib/types/workspace"

interface AdStatusBadgeProps {
  status: AdStatus
  showTooltip?: boolean
  showIcon?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function AdStatusBadge({
  status,
  showTooltip = true,
  showIcon = false,
  size = "md",
  className,
}: AdStatusBadgeProps) {
  const config = getStatusConfig(status)
  
  // Size classes
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  }
  
  // Determine if badge should pulse (pending status)
  const shouldPulse = status === 'pending_approval'
  
  const badgeContent = (
    <Badge
      className={cn(
        "font-medium",
        config.color,
        config.bgColor,
        config.borderColor,
        "border",
        sizeClasses[size],
        shouldPulse && "animate-pulse",
        className
      )}
    >
      {showIcon && config.icon && (
        <span className="mr-1">{config.icon}</span>
      )}
      {config.label}
    </Badge>
  )
  
  if (!showTooltip) {
    return badgeContent
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Compact version for use in tight spaces
export function AdStatusDot({
  status,
  showLabel = false,
  className,
}: {
  status: AdStatus
  showLabel?: boolean
  className?: string
}) {
  const config = getStatusConfig(status)
  const shouldPulse = status === 'pending_approval'
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          config.bgColor,
          shouldPulse && "animate-pulse"
        )}
      />
      {showLabel && (
        <span className={cn("text-sm", config.color)}>
          {config.shortLabel}
        </span>
      )}
    </div>
  )
}

