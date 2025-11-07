"use client"

/**
 * Feature: UI - Separator
 * Purpose: Horizontal or vertical divider consistent with shadcn/ui layouts
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - shadcn/ui Separator: https://ui.shadcn.com/docs/components/separator
 */

import * as React from "react"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical"
  }
>(({ className, orientation = "horizontal", role = "separator", ...props }, ref) => {
  return (
    <div
      ref={ref}
      role={role}
      aria-orientation={orientation}
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  )
})

Separator.displayName = "Separator"

export { Separator }

