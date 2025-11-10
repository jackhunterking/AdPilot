"use client"

/**
 * Feature: Campaign Budget Panel
 * Purpose: Side panel for setting/adjusting campaign budget with AI distribution preview
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { DollarSign, TrendingUp, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import type { BudgetAllocation } from "@/lib/types/meta-integration"

interface BudgetPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBudget?: number | null
  onSave: (budget: number) => void
}

export function BudgetPanel({ open, onOpenChange, currentBudget, onSave }: BudgetPanelProps) {
  const { campaign } = useCampaignContext()
  const [budget, setBudget] = useState<number>(currentBudget || 100)
  const [loading, setLoading] = useState(false)
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && campaign?.id && budget > 0) {
      fetchDistribution()
    }
  }, [open, budget, campaign?.id])

  const fetchDistribution = async () => {
    if (!campaign?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/budget/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          totalBudget: budget,
          strategy: 'ai_distribute',
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setAllocations(data.budget.allocations || [])
      } else {
        throw new Error('Failed to calculate distribution')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Distribution failed')
      setAllocations([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    onSave(budget)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Campaign Budget</DialogTitle>
          <DialogDescription>
            Set your total campaign budget. AI will distribute it optimally across your ads.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Budget Input */}
          <div className="space-y-3">
            <Label htmlFor="budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Campaign Budget (USD)
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="budget"
                type="number"
                min={10}
                step={10}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="text-2xl font-bold"
              />
            </div>
            <Slider
              min={10}
              max={10000}
              step={10}
              value={[budget]}
              onValueChange={([val]) => val !== undefined && setBudget(val)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Minimum $10, recommended $100+ for better results
            </p>
          </div>

          {/* AI Distribution Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-sm">AI Budget Distribution</h4>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            ) : allocations.length > 0 ? (
              <div className="space-y-2">
                {allocations.map((alloc) => (
                  <div key={alloc.adId} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alloc.adName}</p>
                      <p className="text-xs text-muted-foreground">{alloc.reasonCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">
                        ${alloc.recommendedBudget.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((alloc.recommendedBudget / budget) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No ads yet. Budget will be distributed once you create ads.
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              AI continuously optimizes budget allocation based on ad performance. You can adjust the total budget anytime.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={budget < 10}>
            Save Budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

