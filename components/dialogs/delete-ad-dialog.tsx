/**
 * Feature: Delete Ad Dialog
 * Purpose: Confirmation dialog for deleting ads
 * Microservices: Thin wrapper around generic ConfirmationDialog
 * References:
 *  - ConfirmationDialog: components/ui/confirmation-dialog.tsx
 */

"use client"

import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface DeleteAdDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adName: string
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteAdDialog({
  open,
  onOpenChange,
  adName,
  onConfirm,
  isDeleting = false,
}: DeleteAdDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Ad?"
      description={
        <>
          Are you sure you want to delete <strong>{adName}</strong>? This action cannot be undone.
        </>
      }
      actionLabel="Delete"
      onConfirm={onConfirm}
      isLoading={isDeleting}
    />
  )
}

