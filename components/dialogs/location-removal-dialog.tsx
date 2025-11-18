/**
 * Feature: Location Removal Dialog
 * Purpose: Confirmation dialog for removing location targeting
 * Microservices: Thin wrapper around generic ConfirmationDialog
 * References:
 *  - ConfirmationDialog: components/ui/confirmation-dialog.tsx
 */

"use client"

import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LocationData {
  id: string
  name: string
  type: string
  mode?: string
  radius?: number
}

interface LocationRemovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: LocationData | null
  onConfirm: () => void
  isRemoving?: boolean
}

export function LocationRemovalDialog({
  open,
  onOpenChange,
  location,
  onConfirm,
  isRemoving = false,
}: LocationRemovalDialogProps) {
  if (!location) return null

  const getLocationTypeLabel = () => {
    if (location.type === 'radius' && location.radius) {
      return `${location.radius} mile radius`
    }
    switch (location.type) {
      case 'city': return 'City'
      case 'region': return 'Province/Region'
      case 'country': return 'Country'
      default: return location.type
    }
  }

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove Location?"
      description={
        <>
          Are you sure you want to remove <strong>{location.name}</strong>? This location will no longer be targeted.
        </>
      }
      actionLabel="Remove Location"
      onConfirm={onConfirm}
      isLoading={isRemoving}
    >
      {/* Location preview card (no border) */}
      <div className="p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <MapPin className={cn(
            "h-4 w-4 flex-shrink-0",
            location.mode === 'exclude' ? "text-red-600" : "text-green-600"
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{location.name}</p>
            <p className="text-xs text-muted-foreground">{getLocationTypeLabel()}</p>
          </div>
        </div>
      </div>
    </ConfirmationDialog>
  )
}

