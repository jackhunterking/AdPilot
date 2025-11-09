/**
 * Feature: Lead Form Indicator
 * Purpose: Display instant form connection status and lead preview for leads campaigns
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, FileText, ArrowRight, User, Mail, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LeadFormInfo } from "@/lib/types/workspace"

export interface LeadFormIndicatorProps {
  leadFormInfo: LeadFormInfo
  onViewAllLeads?: () => void
  className?: string
}

export function LeadFormIndicator({
  leadFormInfo,
  onViewAllLeads,
  className,
}: LeadFormIndicatorProps) {
  const { form_name, is_connected, lead_count, recent_leads } = leadFormInfo

  if (!is_connected) {
    return (
      <Card className={cn("border-amber-500/30 bg-amber-500/5", className)}>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">No Lead Form Connected</h3>
              <p className="text-sm text-muted-foreground">
                Connect an instant form to start collecting leads from this ad.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-green-500/30 bg-green-500/5", className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">📋 Instant Form</h3>
            <p className="text-sm text-muted-foreground">
              ✓ Connected: <span className="font-medium text-foreground">{form_name}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Lead count badge */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Leads</span>
            </div>
            <span className="text-lg font-bold text-green-600">{lead_count}</span>
          </div>

          {/* Recent leads preview */}
          {recent_leads && recent_leads.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Recent Leads
              </h4>
              <div className="space-y-2">
                {recent_leads.slice(0, 3).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-green-600 flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {lead.name && (
                          <p className="text-sm font-medium truncate">{lead.name}</p>
                        )}
                        {lead.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            {lead.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 ml-2 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(lead.submitted_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View all button */}
          {lead_count > 0 && onViewAllLeads && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewAllLeads}
              className="w-full gap-2"
            >
              View All {lead_count} Leads
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {/* Empty state for no leads yet */}
          {lead_count === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No leads yet. They'll appear here within 24-48 hours of your ad going live.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) {
    return 'Yesterday'
  }

  return `${diffInDays}d ago`
}

