"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface VariantData {
  id: string
  variantName: string
  variantType: "original" | "test"
  testVariable?: string
  status: "active" | "paused" | "completed"
  metrics: {
    impressions: number
    clicks: number
    ctr: number
    cpm: number
    amountSpent: number
    costPerResult: number
    results: number
  }
  adCopy?: {
    headline: string
    description: string
  }
  goal: "leads" | "website_visits" | "calls"
  leadFormFields?: Array<{ name: string; value: string }>
}

interface ComparisonViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variants: [VariantData, VariantData]
}

export function ComparisonView({ open, onOpenChange, variants }: ComparisonViewProps) {
  const [variantA, variantB] = variants

  // Calculate performance differences
  const calculateDiff = (metricA: number, metricB: number) => {
    if (metricA === 0) return 0
    return ((metricB - metricA) / metricA) * 100
  }

  const ctrDiff = calculateDiff(variantA.metrics.ctr, variantB.metrics.ctr)
  const cpmDiff = calculateDiff(variantA.metrics.cpm, variantB.metrics.cpm)
  const costPerResultDiff = calculateDiff(variantA.metrics.costPerResult, variantB.metrics.costPerResult)
  const resultsDiff = calculateDiff(variantA.metrics.results, variantB.metrics.results)

  // Determine winner based on cost per result (lower is better)
  const winner = variantA.metrics.costPerResult < variantB.metrics.costPerResult ? "A" : "B"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>A/B Test Comparison</DialogTitle>
          <DialogDescription>Compare performance between variants to determine the winner</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Variant A */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {variantA.variantName}
                  {winner === "A" && <Trophy className="h-5 w-5 text-yellow-500" />}
                </h3>
                <Badge variant="secondary" className="mt-1">
                  {variantA.variantType === "original" ? "Original" : "Variant A"}
                </Badge>
              </div>
            </div>

            {/* Ad Copy */}
            {variantA.adCopy && (
              <Card className="p-4 bg-muted/30">
                <p className="font-medium text-sm mb-1">{variantA.adCopy.headline}</p>
                <p className="text-xs text-muted-foreground">{variantA.adCopy.description}</p>
              </Card>
            )}

            {/* Metrics */}
            <div className="space-y-3">
              <MetricComparison label="CTR" value={`${variantA.metrics.ctr.toFixed(2)}%`} diff={0} isReference />
              <MetricComparison label="CPM" value={`$${variantA.metrics.cpm.toFixed(2)}`} diff={0} isReference />
              <MetricComparison
                label="Amount Spent"
                value={`$${variantA.metrics.amountSpent.toFixed(2)}`}
                diff={0}
                isReference
              />
              <MetricComparison
                label="Cost/Result"
                value={`$${variantA.metrics.costPerResult.toFixed(2)}`}
                diff={0}
                isReference
                lowerIsBetter
              />
              <MetricComparison
                label={
                  variantA.goal === "leads" ? "Leads" : variantA.goal === "website_visits" ? "Website Visits" : "Calls"
                }
                value={variantA.metrics.results.toLocaleString()}
                diff={0}
                isReference
                large
              />
            </div>

            {/* Lead Form Fields */}
            {variantA.goal === "leads" && variantA.leadFormFields && variantA.leadFormFields.length > 0 && (
              <Card className="p-4">
                <p className="text-sm font-medium mb-3">Lead Form Data</p>
                <div className="space-y-2">
                  {variantA.leadFormFields.map((field, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{field.name}</span>
                      <span className="font-medium">{field.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Variant B */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {variantB.variantName}
                  {winner === "B" && <Trophy className="h-5 w-5 text-yellow-500" />}
                </h3>
                <Badge variant="secondary" className="mt-1">
                  Variant B
                  {variantB.testVariable && <span className="ml-1">• {variantB.testVariable.replace("_", " ")}</span>}
                </Badge>
              </div>
            </div>

            {/* Ad Copy */}
            {variantB.adCopy && (
              <Card className="p-4 bg-muted/30">
                <p className="font-medium text-sm mb-1">{variantB.adCopy.headline}</p>
                <p className="text-xs text-muted-foreground">{variantB.adCopy.description}</p>
              </Card>
            )}

            {/* Metrics with Differences */}
            <div className="space-y-3">
              <MetricComparison label="CTR" value={`${variantB.metrics.ctr.toFixed(2)}%`} diff={ctrDiff} />
              <MetricComparison
                label="CPM"
                value={`$${variantB.metrics.cpm.toFixed(2)}`}
                diff={cpmDiff}
                lowerIsBetter
              />
              <MetricComparison
                label="Amount Spent"
                value={`$${variantB.metrics.amountSpent.toFixed(2)}`}
                diff={calculateDiff(variantA.metrics.amountSpent, variantB.metrics.amountSpent)}
                lowerIsBetter
              />
              <MetricComparison
                label="Cost/Result"
                value={`$${variantB.metrics.costPerResult.toFixed(2)}`}
                diff={costPerResultDiff}
                lowerIsBetter
              />
              <MetricComparison
                label={
                  variantB.goal === "leads" ? "Leads" : variantB.goal === "website_visits" ? "Website Visits" : "Calls"
                }
                value={variantB.metrics.results.toLocaleString()}
                diff={resultsDiff}
                large
              />
            </div>

            {/* Lead Form Fields */}
            {variantB.goal === "leads" && variantB.leadFormFields && variantB.leadFormFields.length > 0 && (
              <Card className="p-4">
                <p className="text-sm font-medium mb-3">Lead Form Data</p>
                <div className="space-y-2">
                  {variantB.leadFormFields.map((field, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{field.name}</span>
                      <span className="font-medium">{field.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Winner Summary */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="font-semibold">
                {winner === "A" ? variantA.variantName : variantB.variantName} is performing better
              </p>
              <p className="text-sm text-muted-foreground">
                {Math.abs(costPerResultDiff).toFixed(1)}% lower cost per result
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>{winner === "A" ? "Keep Original" : "Use Variant B"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MetricComparison({
  label,
  value,
  diff,
  isReference,
  lowerIsBetter,
  large,
}: {
  label: string
  value: string
  diff: number
  isReference?: boolean
  lowerIsBetter?: boolean
  large?: boolean
}) {
  const isPositive = lowerIsBetter ? diff < 0 : diff > 0
  const showDiff = !isReference && diff !== 0

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={cn("font-semibold", large ? "text-xl" : "text-lg")}>{value}</p>
        </div>
        {showDiff && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isPositive ? "text-green-600" : "text-red-600",
            )}
          >
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{Math.abs(diff).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </Card>
  )
}
