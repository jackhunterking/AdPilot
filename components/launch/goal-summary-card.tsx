"use client"

/**
 * Feature: Launch Goal Summary Card
 * Purpose: Compact summary card for goal selection showing chosen form, website, or call target
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, FileText, Globe, Phone, Sparkles } from "lucide-react"

type GoalSummaryVariant = "leads" | "calls" | "website"

interface GoalSummaryCardProps {
  variant: GoalSummaryVariant
  title?: string
  value?: string
  subtitle?: string
  lastUpdated?: string
  helper?: string
  className?: string
}

const variantConfig: Record<GoalSummaryVariant, {
  pill: string
  icon: React.ComponentType<{ className?: string }>
  defaultHelper: string
}> = {
  leads: {
    pill: "Instant Form",
    icon: FileText,
    defaultHelper: "Facebook Instant Form",
  },
  website: {
    pill: "Website Clicks",
    icon: Globe,
    defaultHelper: "Driving traffic to your site",
  },
  calls: {
    pill: "Calls",
    icon: Phone,
    defaultHelper: "Incoming call objective",
  },
}

export function GoalSummaryCard({
  variant,
  title,
  value,
  subtitle,
  lastUpdated,
  helper,
  className,
}: GoalSummaryCardProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide">
            {config.pill}
          </Badge>
          {lastUpdated && <span className="text-[11px] text-muted-foreground/70">Updated {lastUpdated}</span>}
        </span>
        <Badge className="flex items-center gap-1 bg-emerald-500 text-white">
          <Check className="h-3 w-3" />
          Ready
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {value || "Not configured"}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground/70" />
        <span>{helper || config.defaultHelper}</span>
      </div>
    </div>
  )
}


