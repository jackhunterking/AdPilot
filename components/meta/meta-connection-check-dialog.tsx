"use client"

/**
 * Feature: Meta Connection Check Dialog
 * Purpose: Lazy connection check for Instant Forms - auto-closes if connected, prompts if not
 * References:
 *  - Meta Login: https://developers.facebook.com/docs/facebook-login
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Facebook, Loader2, CheckCircle2 } from "lucide-react"
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
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-white">
          <div className="absolute top-4 right-4 opacity-20">
            <Facebook className="h-12 w-12" />
          </div>
          <DialogHeader className="space-y-3 relative">
            <DialogTitle className="text-2xl font-bold text-white">
              Connect Meta Account
            </DialogTitle>
            <DialogDescription className="text-blue-50 text-base">
              To use Instant Forms, connect your Facebook and Instagram accounts
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Instant Forms require access to your Meta business account to collect leads directly on Facebook and Instagram.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm flex-1">
                  <p className="font-semibold mb-1 text-blue-900 dark:text-blue-100">Quick Setup</p>
                  <p className="text-blue-700 dark:text-blue-300 text-xs">
                    We'll guide you through selecting your business, page, and ad account
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm flex-1">
                  <p className="font-semibold mb-1 text-blue-900 dark:text-blue-100">Secure Connection</p>
                  <p className="text-blue-700 dark:text-blue-300 text-xs">
                    Your credentials are handled securely by Meta
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 pb-6">
          <DialogFooter className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isConnecting}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="flex-1 sm:flex-initial gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Facebook className="h-4 w-4" />
                  Connect Now
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

