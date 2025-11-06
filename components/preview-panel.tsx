"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, ImageIcon, Video, Layers, Sparkles, DollarSign, Plus, Minus, Building2, Check, Facebook, Loader2, Edit2, Palette, Type, MapPin, Target, Rocket, Flag, Link2 } from "lucide-react"
import { LocationSelectionCanvas } from "./location-selection-canvas"
import { AudienceSelectionCanvas } from "./audience-selection-canvas"
import { AdCopySelectionCanvas } from "./ad-copy-selection-canvas"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { GoalSelectionCanvas } from "./goal-selection-canvas"
import { CampaignStepper } from "./campaign-stepper"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBudget } from "@/lib/context/budget-context"
import { useLocation } from "@/lib/context/location-context"
import { useAudience } from "@/lib/context/audience-context"
import { useGoal } from "@/lib/context/goal-context"
import { useAdCopy } from "@/lib/context/ad-copy-context"
import { cn } from "@/lib/utils"
import { newEditSession } from "@/lib/utils/edit-session"
// Removed two-step Meta connect flow; using single summary card
import { MetaConnectCard } from "@/components/meta/MetaConnectCard"
import { LocationSummaryCard } from "@/components/launch/location-summary-card"
import { AudienceSummaryCard } from "@/components/launch/audience-summary-card"
import { FormSummaryCard } from "@/components/launch/form-summary-card"
import { BudgetSchedule } from "@/components/forms/budget-schedule"
import { useCampaignContext } from "@/lib/context/campaign-context"
import type { Database } from "@/lib/supabase/database.types"

const mockAdAccounts = [
  { id: "act_123456789", name: "Main Business Account", currency: "USD" },
  { id: "act_987654321", name: "Marketing Campaign Account", currency: "USD" },
  { id: "act_456789123", name: "Test Account", currency: "CAD" },
]

export function PreviewPanel() {
  const [activeFormat, setActiveFormat] = useState("feed")
  // Removed regenerate feature: no regenerating state
  const { adContent, setAdContent, isPublished, setIsPublished, selectedImageIndex, setSelectedCreativeVariation, setSelectedImageIndex } = useAdPreview()
  const { budgetState, setDailyBudget, setSelectedAdAccount, setIsConnected, isComplete } = useBudget()
  const { campaign } = useCampaignContext()
  const { locationState } = useLocation()
  const { audienceState } = useAudience()
  const { goalState } = useGoal()
  const { adCopyState, getActiveVariations } = useAdCopy()
  const [showReelMessage, setShowReelMessage] = useState(false)
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetInputValue, setBudgetInputValue] = useState(budgetState.dailyBudget.toString())
  
  // Listen for image edit events from AI chat (always mounted)
  useEffect(() => {
    const handleImageEdited = (event: Event) => {
      const customEvent = event as CustomEvent<{ sessionId?: string; variationIndex: number; newImageUrl: string }>;
      const { sessionId, variationIndex, newImageUrl } = customEvent.detail;
      // Only accept tool-originated updates that carry a sessionId
      if (!sessionId) return;
      
      console.log(`[CANVAS] Received imageEdited event for variation ${variationIndex}:`, newImageUrl);
      
      // Update ad content with new image URL using functional update to avoid stale closure
      setAdContent((prev) => {
        if (!prev?.imageVariations) {
          console.warn(`[CANVAS] No imageVariations to update`);
          return prev;
        }
        const updatedVariations = [...prev.imageVariations];
        updatedVariations[variationIndex] = newImageUrl;
        console.log(`[CANVAS] ✅ Updated variation ${variationIndex} with new image`);
        console.log(`[CANVAS] 📤 Auto-save will trigger (context change)`);
        return {
          ...prev,
          imageVariations: updatedVariations,
        };
      });
    };
    
    window.addEventListener('imageEdited', handleImageEdited);
    
    return () => {
      window.removeEventListener('imageEdited', handleImageEdited);
    };
  }, [setAdContent]);
  
  const minBudget = 5
  const maxBudget = 100
  const increment = 5

  const previewFormats = [
    { id: "feed", label: "Feed", icon: ImageIcon },
    { id: "story", label: "Story", icon: Layers },
    { id: "reel", label: "Reel", icon: Video },
  ]

  const handleReelClick = () => {
    setShowReelMessage(true)
    setTimeout(() => setShowReelMessage(false), 2500)
  }

  const handleIncrementBudget = () => {
    const newBudget = Math.min(budgetState.dailyBudget + increment, maxBudget)
    setDailyBudget(newBudget)
    setBudgetInputValue(newBudget.toString())
  }

  const handleDecrementBudget = () => {
    const newBudget = Math.max(budgetState.dailyBudget - increment, minBudget)
    setDailyBudget(newBudget)
    setBudgetInputValue(newBudget.toString())
  }

  const handleBudgetClick = () => {
    setIsEditingBudget(true)
    setBudgetInputValue(budgetState.dailyBudget.toString())
  }

  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setBudgetInputValue(value)
  }

  const handleBudgetInputBlur = () => {
    const numValue = Number.parseInt(budgetInputValue) || minBudget
    const clampedValue = Math.max(minBudget, Math.min(maxBudget, numValue))
    setDailyBudget(clampedValue)
    setBudgetInputValue(clampedValue.toString())
    setIsEditingBudget(false)
  }

  const handleBudgetInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBudgetInputBlur()
    } else if (e.key === "Escape") {
      setIsEditingBudget(false)
      setBudgetInputValue(budgetState.dailyBudget.toString())
    }
  }

  const handleAccountSelect = (accountId: string) => {
    setSelectedAdAccount(accountId)
  }

  const handleConnectMeta = () => {
    // Simulate Meta connection
    setIsConnected(true)
    // In real implementation, this would open OAuth flow
  }

  const handlePublish = async () => {
    if (!campaign?.id) return
    if (!allStepsComplete) return
    try {
      // Branch by goal: leads (existing orchestrator) vs calls/website
      const goal = goalState.selectedGoal
      if (goal === 'leads') {
        const res = await fetch('/api/meta/ads/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id, publish: true }),
        })
        if (res.ok) setIsPublished(true)
        return
      }

      if (goal === 'website-visits') {
        // Create Traffic assets (paused)
        const createRes = await fetch('/api/meta/campaigns/create-traffic-ad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id }),
        })
        const created: unknown = await createRes.json()
        if (!createRes.ok || !created || typeof created !== 'object' || created === null || typeof (created as { id?: unknown }).id !== 'string') {
          return
        }
        const adId = (created as { id: string }).id
        // Publish ad
        const pubRes = await fetch('/api/meta/ads/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id, targetType: 'ad', targetId: adId })
        })
        if (pubRes.ok) setIsPublished(true)
        return
      }

      if (goal === 'calls') {
        // Create Calls assets (paused)
        const createRes = await fetch('/api/meta/campaigns/create-call-ad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id }),
        })
        const created: unknown = await createRes.json()
        if (!createRes.ok || !created || typeof created !== 'object' || created === null || typeof (created as { id?: unknown }).id !== 'string') {
          return
        }
        const adId = (created as { id: string }).id
        // Publish ad
        const pubRes = await fetch('/api/meta/ads/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id, targetType: 'ad', targetId: adId })
        })
        if (pubRes.ok) setIsPublished(true)
        return
      }
    } catch {
      // ignore
    }
  }

  const handleSelectAd = (index: number) => {
    // Toggle selection against persisted selectedImageIndex
    if (selectedImageIndex === index) {
      setSelectedCreativeVariation(null)
      setSelectedImageIndex(null)
      return
    }
    const variation = adVariations[index]
    if (!variation) return
    
    setSelectedCreativeVariation(variation)
    setSelectedImageIndex(index)
  }

  const handleEditAd = (index: number) => {
    // Send variation to AI chat for editing with rich visual reference
    const variation = adVariations[index]
    if (!variation) return
    const currentFormat = activeFormat
    
    // Get the actual generated image for this variation if it exists
    const variationImageUrl = adContent?.imageVariations?.[index]
    
    // Create reference context for the AI chat to render
    const editSession = newEditSession({
      variationIndex: index,
      imageUrl: variationImageUrl,
    })

    const referenceContext = {
      type: 'ad_variation_reference',
      action: 'edit',
      variationIndex: index,
      variationTitle: variation.title,
      format: currentFormat,
      gradient: variation.gradient,
      imageUrl: variationImageUrl, // Use the specific variation's image
      editSession,
      
      // Ad copy content for the reference card
      content: {
        primaryText: adContent?.body,
        headline: adContent?.headline,
        description: adContent?.body,
      },
      
      // Visual preview data
      preview: {
        format: currentFormat,
        gradient: variation.gradient,
        title: variation.title,
        imageUrl: variationImageUrl, // Include in preview as well
        brandName: 'Your Brand',
        headline: adContent?.headline,
        body: adContent?.body,
        dimensions: currentFormat === 'story' 
          ? { width: 360, height: 640, aspect: '9:16' }
          : { width: 500, height: 500, aspect: '1:1' }
      },
      
    // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        editMode: true,
        selectedFormat: currentFormat
      }
    }
    
    // Only dispatch one event to show reference and enable edit mode
    // Do NOT send a message automatically
    window.dispatchEvent(new CustomEvent('openEditInChat', { 
      detail: referenceContext
    }))
  }

  // Removed regenerate handler

  // Check if all steps are complete
  const allStepsComplete = 
    selectedImageIndex !== null &&
    adCopyState.status === "completed" &&
    locationState.status === "completed" &&
    audienceState.status === "completed" &&
    goalState.status === "completed" &&
    isComplete()

  // Mock ad variations with different gradients
  const adVariations = [
    { gradient: "from-blue-600 via-blue-500 to-cyan-500", title: "Variation 1" },
    { gradient: "from-purple-600 via-purple-500 to-pink-500", title: "Variation 2" },
    { gradient: "from-green-600 via-green-500 to-emerald-500", title: "Variation 3" },
  ]

  // Render single Feed ad mockup
  const renderFeedAd = (variation: typeof adVariations[0], index: number) => {
    const isSelected = selectedImageIndex === index
    const isProcessing = false
    
    return (
      <div 
        key={index} 
        className={`rounded-lg border-2 bg-card overflow-hidden hover:shadow-lg transition-all relative group ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border'
        } ${isProcessing ? 'opacity-75' : ''}`}
      >
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="bg-card/95 rounded-xl px-4 py-3 shadow-2xl border border-border/50 flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">
                Regenerating...
              </span>
            </div>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && !isProcessing && (
          <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        )}

        {/* Action Buttons Overlay */}
        {!isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex items-center justify-center p-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isSelected ? "default" : "secondary"}
                onClick={() => handleSelectAd(index)}
                className={cn(
                  "text-xs h-8 px-3 font-medium backdrop-blur-sm",
                  isSelected ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-400" : "bg-white/90 hover:bg-white text-black"
                )}
                
              >
                {isSelected ? 'Unselect' : 'Select'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleEditAd(index)}
                className="text-xs h-8 px-3 font-medium bg-white/90 hover:bg-white text-black backdrop-blur-sm"
                
              >
                <Edit2 className="h-3 w-3 mr-1.5" />
                Edit
              </Button>
              
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">Your Brand</p>
            <p className="text-[10px] text-muted-foreground">Sponsored</p>
          </div>
        </div>

        {adContent?.imageVariations?.[index] ? (
          <div className="aspect-square relative overflow-hidden">
            <img
              src={adContent.imageVariations[index]}
              alt={adContent.headline}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`aspect-square bg-gradient-to-br ${variation.gradient} flex items-center justify-center`}>
            <div className="text-center text-white p-4">
              <p className="text-sm font-bold">{variation.title}</p>
            </div>
          </div>
        )}

        <div className="p-3 space-y-2">
          <div className="flex items-center gap-3">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          {(() => {
            const variations = getActiveVariations()
            const copy = adCopyState.selectedCopyIndex != null ? variations[adCopyState.selectedCopyIndex] : undefined
            if (!copy) {
              return (
                <p className="text-xs line-clamp-2">
                  <span className="font-semibold">Your Brand</span>{" "}
                  {adContent?.body || "Your ad caption goes here..."}
                </p>
              )
            }
            return (
              <>
                <p className="text-xs line-clamp-3"><span className="font-semibold">Your Brand</span> {copy.primaryText}</p>
                <div className="bg-muted rounded-lg p-2.5 space-y-1">
                  <p className="text-xs font-bold line-clamp-1">{copy.headline}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{copy.description}</p>
                  <Button size="sm" className="w-full mt-1.5 h-7 text-[10px] bg-[#4B73FF] hover:bg-[#3d5fd9]" disabled>
                    {adContent?.cta || 'Learn More'}
                  </Button>
                </div>
              </>
            )
          })()}
        </div>
      </div>
    )
  }

  // Render single Story ad mockup
  const renderStoryAd = (variation: typeof adVariations[0], index: number) => {
    const isSelected = selectedImageIndex === index
    const isProcessing = false
    
    return (
      <div 
        key={index} 
        className={`aspect-[9/16] rounded-lg border-2 bg-card overflow-hidden relative hover:shadow-lg transition-all group ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border'
        } ${isProcessing ? 'opacity-75' : ''}`}
      >
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-30 flex items-center justify-center">
            <div className="bg-card/95 rounded-xl px-4 py-3 shadow-2xl border border-border/50 flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-xs font-medium text-center">
                Regenerating...
              </span>
            </div>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && !isProcessing && (
          <div className="absolute top-2 right-2 z-20 bg-blue-500 text-white rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        )}

        {/* Action Buttons Overlay */}
        {!isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex items-center justify-center p-3">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <Button
                size="sm"
                variant={isSelected ? "default" : "secondary"}
                onClick={() => handleSelectAd(index)}
                className={cn(
                  "text-xs h-8 px-2.5 font-medium backdrop-blur-sm",
                  isSelected ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-400" : "bg-white/95 hover:bg-white text-black"
                )}
                
              >
                {isSelected ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Selected
                  </>
                ) : (
                  'Select'
                )}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleEditAd(index)}
                className="text-xs h-8 px-2.5 font-medium bg-white/95 hover:bg-white text-black backdrop-blur-sm"
                
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              
            </div>
          </div>
        )}

        {adContent?.imageVariations?.[index] ? (
          <div className="absolute inset-0">
            {/* Background fill (blur/gradient) */}
            <img src={adContent.imageVariations[index]} alt="bg" className="w-full h-full object-cover blur-lg scale-110 opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            {/* Foreground exact square (parity with square) */}
            <div className="absolute inset-0 flex items-center justify-center p-3">
              <div className="aspect-square w-[82%] max-w-[82%] rounded-md overflow-hidden shadow-md">
                <img src={adContent.imageVariations[index]} alt={adContent.headline} className="w-full h-full object-contain bg-black/20" />
              </div>
            </div>
          </div>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${variation.gradient}`} />
        )}
        
        <div className="relative z-10 p-3">
          <div className="h-0.5 bg-white/30 rounded-full mb-3">
            <div className="h-full w-1/3 bg-white rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white flex-shrink-0" />
            <p className="text-white text-xs font-semibold truncate">Your Brand</p>
          </div>
        </div>

        {(() => {
          const variations = getActiveVariations()
          const copy = adCopyState.selectedCopyIndex != null ? variations[adCopyState.selectedCopyIndex] : undefined
          const hints: string[] = []
          if (copy) {
            const ptLen = copy.primaryText?.length || 0
            const hlLen = copy.headline?.length || 0
            const dsLen = copy.description?.length || 0
            if (ptLen > 110) hints.push('Primary text near 125-char limit')
            if (hlLen > 35) hints.push('Headline near 40-char limit')
            if (dsLen > 26) hints.push('Description near 30-char limit')
            if (copy.overlay?.density && copy.overlay.density !== 'text-only') {
              hints.push('Check text contrast against background')
            }
          }
          return (
            <div className="absolute bottom-6 left-0 right-0 px-3 z-10 space-y-2">
              {copy ? (
                <>
                  {copy.overlay?.density === 'text-only' ? (
                    <div className="bg-black/60 rounded-md p-3">
                      <p className="text-white font-bold text-sm text-center">
                        {copy.overlay?.headline || copy.overlay?.offer || copy.headline}
                      </p>
                      {copy.overlay?.body ? (
                        <p className="text-white/90 text-xs mt-1 text-center">{copy.overlay.body}</p>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                        <p className="text-white text-xs line-clamp-2 font-medium">{copy.primaryText}</p>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                        <p className="text-white font-bold text-xs line-clamp-1">{copy.headline}</p>
                      </div>
                    </>
                  )}
                </>
              ) : null}
              <div className="bg-white/20 backdrop-blur-sm rounded-full py-2 px-4 text-center">
                <p className="text-white font-semibold text-xs truncate">{adContent?.cta || 'Learn More'}</p>
              </div>
              {hints.length > 0 && (
                <div className="text-[10px] text-white/80 text-center">
                  {hints.join(' • ')}
                </div>
              )}
            </div>
          )
        })()}

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <p className="text-white text-xs font-bold opacity-50">{variation.title}</p>
        </div>
      </div>
    )
  }

  // Step 1: Ads Content with 3x2 Grid
  const adsContent = (
    <div className="space-y-6">
      <div className="flex justify-center pb-4">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
          {previewFormats.map((format) => {
            const Icon = format.icon
            const isActive = activeFormat === format.id

            if (format.id === "reel") {
              return (
                <div key={format.id} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReelClick}
                    className="px-4 relative"
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {format.label}
                    <Sparkles size={10} className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
                  </Button>
                  {showReelMessage && (
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="bg-popover border border-border rounded-md px-3 py-1.5 shadow-md">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Sparkles size={12} className="text-yellow-500" />
                          <span className="font-medium">Coming Soon!</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Button
                key={format.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFormat(format.id)}
                className="px-4"
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {format.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* 3x2 Grid of Ad Mockups */}
      <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
        {activeFormat === "feed" && adVariations.map((variation, index) => renderFeedAd(variation, index))}
        {activeFormat === "story" && adVariations.map((variation, index) => renderStoryAd(variation, index))}
      </div>

      {/* Info Section */}
      {!adContent?.imageVariations && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">Hover over any ad to select or edit</p>
        </div>
      )}
    </div>
  )

  // Step 5: Launch Content (new unified layout)
  const launchContent = (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
      {/* Left: Full ad mockup using selected variation */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Ad Preview</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'ads' } }))}
            className="h-7 px-3"
          >
            Edit
          </Button>
        </div>
        {/* Format selector (matches creator) */}
        <div className="flex justify-center pb-4">
          <div className="inline-flex rounded-lg border border-border p-1 bg-card">
            {previewFormats.map((format) => {
              const Icon = format.icon
              const isActive = activeFormat === format.id

              if (format.id === "reel") {
                return (
                  <div key={format.id} className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReelClick}
                      className="px-4 relative"
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      {format.label}
                      <Sparkles size={10} className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
                    </Button>
                    {showReelMessage && (
                      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="bg-popover border border-border rounded-md px-3 py-1.5 shadow-md">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Sparkles size={12} className="text-yellow-500" />
                            <span className="font-medium">Coming Soon!</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <Button
                  key={format.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFormat(format.id)}
                  className="px-4"
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {format.label}
                </Button>
              )
            })}
          </div>
        </div>

        {activeFormat === "story"
          ? adVariations.map((v, i) => selectedImageIndex === i && renderStoryAd(v, i))
          : adVariations.map((v, i) => selectedImageIndex === i && renderFeedAd(v, i))}
      </div>

      {/* Right: Summary stack */}
      <div className="flex flex-col gap-4 max-w-3xl mx-auto">
        <MetaConnectCard />
        <LocationSummaryCard />
        <AudienceSummaryCard />
        <FormSummaryCard />

        <BudgetSchedule />

        {/* Removed old inline budget block in favor of BudgetSchedule */}

        {/* Publish CTA - Always visible with step counter */}
        <div className={cn(
          "rounded-lg border p-4",
          allStepsComplete 
            ? "border-green-500/30 bg-green-500/5" 
            : "border-border bg-card"
        )}>
          {allStepsComplete ? (
            <>
              <h3 className="font-semibold mb-1">Ready to Publish!</h3>
              <p className="text-sm text-muted-foreground mb-3">All steps completed. Review your campaign and publish when ready.</p>
            </>
          ) : (
            <>
              <h3 className="font-semibold mb-1">Complete All Steps</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {(() => {
                  const completedCount = [
                    selectedImageIndex !== null,
                    adCopyState.status === "completed",
                    locationState.status === "completed",
                    audienceState.status === "completed",
                    (() => {
                      const states = campaign?.campaign_states as Database['public']['Tables']['campaign_states']['Row'] | null | undefined
                      const serverConnected = Boolean((states as unknown as { meta_connect_data?: { status?: string } } | null | undefined)?.meta_connect_data && (states as unknown as { meta_connect_data?: { status?: string } }).meta_connect_data?.status === 'connected')
                      return serverConnected || budgetState.isConnected === true
                    })(),
                    goalState.status === "completed"
                  ].filter(Boolean).length
                  return `${completedCount} of 6 steps completed`
                })()}
              </p>
            </>
          )}
          <Button 
            onClick={handlePublish} 
            disabled={!allStepsComplete} 
            size="lg" 
            className="w-full gap-2 bg-[#4B73FF] hover:bg-[#3d5fd9] disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {isPublished ? 'Unpublish Campaign' : 'Publish Campaign'}
          </Button>
        </div>
      </div>
    </div>
  )

  const steps = [
    {
      id: "ads",
      number: 1,
      title: "Ad Creative",
      description: "Select your ad creative design",
      completed: selectedImageIndex !== null,
      content: adsContent,
      icon: Palette,
    },
    {
      id: "copy",
      number: 2,
      title: "Ad Copy",
      description: "Choose your ad copy with headline and description",
      completed: adCopyState.status === "completed",
      content: <AdCopySelectionCanvas />,
      icon: Type,
    },
    {
      id: "location",
      number: 3,
      title: "Target Location",
      description: "Choose where you want your ads to be shown",
      completed: locationState.status === "completed",
      content: <LocationSelectionCanvas />,
      icon: MapPin,
    },
    {
      id: "audience",
      number: 4,
      title: "Define Audience",
      description: "Select who should see your ads",
      completed: audienceState.status === "completed",
      content: <AudienceSelectionCanvas />,
      icon: Target,
    },
    {
      id: "meta-connect",
      number: 5,
      title: "Connect Facebook & Instagram",
      description: "Authenticate and select Page, IG (optional) and Ad Account",
      completed: ((): boolean => {
        const states = campaign?.campaign_states as Database['public']['Tables']['campaign_states']['Row'] | null | undefined
        const serverConnected = Boolean((states as unknown as { meta_connect_data?: { status?: string } } | null | undefined)?.meta_connect_data && (states as unknown as { meta_connect_data?: { status?: string } }).meta_connect_data?.status === 'connected')
        return serverConnected || budgetState.isConnected === true
      })(),
      content: (
        <div className="p-2">
          <div className="max-w-3xl mx-auto">
            <MetaConnectCard mode="step" />
          </div>
        </div>
      ),
      icon: Link2,
    },
    {
      id: "goal",
      number: 6,
      title: "Set Your Goal",
      description: "Choose what you want to achieve with your ads",
      completed: goalState.status === "completed",
      content: <GoalSelectionCanvas />,
      icon: Flag,
    },
    {
      id: "budget",
      number: 7,
      title: "Launch Campaign",
      description: "Review details and publish your ads",
      completed: isComplete(),
      content: launchContent,
      icon: Rocket,
    },
  ]

  return (
    <div className="flex h-full flex-col relative">
      <div className="flex-1 overflow-hidden bg-muted border border-border rounded-tl-lg">
        <CampaignStepper steps={steps} campaignId={campaign?.id} />
      </div>
    </div>
  )
}
