/**
 * Feature: Safe Ad Switching Hook
 * Purpose: Handle ad switching with confirmation dialog for unsaved changes
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Next.js App Router: https://nextjs.org/docs/app/building-your-application/routing
 */

'use client'

import { useCallback, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCurrentAd } from '@/lib/context/current-ad-context'
import { toast } from 'sonner'

export interface ConfirmDialogState {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText: string
  cancelText: string
  destructive?: boolean
}

export function useAdSwitching() {
  const router = useRouter()
  const pathname = usePathname()
  const { hasUnsavedChanges, markAsSaved } = useCurrentAd()
  const [dialogState, setDialogState] = useState<ConfirmDialogState | null>(null)

  /**
   * Show confirmation dialog
   */
  const showConfirmDialog = useCallback(
    (options: {
      title: string
      message: string
      confirmText?: string
      cancelText?: string
      destructive?: boolean
      onConfirm: () => void
      onCancel?: () => void
    }): void => {
      setDialogState({
        open: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        destructive: options.destructive,
        onConfirm: () => {
          options.onConfirm()
          setDialogState(null)
        },
        onCancel: () => {
          options.onCancel?.()
          setDialogState(null)
        },
      })
    },
    []
  )

  /**
   * Close confirmation dialog
   */
  const closeDialog = useCallback(() => {
    setDialogState(null)
  }, [])

  /**
   * Switch to a specific ad with unsaved work protection
   */
  const switchToAd = useCallback(
    async (newAdId: string, options?: { skipConfirmation?: boolean }): Promise<void> => {
      // If no unsaved changes or confirmation skipped, navigate immediately
      if (!hasUnsavedChanges || options?.skipConfirmation) {
        const params = new URLSearchParams()
        params.set('view', 'build')
        params.set('adId', newAdId)
        router.push(`${pathname}?${params.toString()}`)
        return
      }

      // Show confirmation dialog for unsaved changes
      showConfirmDialog({
        title: 'Unsaved Changes',
        message:
          'You have unsaved changes on the current ad. Do you want to discard them and switch ads?',
        confirmText: 'Discard & Switch',
        cancelText: 'Cancel',
        destructive: true,
        onConfirm: () => {
          // Mark current ad as saved (discard changes)
          markAsSaved()

          // Navigate to new ad
          const params = new URLSearchParams()
          params.set('view', 'build')
          params.set('adId', newAdId)
          router.push(`${pathname}?${params.toString()}`)

          toast.info('Switched to a different ad')
        },
      })
    },
    [hasUnsavedChanges, pathname, router, showConfirmDialog, markAsSaved]
  )

  /**
   * Navigate to All Ads view with unsaved work protection
   */
  const navigateToAllAds = useCallback(async (): Promise<void> => {
    // If no unsaved changes, navigate immediately
    if (!hasUnsavedChanges) {
      const params = new URLSearchParams()
      params.set('view', 'all-ads')
      router.push(`${pathname}?${params.toString()}`)
      return
    }

    // Show confirmation dialog for unsaved changes
    showConfirmDialog({
      title: 'Unsaved Changes',
      message:
        'You have unsaved changes on the current ad. Do you want to discard them and go back?',
      confirmText: 'Discard & Go Back',
      cancelText: 'Cancel',
      destructive: true,
      onConfirm: () => {
        // Mark current ad as saved (discard changes)
        markAsSaved()

        // Navigate to all ads
        const params = new URLSearchParams()
        params.set('view', 'all-ads')
        router.push(`${pathname}?${params.toString()}`)

        toast.info('Navigated to All Ads')
      },
    })
  }, [hasUnsavedChanges, pathname, router, showConfirmDialog, markAsSaved])

  /**
   * Create new ad with unsaved work protection on current ad
   */
  const createNewAd = useCallback(
    async (onCreateCallback: () => Promise<void>): Promise<void> => {
      // If no unsaved changes, create immediately
      if (!hasUnsavedChanges) {
        await onCreateCallback()
        return
      }

      // Show confirmation dialog for unsaved changes
      showConfirmDialog({
        title: 'Unsaved Changes',
        message:
          'You have unsaved changes on the current ad. Do you want to discard them and create a new ad?',
        confirmText: 'Discard & Create New',
        cancelText: 'Cancel',
        destructive: true,
        onConfirm: async () => {
          // Mark current ad as saved (discard changes)
          markAsSaved()

          // Create new ad
          await onCreateCallback()

          toast.info('Creating new ad')
        },
      })
    },
    [hasUnsavedChanges, showConfirmDialog, markAsSaved]
  )

  /**
   * Cancel new ad creation and navigate back
   */
  const cancelNewAdCreation = useCallback(
    async (adId: string, campaignId: string, onDeleteCallback?: () => Promise<void>): Promise<void> => {
      showConfirmDialog({
        title: 'Cancel New Ad?',
        message: 'Are you sure you want to cancel creating this new ad? All your progress will be lost.',
        confirmText: 'Cancel Ad',
        cancelText: 'Keep Working',
        destructive: true,
        onConfirm: async () => {
          // Delete draft ad from database
          if (onDeleteCallback) {
            await onDeleteCallback()
          } else {
            try {
              await fetch(`/api/v1/ads/${adId}`, {
                method: 'DELETE',
              })
            } catch (error) {
              console.error('[useAdSwitching] Failed to delete draft ad:', error)
            }
          }

          // Mark as saved to prevent double confirmation
          markAsSaved()

          // Navigate to all ads
          const params = new URLSearchParams()
          params.set('view', 'all-ads')
          router.push(`${pathname}?${params.toString()}`)

          toast.success('Ad cancelled')
        },
      })
    },
    [pathname, router, showConfirmDialog, markAsSaved]
  )

  return {
    switchToAd,
    navigateToAllAds,
    createNewAd,
    cancelNewAdCreation,
    dialogState,
    closeDialog,
    showConfirmDialog,
  }
}

