/**
 * Feature: Clear Locations Dialog
 * Purpose: Confirmation dialog for clearing all location targeting
 * Microservices: Thin wrapper around generic ConfirmationDialog
 * References:
 *  - ConfirmationDialog: components/ui/confirmation-dialog.tsx
 */

"use client"

import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface ClearLocationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationCount: number
  onConfirm: () => void
  isClearing?: boolean
}

export function ClearLocationsDialog({
  open,
  onOpenChange,
  locationCount,
  onConfirm,
  isClearing = false,
}: ClearLocationsDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Clear All Locations?"
      description={
        <>
          Are you sure you want to remove all <strong>{locationCount}</strong> location(s)? Your ad will have no location targeting.
        </>
      }
      actionLabel="Clear All"
      onConfirm={onConfirm}
      isLoading={isClearing}
    />
  )
}

