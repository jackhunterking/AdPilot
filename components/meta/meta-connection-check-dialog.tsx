"use client"

/**
 * Feature: Meta Connection Check Dialog
 * Purpose: Lazy connection check for Instant Forms - auto-closes if connected, prompts if not
 * References:
 *  - Meta Login: https://developers.facebook.com/docs/facebook-login
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Facebook, CheckCircle2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useMetaActions } from "@/lib/hooks/use-meta-actions"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { META_EVENTS } from "@/lib/utils/meta-events"

interface MetaConnectionCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MetaConnectionCheckDialog({ open, onOpenChange, onSuccess }: MetaConnectionCheckDialogProps) {
  const { campaign } = useCampaignContext()
  const metaActions = useMetaActions()
  const { metaStatus, refreshStatus } = useMetaConnection()
  const [isConnecting, setIsConnecting] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  // Auto-check connection status when dialog opens
  useEffect(() => {
    if (!open || !campaign?.id || hasChecked) return
    
    setHasChecked(true)
    
    // Refresh connection status from localStorage
    refreshStatus()
    
    // Small delay to allow refresh to complete
    setTimeout(() => {
      if (metaStatus === 'connected') {
        // Already connected - auto-close and proceed
        console.log('[MetaConnectionCheckDialog] Already connected, auto-closing')
        onSuccess()
        onOpenChange(false)
      }
    }, 100)
  }, [open, campaign?.id, metaStatus, refreshStatus, onSuccess, onOpenChange, hasChecked])

  // Reset hasChecked when dialog closes
  useEffect(() => {
    if (!open) {
      setHasChecked(false)
    }
  }, [open])

  // Listen for Meta connection events
  useEffect(() => {
    if (!open || !campaign?.id) return
    
    const handleConnectionChange = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{ campaignId: string }>
        
        // Only respond to events for THIS campaign
        if (customEvent.detail.campaignId !== campaign.id) {
          return
        }
        
        console.log('[MetaConnectionCheckDialog] Connection event received, checking status')
        
        // Refresh status
        refreshStatus()
        
        // Small delay to allow refresh to complete
        setTimeout(() => {
          if (metaStatus === 'connected') {
            console.log('[MetaConnectionCheckDialog] Now connected, auto-closing')
            onSuccess()
            onOpenChange(false)
          }
        }, 100)
      } catch (error) {
        console.error('[MetaConnectionCheckDialog] Error handling event:', error)
      }
    }
    
    // Listen for Meta connection events
    window.addEventListener(META_EVENTS.CONNECTION_CHANGED, handleConnectionChange)
    window.addEventListener(META_EVENTS.PAYMENT_UPDATED, handleConnectionChange)
    
    console.log('[MetaConnectionCheckDialog] Event listeners registered')
    
    return () => {
      window.removeEventListener(META_EVENTS.CONNECTION_CHANGED, handleConnectionChange)
      window.removeEventListener(META_EVENTS.PAYMENT_UPDATED, handleConnectionChange)
      console.log('[MetaConnectionCheckDialog] Event listeners cleaned up')
    }
  }, [open, campaign?.id, metaStatus, refreshStatus, onSuccess, onOpenChange])

  const handleConnect = () => {
    if (!campaign?.id || isConnecting) return
    setIsConnecting(true)
    metaActions.connect()
    
    // Reset connecting state after popup opens
    setTimeout(() => {
      setIsConnecting(false)
    }, 1000)
  }

  // If already connected, show nothing (will auto-close)
  if (metaStatus === 'connected') {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Facebook className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">Connect Meta Account</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="text-sm text-muted-foreground mb-4">
          To use Instant Forms, connect your Facebook and Instagram accounts to collect leads directly on Meta platforms.
        </DialogDescription>
        
        {/* Simple feature list */}
        <div className="space-y-2 mb-6 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong>Quick Setup:</strong> Select your business, page, and ad account</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong>Secure Connection:</strong> Your credentials are handled by Meta</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? "Connecting..." : "Connect Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

