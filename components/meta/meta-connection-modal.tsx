"use client"

/**
 * Feature: Meta Connection Modal
 * Purpose: Unified modal for Meta OAuth, business/page/ad account selection, and payment verification
 * References:
 *  - Facebook Login: https://developers.facebook.com/docs/facebook-login
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Facebook, Building2, CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useMetaActions } from "@/lib/hooks/use-meta-actions"
import { metaStorage } from "@/lib/meta/storage"
import { META_EVENTS } from "@/lib/utils/meta-events"
import type { MetaConnectionSummary } from "@/lib/types/meta-integration"

interface MetaConnectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type ConnectionStep = 'loading' | 'disconnected' | 'selecting' | 'verifying' | 'connected' | 'error'

export function MetaConnectionModal({ open, onOpenChange, onSuccess }: MetaConnectionModalProps) {
  const { campaign } = useCampaignContext()
  const metaActions = useMetaActions()
  const [step, setStep] = useState<ConnectionStep>('loading')
  const [summary, setSummary] = useState<MetaConnectionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Copy pattern from MetaConnectCard: Read from localStorage directly
  const loadConnectionStatus = useCallback(() => {
    if (!campaign?.id) return
    
    setStep('loading')
    
    try {
      console.log('[MetaConnectionModal] Loading connection status from localStorage', {
        campaignId: campaign.id,
      })
      
      // PATTERN FROM MetaConnectCard.hydrate(): Read from localStorage
      const connectionData = metaStorage.getConnection(campaign.id)
      
      if (!connectionData) {
        console.log('[MetaConnectionModal] No connection data found')
        setStep('disconnected')
        setSummary(null)
        return
      }
      
      // Get summary using same method as stepper
      const summary = metaStorage.getConnectionSummary(campaign.id)
      
      console.log('[MetaConnectionModal] Connection summary loaded', {
        hasBusinessId: !!summary?.business?.id,
        hasPageId: !!summary?.page?.id,
        hasAdAccountId: !!summary?.adAccount?.id,
        hasInstagram: !!summary?.instagram?.id,
        paymentConnected: summary?.paymentConnected,
        status: summary?.status,
      })
      
      // Determine if connected using same logic as stepper
      const hasConnection = Boolean(
        summary?.status === 'connected' ||
        summary?.status === 'selected_assets' ||
        summary?.status === 'payment_linked' ||
        summary?.adAccount?.id
      )
      
      if (hasConnection) {
        setStep('connected')
        
        // Build MetaConnectionSummary interface from localStorage data
        setSummary({
          status: 'connected',
          paymentStatus: summary?.paymentConnected ? 'verified' : 'missing',
          business: summary?.business,
          page: summary?.page,
          instagram: summary?.instagram,
          adAccount: summary?.adAccount,
        })
        
        console.log('[MetaConnectionModal] Set to connected state', {
          paymentStatus: summary?.paymentConnected ? 'verified' : 'missing',
        })
      } else {
        setStep('disconnected')
        setSummary(null)
        console.log('[MetaConnectionModal] Set to disconnected state')
      }
    } catch (error) {
      console.error('[MetaConnectionModal] Failed to load status:', error)
      setStep('error')
      setError('Failed to load connection status')
    }
  }, [campaign?.id])

  useEffect(() => {
    if (open && campaign?.id) {
      loadConnectionStatus()
    }
  }, [open, campaign?.id, loadConnectionStatus])

  // Listen for Meta connection events to reload status in real-time
  useEffect(() => {
    if (!open || !campaign?.id) return
    
    const handleConnectionChange = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{ campaignId: string }>
        
        // Only respond to events for THIS campaign
        if (customEvent.detail.campaignId !== campaign.id) {
          return
        }
        
        console.log('[MetaConnectionModal] Connection event received, reloading status')
        loadConnectionStatus()
      } catch (error) {
        console.error('[MetaConnectionModal] Error handling event:', error)
      }
    }
    
    // Listen for all Meta events
    window.addEventListener(META_EVENTS.CONNECTION_CHANGED, handleConnectionChange)
    window.addEventListener(META_EVENTS.PAYMENT_UPDATED, handleConnectionChange)
    window.addEventListener(META_EVENTS.DISCONNECTION, handleConnectionChange)
    
    console.log('[MetaConnectionModal] Event listeners registered')
    
    return () => {
      window.removeEventListener(META_EVENTS.CONNECTION_CHANGED, handleConnectionChange)
      window.removeEventListener(META_EVENTS.PAYMENT_UPDATED, handleConnectionChange)
      window.removeEventListener(META_EVENTS.DISCONNECTION, handleConnectionChange)
      console.log('[MetaConnectionModal] Event listeners cleaned up')
    }
  }, [open, campaign?.id, loadConnectionStatus])

  const handleConnect = () => {
    if (!campaign?.id || isConnecting) return
    setIsConnecting(true)
    setStep('selecting')
    metaActions.connect()
    
    // Reset connecting state after a delay (popup launch)
    setTimeout(() => {
      setIsConnecting(false)
    }, 1000)
  }

  const handleReconnect = async () => {
    setStep('loading')
    await loadConnectionStatus()
  }

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Loading connection status...</p>
          </div>
        )
      
      case 'disconnected':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              We'll guide you through selecting your business, page, ad account, and verifying payment.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-sm flex-1">
                  <p className="font-semibold mb-1">Business & Assets</p>
                  <p className="text-muted-foreground text-xs">Select your business, Facebook page, and ad account</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-sm flex-1">
                  <p className="font-semibold mb-1">Payment Verification</p>
                  <p className="text-muted-foreground text-xs">Confirm your ad account has payment method configured</p>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'connected':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Successfully Connected</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your Meta business account is ready to launch ads
                </p>
              </div>
            </div>
            
            {summary && (
              <div className="space-y-2">
                {summary.business && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{summary.business.name || summary.business.id}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                )}
                
                {summary.page && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{summary.page.name || summary.page.id}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                )}
                
                {summary.adAccount && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{summary.adAccount.name || summary.adAccount.id}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      
      case 'error':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">Connection Issue</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error || 'There was a problem with your Meta connection.'}
                </p>
              </div>
            </div>
            
            {summary?.paymentStatus === 'missing' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <div className="ml-2">
                  <p className="font-medium">Payment Method Required</p>
                  <p className="text-sm">Your ad account needs a payment method before launching ads.</p>
                </div>
              </Alert>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  const renderFooter = () => {
    switch (step) {
      case 'disconnected':
        return (
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConnecting} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={isConnecting} className="flex-1 sm:flex-initial gap-2">
              <Facebook className="h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect Now'}
            </Button>
          </DialogFooter>
        )
      
      case 'connected':
        return (
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={handleReconnect} className="flex-1 sm:flex-initial">
              Refresh
            </Button>
            <Button onClick={() => {
              onSuccess()
              onOpenChange(false)
            }} className="flex-1 sm:flex-initial">
              Done
            </Button>
          </DialogFooter>
        )
      
      case 'error':
        return (
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button onClick={handleReconnect} className="flex-1 sm:flex-initial">
              Try Again
            </Button>
          </DialogFooter>
        )
      
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        {/* Gradient Header - matches AuthModal pattern */}
        <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-white">
          <div className="absolute top-4 right-4 opacity-20">
            <Facebook className="h-12 w-12" />
          </div>
          <DialogHeader className="space-y-3 relative">
            <DialogTitle className="text-2xl font-bold text-white">
              Meta Connection
            </DialogTitle>
            <DialogDescription className="text-blue-50 text-base">
              Connect your Facebook and Instagram accounts to launch ads
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content with padding */}
        <div className="p-6">
          {renderContent()}
        </div>
        
        {/* Footer with padding */}
        <div className="px-6 pb-6">
          {renderFooter()}
        </div>
      </DialogContent>
    </Dialog>
  )
}

