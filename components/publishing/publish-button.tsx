/**
 * Feature: Dynamic Publish Button
 * Purpose: Status-aware button that adapts to current ad status
 * References:
 *  - Shadcn Button: https://ui.shadcn.com/docs/components/button
 */

"use client"

import { Button } from "@/components/ui/button"
import { Loader2, Rocket, Pause, Play, RefreshCw, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdStatus } from "@/lib/types/workspace"

interface PublishButtonProps {
  status: AdStatus
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function PublishButton({
  status,
  onClick,
  loading = false,
  disabled = false,
  className,
  size = "default"
}: PublishButtonProps) {
  // Get button config based on status
  const getButtonConfig = () => {
    switch (status) {
      case 'draft':
        return {
          label: 'Publish',
          icon: <Rocket className="h-4 w-4" />,
          variant: 'default' as const,
          disabled: false
        }
      
      case 'pending_review':
        return {
          label: 'Reviewing...',
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          variant: 'secondary' as const,
          disabled: true
        }
      
      case 'active':
      case 'learning':
        return {
          label: 'Pause',
          icon: <Pause className="h-4 w-4" />,
          variant: 'outline' as const,
          disabled: false
        }
      
      case 'paused':
        return {
          label: 'Resume',
          icon: <Play className="h-4 w-4" />,
          variant: 'default' as const,
          disabled: false
        }
      
      case 'rejected':
        return {
          label: 'Fix & Republish',
          icon: <Edit className="h-4 w-4" />,
          variant: 'outline' as const,
          disabled: false
        }
      
      case 'failed':
        return {
          label: 'Retry',
          icon: <RefreshCw className="h-4 w-4" />,
          variant: 'destructive' as const,
          disabled: false
        }
      
      case 'archived':
        return {
          label: 'Archived',
          icon: null,
          variant: 'ghost' as const,
          disabled: true
        }
      
      default:
        return {
          label: 'Publish',
          icon: <Rocket className="h-4 w-4" />,
          variant: 'default' as const,
          disabled: false
        }
    }
  }

  const config = getButtonConfig()
  const isDisabled = disabled || config.disabled || loading

  return (
    <Button
      variant={config.variant}
      size={size}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "gap-2",
        // Add special styling for certain states
        status === 'pending_review' && "cursor-not-allowed",
        status === 'failed' && "hover:bg-red-700",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        config.icon
      )}
      {config.label}
    </Button>
  )
}

// Compact version for use in tight spaces
export function PublishButtonCompact({
  status,
  onClick,
  loading = false,
  disabled = false,
  className
}: Omit<PublishButtonProps, 'size'>) {
  const getIcon = () => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />
    
    switch (status) {
      case 'draft':
      case 'failed':
      case 'rejected':
        return <Rocket className="h-4 w-4" />
      case 'pending_review':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'active':
      case 'learning':
        return <Pause className="h-4 w-4" />
      case 'paused':
        return <Play className="h-4 w-4" />
      default:
        return <Rocket className="h-4 w-4" />
    }
  }

  const getVariant = (): "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" => {
    switch (status) {
      case 'draft':
        return 'default'
      case 'pending_review':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const isDisabled = disabled || status === 'pending_review' || status === 'archived' || loading

  return (
    <Button
      variant={getVariant()}
      size="icon"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        status === 'pending_review' && "cursor-not-allowed",
        className
      )}
      aria-label={`${status} action`}
    >
      {getIcon()}
    </Button>
  )
}

