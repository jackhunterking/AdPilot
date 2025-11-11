"use client"

/**
 * Feature: Launch - Section Edit Modal
 * Purpose: Modal wrapper for editing launch sections (Location, Audience, Goal) without leaving launch view
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface SectionEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  innerClassName?: string
  size?: "md" | "lg" | "xl" | "full"
}

export function SectionEditModal({
  open,
  onOpenChange,
  title,
  children,
  className,
  bodyClassName,
  innerClassName,
  size = "lg",
}: SectionEditModalProps) {
  const sizeClass = {
    md: "max-w-3xl",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
    full: "max-w-6xl",
  }[size]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-full max-h-[90vh] overflow-hidden border-none bg-transparent p-0 shadow-none",
          sizeClass,
          className,
        )}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-2xl backdrop-blur">
          <DialogHeader className="border-b border-border bg-card px-6 py-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div
            className={cn(
              "flex-1 overflow-y-auto bg-muted/20 px-6 py-6",
              bodyClassName,
            )}
          >
            <div className={cn("mx-auto w-full max-w-4xl", innerClassName)}>
              {children}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

