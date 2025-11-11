/**
 * Feature: Ad Approval Panel (Dev/Admin Only)
 * Purpose: Debug panel for manually approving/rejecting ads during development
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Supabase: https://supabase.com/docs/guides/database
 * 
 * NOTE: This panel is for testing only. In production, approvals come from Meta webhooks.
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdStatusBadge } from "@/components/ui/ad-status-badge"
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { AdVariant } from "@/lib/types/workspace"

interface AdApprovalPanelProps {
  ads: AdVariant[]
  campaignId: string
  onAdUpdated?: () => void
  className?: string
}

export function AdApprovalPanel({
  ads,
  campaignId,
  onAdUpdated,
  className,
}: AdApprovalPanelProps) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  // Filter to pending ads
  const pendingAds = ads.filter(ad => ad.status === 'pending_approval')
  
  if (pendingAds.length === 0) {
    return null
  }
  
  const handleApprove = async (adId: string) => {
    setProcessing(adId)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/ads/${adId}/approve`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Failed to approve ad')
        return
      }
      
      const data = await response.json()
      toast.success('Ad approved successfully!')
      onAdUpdated?.()
    } catch (error) {
      console.error('[AdApprovalPanel] Approve error:', error)
      toast.error('Failed to approve ad')
    } finally {
      setProcessing(null)
    }
  }
  
  const handleReject = async (adId: string) => {
    const reason = rejectionReasons[adId] || 'Ad does not comply with Meta advertising policies'
    
    setProcessing(adId)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/ads/${adId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Failed to reject ad')
        return
      }
      
      const data = await response.json()
      toast.success('Ad rejected')
      onAdUpdated?.()
    } catch (error) {
      console.error('[AdApprovalPanel] Reject error:', error)
      toast.error('Failed to reject ad')
    } finally {
      setProcessing(null)
    }
  }
  
  return (
    <Card className={`p-4 border-yellow-200 bg-yellow-50 ${className}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-full bg-yellow-100 p-2">
          <RefreshCw className="h-4 w-4 text-yellow-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-yellow-900">
            Dev Panel: Manual Ad Approval
          </h3>
          <p className="text-xs text-yellow-700 mt-1">
            {pendingAds.length} ad{pendingAds.length !== 1 ? 's' : ''} pending approval. In production, Meta approves/rejects ads automatically.
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        {pendingAds.map((ad) => (
          <Card key={ad.id} className="p-3 bg-white">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{ad.name}</h4>
                  <AdStatusBadge status={ad.status} size="sm" showTooltip={false} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(ad.published_at || '').toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            
            {/* Rejection reason input */}
            <div className="mb-3">
              <Label htmlFor={`reason-${ad.id}`} className="text-xs">
                Rejection Reason (optional)
              </Label>
              <Textarea
                id={`reason-${ad.id}`}
                placeholder="Enter reason for rejection..."
                value={rejectionReasons[ad.id] || ''}
                onChange={(e) =>
                  setRejectionReasons((prev) => ({
                    ...prev,
                    [ad.id]: e.target.value,
                  }))
                }
                className="mt-1 h-16 text-xs"
                disabled={processing === ad.id}
              />
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleApprove(ad.id)}
                disabled={processing !== null}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {processing === ad.id ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                Approve
              </Button>
              <Button
                onClick={() => handleReject(ad.id)}
                disabled={processing !== null}
                size="sm"
                variant="destructive"
                className="flex-1"
              >
                {processing === ad.id ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  )
}

