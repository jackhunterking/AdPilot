"use client"

/**
 * Feature: Launch - Collapsible Section
 * Purpose: Reusable collapsible section component for launch screen with summary and edit modal
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  isComplete: boolean
  summaryContent: React.ReactNode
  summaryContentClassName?: string
  editContent?: React.ReactNode
  onEdit?: () => void
  editStepId?: string
  editStepForce?: boolean
  defaultOpen?: boolean
  className?: string
}

export function CollapsibleSection({
  title,
  icon: Icon,
  isComplete,
  summaryContent,
  summaryContentClassName,
  editContent,
  onEdit,
  editStepId,
  editStepForce = true,
  defaultOpen = false,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className={cn("rounded-lg border border-border bg-card", className)}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border",
                isComplete
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              {isComplete ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              )}
            </div>
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
              isComplete ? "bg-green-500/10" : "bg-muted"
            )}>
              <Icon
                className={cn(
                  "h-5 w-5",
                  isComplete ? "text-green-600" : "text-muted-foreground"
                )}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
              <h3 className="font-semibold text-sm leading-none text-foreground">{title}</h3>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t px-4 py-4 space-y-4">
          {summaryContent && (
            <div className={cn("space-y-4", summaryContentClassName)}>
              {summaryContent}
            </div>
          )}
          {onEdit && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => {
                  if (editStepId) {
                    window.dispatchEvent(new CustomEvent('gotoStep', {
                      detail: {
                        id: editStepId,
                        ...(editStepForce ? { force: true } : {}),
                      },
                    }))
                  }
                  onEdit()
                }}
              >
                Edit
              </Button>
            </div>
          )}
          {editContent && (
            <div className="pt-4 border-t">
              {editContent}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

