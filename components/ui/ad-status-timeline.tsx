/**
 * Feature: Ad Status Timeline Component
 * Purpose: Visual timeline showing ad lifecycle with dates and status transitions
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Supabase: https://supabase.com/docs/guides/database
 */

"use client"

import { CheckCircle2, Clock, XCircle, FileEdit } from "lucide-react"
import { cn } from "@/lib/utils"
import { getStatusMessage } from "@/lib/utils/ad-status"
import type { AdVariant } from "@/lib/types/workspace"

interface AdStatusTimelineProps {
  ad: AdVariant
  className?: string
}

interface TimelineEvent {
  label: string
  date?: string
  status: "completed" | "current" | "pending" | "rejected"
  icon: React.ReactNode
  description?: string
}

export function AdStatusTimeline({ ad, className }: AdStatusTimelineProps) {
  // Build timeline events based on ad status and timestamps
  const events: TimelineEvent[] = []
  
  // Event 1: Draft created
  events.push({
    label: "Draft Created",
    date: ad.created_at,
    status: "completed",
    icon: <FileEdit className="h-4 w-4" />,
  })
  
  // Event 2: Submitted for review
  if (ad.published_at) {
    events.push({
      label: "Submitted for Review",
      date: ad.published_at,
      status: ad.status === 'pending_review' ? 'current' : 'completed',
      icon: <Clock className="h-4 w-4" />,
      description: ad.status === 'pending_review' 
        ? 'Meta is reviewing your ad. This typically takes up to 24 hours.'
        : undefined,
    })
  } else {
    events.push({
      label: "Submit for Review",
      status: "pending",
      icon: <Clock className="h-4 w-4" />,
      description: "Publish your ad to submit it for Meta's review",
    })
  }
  
  // Event 3: Review outcome
  if (ad.approved_at && ad.status !== 'rejected') {
    events.push({
      label: "Approved & Live",
      date: ad.approved_at,
      status: 'completed',
      icon: <CheckCircle2 className="h-4 w-4" />,
      description: "Your ad is live and showing to your target audience",
    })
  } else if (ad.rejected_at || ad.status === 'rejected') {
    const rejectionReason = (ad.metrics_snapshot as { rejection_reason?: string })?.rejection_reason
    events.push({
      label: "Rejected",
      date: ad.rejected_at,
      status: 'rejected',
      icon: <XCircle className="h-4 w-4" />,
      description: rejectionReason || "Your ad needs changes before it can go live",
    })
  } else if (!ad.published_at) {
    events.push({
      label: "Approval Pending",
      status: 'pending',
      icon: <CheckCircle2 className="h-4 w-4" />,
      description: "Once approved, your ad will start showing to your audience",
    })
  } else {
    // Pending approval
    events.push({
      label: "Awaiting Approval",
      status: 'current',
      icon: <Clock className="h-4 w-4" />,
    })
  }
  
  return (
    <div className={cn("space-y-1", className)}>
      {/* Status message */}
      <div className="mb-4 rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-sm text-muted-foreground">
          {getStatusMessage(ad)}
        </p>
      </div>
      
      {/* Timeline */}
      <div className="relative space-y-6 pl-6">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
        
        {events.map((event, index) => (
          <div key={index} className="relative flex gap-4">
            {/* Icon */}
            <div
              className={cn(
                "absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full border-2",
                event.status === 'completed' && "border-green-500 bg-green-500 text-white",
                event.status === 'current' && "border-blue-500 bg-blue-500 text-white animate-pulse",
                event.status === 'pending' && "border-gray-300 bg-white text-gray-400",
                event.status === 'rejected' && "border-red-500 bg-red-500 text-white"
              )}
            >
              {event.icon}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-baseline justify-between gap-2">
                <h4
                  className={cn(
                    "font-medium text-sm",
                    event.status === 'completed' && "text-foreground",
                    event.status === 'current' && "text-blue-600",
                    event.status === 'pending' && "text-muted-foreground",
                    event.status === 'rejected' && "text-red-600"
                  )}
                >
                  {event.label}
                </h4>
                {event.date && (
                  <time className="text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </time>
                )}
              </div>
              {event.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

