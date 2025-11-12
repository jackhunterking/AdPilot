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
  DialogFooter,
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
}

export function DeleteCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onConfirm,
}: DeleteCampaignDialogProps) {
  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>Delete Campaign</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            Are you sure you want to delete <span className="font-semibold">{campaign.name}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            Delete Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

