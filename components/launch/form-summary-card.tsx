"use client"

/**
 * Feature: Launch - Form Summary Card
 * Purpose: Show selected conversion form (e.g., Instant Form) for leads
 */

import { useGoal } from "@/lib/context/goal-context"
import { Button } from "@/components/ui/button"
import { FileText, Check, Flag, Phone, Globe } from "lucide-react"

interface FormSummaryCardProps {
  mode?: 'summary' | 'inline'
  onChange?: () => void
}

export function FormSummaryCard({ mode = 'summary', onChange }: FormSummaryCardProps) {
  const { goalState } = useGoal()
  const form = goalState.formData

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="icon-tile-muted">
            <Flag className="h-4 w-4" />
          </div>
          <h3 className="font-semibold">Goal</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3"
          onClick={() => {
            if (mode === 'inline' && onChange) {
              onChange()
            } else {
              // Force navigation to allow viewing/editing goal
              window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'goal', force: true } }))
            }
          }}
        >
          {goalState.selectedGoal ? 'View goal' : 'Set a goal'}
        </Button>
      </div>
      {/* Leads summary */}
      {goalState.selectedGoal === 'leads' && form?.id ? (
        <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
          <div className="flex items-center gap-2">
            <div className="icon-tile-muted"><FileText className="h-4 w-4 text-brand-blue" /></div>
            <div>
              <p className="text-sm font-medium">{form.name ?? "Lead Form"}</p>
              <p className="text-xs text-muted-foreground">Type: {form.type ?? "instant-form"}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 text-status-green">
            <Check className="h-4 w-4" /> Selected
          </div>
        </div>
      ) : goalState.selectedGoal === 'calls' && form?.phoneNumber ? (
        <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
          <div className="flex items-center gap-2">
            <div className="icon-tile-muted"><Phone className="h-4 w-4 text-brand-blue" /></div>
            <div>
              <p className="text-sm font-medium">Calls</p>
              <p className="text-xs text-muted-foreground">{form.phoneNumber}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 text-status-green">
            <Check className="h-4 w-4" /> Configured
          </div>
        </div>
      ) : goalState.selectedGoal === 'website-visits' && form?.websiteUrl ? (
        <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
          <div className="flex items-center gap-2">
            <div className="icon-tile-muted"><Globe className="h-4 w-4 text-brand-blue" /></div>
            <div>
              <p className="text-sm font-medium">{form.displayLink || 'Website'}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[220px]">{form.websiteUrl}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 text-status-green">
            <Check className="h-4 w-4" /> Configured
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
          <div className="flex items-center gap-2">
            <div className="icon-tile-muted"><FileText className="h-4 w-4 text-brand-blue" /></div>
            <div>
              <p className="text-sm font-medium">No goal selected</p>
              <p className="text-xs text-muted-foreground">Click “Set a goal” to configure.</p>
            </div>
          </div>
          <div className="status-muted">Not selected</div>
        </div>
      )}
    </div>
  )
}


