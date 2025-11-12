/**
 * Feature: Delete Campaign Dialog
 * Purpose: Confirmation dialog for deleting campaigns
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

"use client"

import { Tables } from '@/lib/supabase/database.types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

type Campaign = Tables<'campaigns'>

interface DeleteCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign: Campaign | null
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onConfirm,
  isDeleting = false,
}: DeleteCampaignDialogProps) {
  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={isDeleting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl">Delete Campaign</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="text-sm text-muted-foreground mb-6">
          Are you sure you want to delete <strong>{campaign.name}</strong>? This action cannot be undone.
        </DialogDescription>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

