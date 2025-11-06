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
import { ChevronDown, Edit2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  isComplete: boolean
  summaryContent: React.ReactNode
  editContent?: React.ReactNode
  onEdit?: () => void
  defaultOpen?: boolean
  className?: string
}

export function CollapsibleSection({
  title,
  icon: Icon,
  isComplete,
  summaryContent,
  editContent,
  onEdit,
  defaultOpen = false,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleOpenChange = (open: boolean) => {
    if (editContent) {
      setIsOpen(open)
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className={cn("rounded-lg border border-border bg-card", className)}>
      <CollapsibleTrigger 
        className={cn("w-full", !editContent && "cursor-default")} 
        onClick={(e) => {
          if (!editContent) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 self-center",
              isComplete ? "bg-green-500/10" : "bg-muted"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                isComplete ? "text-green-600" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{title}</h3>
                {isComplete && (
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <Check className="h-3 w-3" />
                    <span>Complete</span>
                  </div>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {summaryContent}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <Edit2 className="h-3 w-3 mr-1.5" />
                Edit
              </Button>
            )}
            {editContent && (
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      {editContent && (
        <CollapsibleContent className="px-4 pb-4">
          <div className="pt-4 border-t">
            {editContent}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

