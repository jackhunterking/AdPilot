"use client"

/**
 * Feature: Launch - Publish Card
 * Purpose: Simplified publish card showing completion status and publish button
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction#core-concepts
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway#overview
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 * 
 * NOTE: This component triggers the PublishFlowDialog via onPublish callback.
 * The isPublishing prop shows loading state during the simulated publish flow.
 * Budget management is now handled via the WorkspaceHeader.
 */

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PublishBudgetCardProps {
  allStepsComplete: boolean
  isPublished: boolean
}

export function PublishBudgetCard({
  allStepsComplete,
  isPublished,
}: PublishBudgetCardProps) {
  return (
    <Card className="rounded-lg border border-border bg-card shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border",
              allStepsComplete
                ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                : "border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
            )}
          >
            {allStepsComplete ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {allStepsComplete ? "Ready to publish" : "Complete requirements"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {allStepsComplete
                ? "Everything is ready. Use the Publish button above to go live."
                : "Complete the remaining items before publishing."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 px-4 py-3">
          <div className="flex-1">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Budget and Meta connection are managed in the header above. Make sure to set your campaign budget and connect your accounts before publishing.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

