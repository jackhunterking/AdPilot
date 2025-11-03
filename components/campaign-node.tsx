"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlaskConical, Pause, Play, MoreVertical, TrendingUp, TrendingDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type CampaignNodeData = {
  variantName: string
  variantType: "original" | "test"
  status: "active" | "paused" | "completed"
  testVariable?: "location" | "audience" | "ad_copy" | "creative"
  metrics: {
    impressions: number
    clicks: number
    ctr: number
    cpm: number
    amountSpent: number
    costPerResult: number
    results: number // leads, visits, or calls depending on goal
  }
  goal: "leads" | "website_visits" | "calls"
  adCopy?: {
    headline: string
    description: string
  }
  leadFormFields?: Array<{ name: string; value: string }>
  performance?: "winning" | "losing" | "neutral"
  onCreateTest?: () => void
  onToggleStatus?: () => void
  onCompare?: () => void
}

function CampaignNode({ data, selected }: NodeProps<CampaignNodeData>) {
  const isActive = data.status === "active"
  const isTest = data.variantType === "test"

  // Determine performance color
  const performanceColor = {
    winning: "border-green-500 bg-green-500/5",
    losing: "border-red-500 bg-red-500/5",
    neutral: "border-border",
  }[data.performance || "neutral"]

  const statusColor = {
    active: "bg-green-500",
    paused: "bg-yellow-500",
    completed: "bg-gray-500",
  }[data.status]

  return (
    <Card
      className={cn(
        "w-[400px] border-2 transition-all",
        performanceColor,
        selected && "ring-2 ring-primary ring-offset-2",
      )}
    >
      {/* Connection handles */}
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Handle type="source" position={Position.Right} className="w-3 h-3" />

      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{data.variantName}</h3>
            <div className={cn("w-2 h-2 rounded-full", statusColor)} />
          </div>
          {isTest && data.testVariable && (
            <Badge variant="secondary" className="text-xs">
              Testing: {data.testVariable.replace("_", " ")}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={data.onToggleStatus}>
            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={data.onCreateTest}>
                <FlaskConical className="mr-2 h-4 w-4" />
                Create A/B Test
              </DropdownMenuItem>
              <DropdownMenuItem onClick={data.onCompare}>Compare Variants</DropdownMenuItem>
              <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ad Copy Preview */}
      {data.adCopy && (
        <div className="p-4 border-b bg-muted/30">
          <p className="font-medium text-sm mb-1">{data.adCopy.headline}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{data.adCopy.description}</p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="CTR"
            value={`${data.metrics.ctr.toFixed(2)}%`}
            trend={data.performance === "winning" ? "up" : data.performance === "losing" ? "down" : undefined}
          />
          <MetricCard label="CPM" value={`$${data.metrics.cpm.toFixed(2)}`} />
          <MetricCard label="Amount Spent" value={`$${data.metrics.amountSpent.toFixed(2)}`} />
          <MetricCard
            label="Cost/Result"
            value={`$${data.metrics.costPerResult.toFixed(2)}`}
            trend={data.performance === "winning" ? "down" : data.performance === "losing" ? "up" : undefined}
          />
        </div>

        {/* Goal-specific metric */}
        <div className="pt-3 border-t">
          <MetricCard
            label={data.goal === "leads" ? "Leads" : data.goal === "website_visits" ? "Website Visits" : "Calls"}
            value={data.metrics.results.toLocaleString()}
            large
          />
        </div>

        {/* Lead form fields (only for lead campaigns) */}
        {data.goal === "leads" && data.leadFormFields && data.leadFormFields.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Lead Form Fields</p>
            <div className="space-y-1">
              {data.leadFormFields.map((field, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{field.name}</span>
                  <span className="font-medium">{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick action for creating A/B test */}
      {!isTest && (
        <div className="p-3 border-t bg-muted/20">
          <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={data.onCreateTest}>
            <FlaskConical className="mr-2 h-4 w-4" />
            Create A/B Test
          </Button>
        </div>
      )}
    </Card>
  )
}

function MetricCard({
  label,
  value,
  trend,
  large,
}: {
  label: string
  value: string
  trend?: "up" | "down"
  large?: boolean
}) {
  return (
    <div className={cn("space-y-1", large && "text-center")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className={cn("font-semibold", large ? "text-2xl" : "text-lg")}>{value}</p>
        {trend && (
          <div className={cn("flex items-center", trend === "up" ? "text-green-500" : "text-red-500")}>
            {trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(CampaignNode)
