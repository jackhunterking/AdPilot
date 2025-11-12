/**
 * Feature: Rename Campaign Dialog
 * Purpose: Dialog for renaming campaigns from workspace
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

"use client"

import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'

type Campaign = Tables<'campaigns'>

interface RenameCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign: Campaign | null
  onSuccess: (updatedCampaign: Campaign) => void
}

export function RenameCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: RenameCampaignDialogProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const MAX_LEN = 50

  useEffect(() => {
    if (campaign && open) {
      setName(campaign.name)
      setError(null)
    }
  }, [campaign, open])

  const handleSubmit = async () => {
    if (!campaign) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter a name')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (response.ok) {
        const { campaign: updatedCampaign } = await response.json()
        onSuccess(updatedCampaign)
      } else {
        const data = await response.json()
        if (response.status === 409) {
          setError('Name already used. Try a different word combination.')
        } else {
          setError(data.error || 'Failed to rename')
        }
      }
    } catch (err) {
      setError('Failed to rename campaign')
    } finally {
      setSubmitting(false)
    }
  }

  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Campaign</DialogTitle>
          <DialogDescription>
            Enter a new name for your campaign
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={name}
            onChange={(e) => {
              if (e.target.value.length <= MAX_LEN) {
                setName(e.target.value)
                setError(null)
              }
            }}
            maxLength={MAX_LEN}
            placeholder="Campaign name"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !submitting && name.trim()) {
                handleSubmit()
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {name.length}/{MAX_LEN} characters
            </span>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

