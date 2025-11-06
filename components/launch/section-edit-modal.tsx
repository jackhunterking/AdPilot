"use client"

/**
 * Feature: Launch - Section Edit Modal
 * Purpose: Modal wrapper for editing launch sections (Location, Audience, Goal) without leaving launch view
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface SectionEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  className?: string
}

export function SectionEditModal({
  open,
  onOpenChange,
  title,
  children,
  className,
}: SectionEditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className || "max-w-4xl max-h-[90vh] overflow-y-auto"}>
        <DialogHeader>
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
        <div className="mt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

