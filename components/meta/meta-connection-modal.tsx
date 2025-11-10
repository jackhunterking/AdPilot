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
import { Facebook, Instagram, Building2, CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import type { MetaConnectionSummary } from "@/lib/types/meta-integration"

interface MetaConnectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type ConnectionStep = 'loading' | 'disconnected' | 'selecting' | 'verifying' | 'connected' | 'error'

export function MetaConnectionModal({ open, onOpenChange, onSuccess }: MetaConnectionModalProps) {
  const { campaign } = useCampaignContext()
  const [step, setStep] = useState<ConnectionStep>('loading')
  const [summary, setSummary] = useState<MetaConnectionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && campaign?.id) {
      loadConnectionStatus()
    }
  }, [open, campaign?.id])

  const loadConnectionStatus = async () => {
    if (!campaign?.id) return
    
    setStep('loading')
    try {
      const res = await fetch(`/api/meta/connection?campaignId=${campaign.id}`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data.connection)
        
        if (data.connection.status === 'connected' && data.connection.paymentStatus === 'verified') {
          setStep('connected')
        } else if (data.connection.status === 'error' || data.connection.paymentStatus === 'missing') {
          setStep('error')
          setError('Connection or payment issue detected')
        } else {
          setStep('disconnected')
        }
      } else {
        throw new Error('Failed to load connection')
      }
    } catch (err) {
      setStep('error')
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }

  const handleConnect = async () => {
    if (!campaign?.id) return
    
    setStep('selecting')
    try {
      // Initiate Meta OAuth flow with proper callback endpoint
      const res = await fetch('/api/meta/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          redirectUrl: `${window.location.origin}/api/meta/auth/callback?type=system`,
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        
        // Set cookie for callback to retrieve campaign ID
        const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
        document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`
        
        // Redirect to Meta OAuth
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to initiate connection')
      }
    } catch (err) {
      setStep('error')
      setError(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  const handleReconnect = async () => {
    setStep('loading')
    await loadConnectionStatus()
  }

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Loading connection status...</p>
          </div>
        )
      
      case 'disconnected':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                <Facebook className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Connect Facebook & Instagram</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Meta business account to launch ads. We'll guide you through selecting your business, page, ad account, and verifying payment.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Business & Assets</p>
                  <p className="text-muted-foreground text-xs">Select your business, Facebook page, and ad account</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Payment Verification</p>
                  <p className="text-muted-foreground text-xs">Confirm your ad account has payment method configured</p>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'connected':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Successfully Connected</h3>
              <p className="text-sm text-muted-foreground">
                Your Meta business account is connected and ready to launch ads.
              </p>
            </div>
            
            {summary && (
              <div className="space-y-2">
                {summary.business && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{summary.business.name || summary.business.id}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                )}
                
                {summary.page && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{summary.page.name || summary.page.id}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                )}
                
                {summary.adAccount && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
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
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Connection Issue</h3>
              <p className="text-sm text-muted-foreground">
                {error || 'There was a problem with your Meta connection.'}
              </p>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect}>
              <Facebook className="h-4 w-4 mr-2" />
              Connect Now
            </Button>
          </DialogFooter>
        )
      
      case 'connected':
        return (
          <DialogFooter>
            <Button variant="outline" onClick={handleReconnect}>
              Refresh
            </Button>
            <Button onClick={() => {
              onSuccess()
              onOpenChange(false)
            }}>
              Done
            </Button>
          </DialogFooter>
        )
      
      case 'error':
        return (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleReconnect}>
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Meta Connection</DialogTitle>
          <DialogDescription>
            Connect your Facebook and Instagram accounts to launch ads
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
        {renderFooter()}
      </DialogContent>
    </Dialog>
  )
}

