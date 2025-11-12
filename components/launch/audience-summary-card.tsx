"use client"

/**
 * Feature: Launch - Audience Summary Card
 * Purpose: Compact audience summary for final launch view
 * Architecture: Uses XState v5 audience machine
 */

import { Button } from "@/components/ui/button"
import { useAudience } from "@/lib/context/audience-machine-context"
import { Check, Target, Sparkles } from "lucide-react"

export function AudienceSummaryCard() {
  const { audienceState } = useAudience()
  const mode = audienceState.targeting?.mode ?? "ai"
  const isAI = mode === "ai"

  if (isAI) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="icon-tile-muted">
              <Target className="h-4 w-4" />
            </div>
            <h3 className="font-semibold">Audience</h3>
          </div>
          <Button variant="outline" size="sm" className="h-7 px-3" onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'audience' } }))}>Edit</Button>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
          <div className="flex items-center gap-2">
            <div className="icon-tile-muted"><Sparkles className="h-4 w-4 text-brand-blue" /></div>
            <div>
              <p className="text-sm font-medium">AI Targeting</p>
              <p className="text-xs text-muted-foreground">AI Advantage+ will optimize who sees your ad</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 text-status-green">
            <Check className="h-4 w-4" /> Enabled
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="icon-tile-muted">
            <Sparkles className="h-4 w-4 text-brand-blue" />
          </div>
          <h3 className="font-semibold">Audience</h3>
        </div>
        <Button variant="outline" size="sm" className="h-7 px-3" onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'audience' } }))}>Edit</Button>
      </div>
      <div className="text-sm text-muted-foreground">
        {(() => {
          const t = audienceState?.targeting
          if (!t) return "Custom audience selected"
          if (t.description && t.description.trim().length > 0) return t.description
          const parts: string[] = []
          if (t.detailedTargeting?.interests && t.detailedTargeting.interests.length > 0) {
            const interestNames = t.detailedTargeting.interests.map(i => i.name)
            parts.push(`Interests: ${interestNames.slice(0, 3).join(', ')}${interestNames.length > 3 ? '…' : ''}`)
          }
          if (t.demographics) {
            const d = t.demographics
            const demoparts: string[] = []
            if (typeof d.ageMin === 'number' || typeof d.ageMax === 'number') {
              const min = typeof d.ageMin === 'number' ? d.ageMin : undefined
              const max = typeof d.ageMax === 'number' ? d.ageMax : undefined
              demoparts.push(`Age ${min ?? 18}-${max ?? 65}`)
            }
            if (d.gender && d.gender !== 'all') demoparts.push(`Gender ${d.gender}`)
            if (d.languages && d.languages.length > 0) demoparts.push(`Lang ${d.languages.join(', ')}`)
            if (demoparts.length > 0) parts.push(demoparts.join(' · '))
          }
          return parts.length > 0 ? parts.join(' | ') : 'Custom audience selected'
        })()}
      </div>
      <div className="mt-3 flex justify-end" />
    </div>
  )
}


