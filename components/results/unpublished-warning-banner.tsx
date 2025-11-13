/**
 * Feature: Unpublished Campaign Warning Banner
 * Purpose: Display a persistent warning banner when viewing results of an unpublished campaign
 * References:
 *  - shadcn/ui Alert: https://ui.shadcn.com/docs/components/alert
 */

'use client'

import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface UnpublishedWarningBannerProps {
  className?: string
}

export function UnpublishedWarningBanner({ className }: UnpublishedWarningBannerProps) {
  return (
    <Alert
      className={cn(
        'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-100',
        className
      )}
    >
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle>Campaign Not Published Yet</AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        This ad hasn't been published yet. Publish it to start seeing performance metrics and reach your audience.
      </AlertDescription>
    </Alert>
  )
}

