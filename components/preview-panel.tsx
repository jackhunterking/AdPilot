"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Play, ImageIcon, Video, Layers, Sparkles, DollarSign, Plus, Minus, Building2, Check, Facebook, Loader2, Edit2, Palette, Type, MapPin, Target, Rocket, Flag, Link2, MoreVertical, Globe, Heart, ThumbsUp, MessageCircle, Share2, ChevronDown, AlertTriangle, ChevronUp } from "lucide-react"
import { LocationSelectionCanvas } from "./location-selection-canvas"
import { AudienceSelectionCanvas } from "./audience-selection-canvas"
import { AdCopySelectionCanvas } from "./ad-copy-selection-canvas"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { GoalSelectionCanvas } from "./goal-selection-canvas"
import { GoalSummaryCard } from "@/components/launch/goal-summary-card"
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
import { BudgetSchedule } from "@/components/forms/budget-schedule"
import { useCampaignContext } from "@/lib/context/campaign-context"
import type { Database } from "@/lib/supabase/database.types"
import { metaStorage } from "@/lib/meta/storage"
import { CollapsibleSection } from "@/components/launch/collapsible-section"
import { SectionEditModal } from "@/components/launch/section-edit-modal"
import { PublishBudgetCard } from "@/components/launch/publish-budget-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

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
  
  // Modal state management for section editing
  const [metaModalOpen, setMetaModalOpen] = useState(false)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [audienceModalOpen, setAudienceModalOpen] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  // Memoized Meta connection completion check - reacts to campaign state and budget state changes
  const isMetaConnectionComplete = useMemo(() => {
    // Check database state first
    const states = campaign?.campaign_states as Database['public']['Tables']['campaign_states']['Row'] | null | undefined
    const metaConnectData = (states as unknown as { meta_connect_data?: { status?: string } } | null | undefined)?.meta_connect_data
    const serverConnected = Boolean(metaConnectData?.status === 'connected' || metaConnectData?.status === 'selected_assets')
    
    // Check budget state
    const budgetConnected = budgetState.isConnected === true
    
    // Check localStorage as fallback (for immediate UI updates before server sync)
    let localStorageConnected = false
    if (campaign?.id && typeof window !== 'undefined') {
      try {
        const connectionData = metaStorage.getConnection(campaign.id)
        if (connectionData) {
          const summary = metaStorage.getConnectionSummary(campaign.id)
          localStorageConnected = Boolean(
            summary?.status === 'connected' || 
            summary?.status === 'selected_assets' ||
            (summary?.adAccount?.id && summary?.business?.id)
          )
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    
    return serverConnected || budgetConnected || localStorageConnected
  }, [campaign?.campaign_states, campaign?.id, budgetState.isConnected])

  // Close modals when sections complete
  useEffect(() => {
    if (locationState.status === "completed" && locationModalOpen) {
      setLocationModalOpen(false)
    }
  }, [locationState.status, locationModalOpen])

  useEffect(() => {
    if (audienceState.status === "completed" && audienceModalOpen) {
      setAudienceModalOpen(false)
    }
  }, [audienceState.status, audienceModalOpen])

  useEffect(() => {
    if (goalState.status === "completed" && goalModalOpen) {
      setGoalModalOpen(false)
    }
  }, [goalState.status, goalModalOpen])

  useEffect(() => {
    if (isMetaConnectionComplete && metaModalOpen) {
      // Don't auto-close meta modal as it may need payment setup
      // setMetaModalOpen(false)
    }
  }, [isMetaConnectionComplete, metaModalOpen])
  
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

  // Render single Feed ad mockup (Facebook pixel-perfect format)
  const renderFeedAd = (variation: typeof adVariations[0], index: number) => {
    const isSelected = selectedImageIndex === index
    const isProcessing = false
    
    return (
      <div 
        key={index} 
        className={`rounded-lg border-2 bg-white overflow-hidden hover:shadow-lg transition-all relative group ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-[#CED0D4]'
        } ${isProcessing ? 'opacity-75' : ''}`}
        style={{ borderRadius: '8px' }}
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

        {/* Header Section - Facebook Style */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#CED0D4]" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px' }}>
          {/* Profile Picture - 40px circle, solid blue */}
          <div className="h-10 w-10 rounded-full bg-[#1877F2] flex-shrink-0" style={{ width: '40px', height: '40px' }} />
          
          {/* Business Name & Sponsored */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-[#050505]" style={{ fontSize: '15px', fontWeight: 600 }}>Business Name</p>
            <div className="flex items-center gap-1">
              <p className="text-[#65676B]" style={{ fontSize: '13px', fontWeight: 400 }}>Sponsored</p>
              <Globe className="h-3 w-3 text-[#65676B]" style={{ width: '12px', height: '12px' }} />
            </div>
          </div>
          
          {/* Options Icon - MoreVertical on right */}
          <MoreVertical className="h-5 w-5 text-[#65676B] flex-shrink-0 cursor-pointer hover:bg-[#F2F3F5] rounded-full p-1" style={{ width: '20px', height: '20px' }} />
        </div>

        {/* Primary Text Section - BEFORE Media */}
        <div className="px-3 pt-2 pb-3" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '12px' }}>
          <p className="text-[#050505] leading-[1.3333]" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '20px' }}>
            <Skeleton className="inline-block h-4 w-full" style={{ height: '20px' }} />
          </p>
        </div>

        {/* Media Section - Square (1:1) aspect ratio - 1080x1080 */}
        {adContent?.imageVariations?.[index] ? (
          <div className="relative overflow-hidden" style={{ aspectRatio: '1/1' }}>
            <img
              src={adContent.imageVariations[index]}
              alt={adContent.headline}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`relative overflow-hidden bg-[#1C1E21]`} style={{ aspectRatio: '1/1' }} />
        )}

        {/* Link Preview Section - Horizontal Layout */}
        <div className="flex items-start gap-3 px-3 py-3 border-b border-[#CED0D4]" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
          {/* Left Side - Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Website URL */}
            <p className="text-[#65676B] uppercase tracking-wide" style={{ fontSize: '11px', fontWeight: 400, letterSpacing: '0.5px' }}>
              YOURWEBSITE.HELLO
            </p>
            {/* Headline */}
            <p className="font-bold text-[#050505] line-clamp-1" style={{ fontSize: '17px', fontWeight: 700, lineHeight: '1.1765' }}>
              <Skeleton className="h-5 w-3/4" style={{ height: '20px' }} />
            </p>
            {/* Description */}
            <p className="text-[#050505] line-clamp-2" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '1.3333' }}>
              <Skeleton className="h-4 w-full" style={{ height: '20px' }} />
            </p>
          </div>
          
          {/* Right Side - Learn more Button */}
          <button 
            className="flex-shrink-0 bg-[#E4E6EB] text-[#050505] font-semibold rounded-md px-3 py-2 hover:bg-[#D8DADF] transition-colors"
            style={{ 
              fontSize: '15px', 
              fontWeight: 600, 
              paddingLeft: '12px', 
              paddingRight: '12px', 
              paddingTop: '8px', 
              paddingBottom: '8px',
              borderRadius: '6px',
              minWidth: '100px'
            }}
            disabled
          >
            Learn more
          </button>
        </div>

        {/* Engagement Section */}
        <div>
          {/* Top Row - Reactions & Counts */}
          <div className="flex items-center justify-between px-2 py-1" style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px' }}>
            {/* Left Side - Reactions */}
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-4 w-4 text-[#1877F2]" style={{ width: '16px', height: '16px' }} />
              <p className="text-[#050505]" style={{ fontSize: '13px', fontWeight: 400 }}>Oliver, Sofia and 28 others</p>
            </div>
            
            {/* Right Side - Comments & Shares */}
            <p className="text-[#65676B]" style={{ fontSize: '13px', fontWeight: 400 }}>14 Comments 7 Shares</p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center border-t border-[#CED0D4]" style={{ borderTopWidth: '1px' }}>
            {/* Like Button */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <ThumbsUp className="h-5 w-5 text-[#65676B]" style={{ width: '20px', height: '20px' }} />
              <span className="text-[#65676B]" style={{ fontSize: '15px', fontWeight: 400 }}>Like</span>
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#CED0D4]" style={{ width: '1px' }} />
            
            {/* Comment Button */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <MessageCircle className="h-5 w-5 text-[#65676B]" style={{ width: '20px', height: '20px' }} />
              <span className="text-[#65676B]" style={{ fontSize: '15px', fontWeight: 400 }}>Comment</span>
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#CED0D4]" style={{ width: '1px' }} />
            
            {/* Share Button */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <Share2 className="h-5 w-5 text-[#65676B]" style={{ width: '20px', height: '20px' }} />
              <span className="text-[#65676B]" style={{ fontSize: '15px', fontWeight: 400 }}>Share</span>
            </button>
            
            {/* Dropdown Arrow */}
            <button className="px-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <ChevronDown className="h-4 w-4 text-[#65676B]" style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render single Story ad mockup (Meta pixel-perfect format)
  const renderStoryAd = (variation: typeof adVariations[0], index: number) => {
    const isSelected = selectedImageIndex === index
    const isProcessing = false
    
    return (
      <div 
        key={index} 
        className={`aspect-[9/16] rounded-lg border-2 bg-white overflow-hidden relative hover:shadow-lg transition-all group ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-[#CED0D4]'
        } ${isProcessing ? 'opacity-75' : ''}`}
        style={{ borderRadius: '8px' }}
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

        {/* Progress Bar - Top Edge */}
        <div className="absolute top-0 left-0 right-0 z-30" style={{ height: '2px' }}>
          <div className="h-full bg-[#CED0D4]">
            <div className="h-full bg-white" style={{ width: '33%' }} />
          </div>
        </div>

        {/* Header Section - Subtle Gray Bar */}
        <div className="relative z-20 bg-[#F2F3F5] px-3 py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px' }}>
          <div className="flex items-center gap-2">
            {/* Brand Logo - 40x40px */}
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0" style={{ width: '40px', height: '40px', borderRadius: '8px' }}>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
            </div>
            
            {/* Brand Name & Sponsored */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-[#333333]" style={{ fontSize: '15px', fontWeight: 600 }}>Business Name</p>
              <p className="text-[#65676B]" style={{ fontSize: '13px', fontWeight: 400 }}>Sponsored</p>
            </div>
            
            {/* Options Icon */}
            <MoreVertical className="h-5 w-5 text-[#65676B] flex-shrink-0 cursor-pointer" style={{ width: '20px', height: '20px' }} />
          </div>
        </div>

        {/* Main Creative Section - Full Screen Background */}
        <div className="absolute inset-0" style={{ top: '60px' }}>
          {adContent?.imageVariations?.[index] ? (
            <div className="relative w-full h-full">
              <img 
                src={adContent.imageVariations[index]} 
                alt={adContent.headline} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`relative w-full h-full bg-gradient-to-br ${variation.gradient}`} />
          )}
        </div>

        {/* Bottom Ad Copy/Engagement Section - Dark Background */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-[#242526]">
          {/* Information Text - Skeleton Loaders */}
          <div className="px-3 pt-3 pb-2" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '12px', paddingBottom: '8px' }}>
            <div className="space-y-1">
              {/* Primary Text Skeleton */}
              <Skeleton className="h-3.5 w-full bg-white/30" style={{ height: '14px' }} />
              {/* Description Skeleton */}
              <Skeleton className="h-3.5 w-3/4 bg-white/30" style={{ height: '14px' }} />
            </div>
          </div>
          
          {/* Expand Icon - ChevronUp */}
          <div className="flex justify-center py-1">
            <ChevronUp className="h-4 w-4 text-white" style={{ width: '16px', height: '16px' }} />
          </div>
          
          {/* Secondary CTA Button */}
          <div className="flex justify-center px-3 pb-3" style={{ paddingLeft: '12px', paddingRight: '12px', paddingBottom: '12px' }}>
            <button 
              className="bg-white text-[#333333] font-semibold rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
              style={{ 
                fontSize: '15px', 
                fontWeight: 600, 
                paddingLeft: '12px', 
                paddingRight: '12px', 
                paddingTop: '8px', 
                paddingBottom: '8px',
                borderRadius: '8px'
              }}
              disabled
            >
              Learn more
            </button>
          </div>
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

  // Calculate completed steps count
  const completedCount = useMemo(() => {
    return [
      selectedImageIndex !== null,
      adCopyState.status === "completed",
      locationState.status === "completed",
      audienceState.status === "completed",
      isMetaConnectionComplete,
      goalState.status === "completed"
    ].filter(Boolean).length
  }, [selectedImageIndex, adCopyState.status, locationState.status, audienceState.status, isMetaConnectionComplete, goalState.status])

  const totalSteps = 6

  // Summary content generators for each section
  const metaSummaryContent = (
    <div className="p-2">
      <div className="max-w-3xl mx-auto">
        <MetaConnectCard mode="step" />
      </div>
    </div>
  )

  const locationSummaryContent = (
    <LocationSelectionCanvas variant="summary" />
  )

  const audienceSummaryContent = (
    <AudienceSelectionCanvas variant="summary" />
  )

  const goalSummaryContent = useMemo(() => {
    const goal = goalState.selectedGoal
    const form = goalState.formData

    if (goal === "leads" && form?.name) {
      return (
        <GoalSummaryCard
          variant="leads"
          value={form.name}
          subtitle={form.id ? `Form ID: ${form.id}` : undefined}
        />
      )
    }

    if (goal === "website-visits" && form?.websiteUrl) {
      let display = form.displayLink
      try {
        if (!display) {
          const url = new URL(form.websiteUrl)
          display = url.hostname.replace(/^www\./, "")
        }
      } catch {
        display = form.websiteUrl
      }

      return (
        <GoalSummaryCard
          variant="website"
          value={display}
          subtitle={form.websiteUrl}
          helper="Forwarding to your landing page"
        />
      )
    }

    if (goal === "calls" && form?.phoneNumber) {
      return (
        <GoalSummaryCard
          variant="calls"
          value={form.phoneNumber}
          helper="Customers will call this number"
        />
      )
    }

    return (
      <GoalSummaryCard
        variant="leads"
        value="Goal not configured"
        helper="Select a goal to complete this step"
      />
    )
  }, [goalState.selectedGoal, goalState.formData])

  const budgetSummaryContent = useMemo(() => {
    return `$${budgetState.dailyBudget}/day`
  }, [budgetState.dailyBudget])

  // Step 5: Launch Content (new unified layout with collapsible sections)
  const launchContent = (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
      {/* Left: Full ad mockup using selected variation */}
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Ad Preview</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Format selector (matches creator) */}
          <div className="flex justify-center">
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

          <div>
            {activeFormat === "story"
              ? adVariations.map((v, i) => selectedImageIndex === i && renderStoryAd(v, i))
              : adVariations.map((v, i) => selectedImageIndex === i && renderFeedAd(v, i))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t pt-4">
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <Button
              variant="secondary"
              onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'ads' } }))}
              className="justify-center"
            >
              <Palette className="h-4 w-4 mr-2" />
              Edit Ad Creative
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'copy' } }))}
              className="justify-center"
            >
              <Type className="h-4 w-4 mr-2" />
              Edit Ad Copy
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Right: Collapsible sections with modals */}
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        {/* Combined Publish and Budget Card */}
        <PublishBudgetCard
          allStepsComplete={allStepsComplete}
          completedCount={completedCount}
          totalSteps={totalSteps}
          isPublished={isPublished}
          onPublish={handlePublish}
          budgetSummaryContent={budgetSummaryContent}
          isBudgetComplete={isComplete()}
          budgetEditContent={<BudgetSchedule variant="inline" />}
        />

        {/* Meta Connect Section */}
        <CollapsibleSection
          title="Connect Facebook & Instagram"
          icon={Link2}
          isComplete={isMetaConnectionComplete}
          summaryContent={metaSummaryContent}
          onEdit={() => setMetaModalOpen(true)}
        />

        {/* Location Section */}
        <CollapsibleSection
          title="Target Locations"
          icon={MapPin}
          isComplete={locationState.status === "completed"}
          summaryContent={locationSummaryContent}
          onEdit={() => setLocationModalOpen(true)}
        />

        {/* Audience Section */}
        <CollapsibleSection
          title="Audience"
          icon={Target}
          isComplete={audienceState.status === "completed"}
          summaryContent={audienceSummaryContent}
          onEdit={() => setAudienceModalOpen(true)}
        />

        {/* Goal Section */}
        <CollapsibleSection
          title="Goal"
          icon={Flag}
          isComplete={goalState.status === "completed"}
          summaryContent={goalSummaryContent}
          onEdit={() => setGoalModalOpen(true)}
        />

        {/* Edit Modals */}
        <SectionEditModal
          open={metaModalOpen}
          onOpenChange={setMetaModalOpen}
          title="Connect Facebook & Instagram"
          size="xl"
          bodyClassName="bg-muted/20 px-2 py-2"
          innerClassName="max-w-3xl w-full"
        >
          <div className="w-full px-4 py-2">
            <MetaConnectCard mode="step" />
          </div>
        </SectionEditModal>

        <SectionEditModal
          open={locationModalOpen}
          onOpenChange={setLocationModalOpen}
          title="Target Locations"
          size="full"
          className="max-w-6xl"
          bodyClassName="bg-muted/20 px-0 py-0"
          innerClassName="max-w-none mx-0 h-full"
        >
          <LocationSelectionCanvas />
        </SectionEditModal>

        <SectionEditModal
          open={audienceModalOpen}
          onOpenChange={setAudienceModalOpen}
          title="Define Audience"
          size="xl"
          bodyClassName="bg-muted/20 px-0 py-0"
          innerClassName="max-w-none mx-0"
        >
          <AudienceSelectionCanvas />
        </SectionEditModal>

        <SectionEditModal
          open={goalModalOpen}
          onOpenChange={setGoalModalOpen}
          title="Set Your Goal"
          size="xl"
          bodyClassName="bg-muted/20 px-0 py-0"
          innerClassName="max-w-none mx-0"
        >
          <GoalSelectionCanvas />
        </SectionEditModal>
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
      completed: isMetaConnectionComplete,
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
