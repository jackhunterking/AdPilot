"use client"

/**
 * Feature: Launch - Publish Budget Card
 * Purpose: Combined card component that merges Complete All Steps and Budget sections
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, CheckCircle2, DollarSign, ShieldCheck, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface PublishBudgetCardProps {
  allStepsComplete: boolean
  completedCount: number
  totalSteps: number
  isPublished: boolean
  onPublish: () => void
  budgetSummaryContent: string
  isBudgetComplete: boolean
  budgetEditContent?: React.ReactNode
}

export function PublishBudgetCard({
  allStepsComplete,
  completedCount,
  totalSteps,
  isPublished,
  onPublish,
  budgetSummaryContent,
  isBudgetComplete,
  budgetEditContent,
}: PublishBudgetCardProps) {
  const progressPercentage = (completedCount / totalSteps) * 100

  const formattedProgress = Math.round(progressPercentage)

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-900 text-white shadow-2xl">
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(circle at top left, rgba(99,102,241,0.35), transparent 55%)" }} />
      <div className="absolute inset-x-0 -top-48 h-56 bg-gradient-to-b from-white/20 via-white/5 to-transparent blur-3xl" />
      <CardContent className="relative z-[1] p-6 lg:p-7">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
                  <Sparkles className="h-3.5 w-3.5" />
                  Launch assistant
                </div>
                <h3 className="text-xl font-semibold">Complete all steps</h3>
                <p className="text-sm text-white/70">
                  {completedCount} of {totalSteps} steps complete. Finish below to launch your campaign confidently.
                </p>
              </div>
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-sm uppercase tracking-widest text-white/60">Readiness</span>
                <span className="text-3xl font-semibold text-white">{formattedProgress}%</span>
              </div>
            </div>

            <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(56,189,248,0.45)] transition-[width] duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
              <div className="absolute inset-y-0 left-0 w-full border border-white/10 rounded-full" />
            </div>

            <Button
              onClick={onPublish}
              disabled={!allStepsComplete}
              size="lg"
              className={cn(
                "mt-2 w-full gap-2 h-12 text-sm font-semibold",
                allStepsComplete
                  ? "bg-gradient-to-r from-[#6C8CFF] via-[#5C7BFF] to-[#52E3FF] text-slate-900 shadow-lg hover:brightness-105"
                  : "bg-white/10 text-white/60 cursor-not-allowed"
              )}
            >
              {isPublished ? (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Campaign Published
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Publish Campaign
                </>
              )}
            </Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-11 w-11 rounded-2xl border border-white/15 flex items-center justify-center",
                    isBudgetComplete ? "bg-emerald-400/15" : "bg-white/10"
                  )}
                >
                  <DollarSign
                    className={cn(
                      "h-5 w-5",
                      isBudgetComplete ? "text-emerald-300" : "text-white/60"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Budget control</p>
                  <p className="text-xs text-white/60">Daily spend target aligned with strategy</p>
                </div>
              </div>
              <span className="text-base font-semibold text-white/90">{budgetSummaryContent}</span>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4">
              {budgetEditContent ? (
                budgetEditContent
              ) : (
                <p className="text-sm text-white/65">
                  Set your daily budget to keep campaigns aligned with your spend goals.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

