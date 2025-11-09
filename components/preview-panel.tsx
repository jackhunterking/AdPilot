/**
 * Feature: Launch Preview Panel
 * Purpose: Provide the prelaunch summary with edit entry points tied to each configuration section
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction#why-use-the-ai-sdk
 *  - AI Elements: https://ai-sdk.dev/elements#quick-start
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway#key-features
 *  - Supabase: https://supabase.com/docs/guides/auth#providers
 */

"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Play, ImageIcon, Video, Layers, Sparkles, Building2, Check, Facebook, Loader2, Edit2, Palette, Type, MapPin, Target, Rocket, Flag, Link2, MoreVertical, Globe, Heart, ThumbsUp, MessageCircle, Share2, ChevronDown, AlertTriangle, ChevronUp } from "lucide-react"
import { LocationSelectionCanvas } from "./location-selection-canvas"
import { AudienceSelectionCanvas } from "./audience-selection-canvas"
import { AdCopySelectionCanvas } from "./ad-copy-selection-canvas"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { GoalSelectionCanvas } from "./goal-selection-canvas"
import { GoalSummaryCard } from "@/components/launch/goal-summary-card"
import { CampaignStepper } from "./campaign-stepper"
import { useBudget } from "@/lib/context/budget-context"
import { useLocation } from "@/lib/context/location-context"
import { useAudience } from "@/lib/context/audience-context"
import { useGoal } from "@/lib/context/goal-context"
import { useAdCopy } from "@/lib/context/ad-copy-context"
import { cn } from "@/lib/utils"
import { newEditSession } from "@/lib/utils/edit-session"
// Removed two-step Meta connect flow; using single summary card
import { MetaConnectCard } from "@/components/meta/MetaConnectCard"
import { useCampaignContext } from "@/lib/context/campaign-context"
import type { Database } from "@/lib/supabase/database.types"
import { metaStorage } from "@/lib/meta/storage"
import { CollapsibleSection } from "@/components/launch/collapsible-section"
import { SectionEditModal } from "@/components/launch/section-edit-modal"
import { PublishBudgetCard } from "@/components/launch/publish-budget-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PublishFlowDialog } from "@/components/launch/publish-flow-dialog"

export function PreviewPanel() {
  const searchParams = useSearchParams()
  const isCreatingVariant = searchParams.get('variant') === 'true'
  
  const [activeFormat, setActiveFormat] = useState("feed")
  // Removed regenerate feature: no regenerating state
  const { adContent, setAdContent, isPublished, setIsPublished, selectedImageIndex, selectedCreativeVariation, setSelectedCreativeVariation, setSelectedImageIndex } = useAdPreview()
  const { budgetState, isComplete } = useBudget()
  const { campaign } = useCampaignContext()
  const { locationState } = useLocation()
  const { audienceState } = useAudience()
  const { goalState } = useGoal()
  const { adCopyState, getActiveVariations, getSelectedCopy } = useAdCopy()
  const [showReelMessage, setShowReelMessage] = useState(false)
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)
  
  // Modal state management for section editing
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [audienceModalOpen, setAudienceModalOpen] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  
  // Publish flow dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

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
  
  const previewFormats = [
    { id: "feed", label: "Feed", icon: ImageIcon },
    { id: "story", label: "Story", icon: Layers },
    { id: "reel", label: "Reel", icon: Video },
  ]

  const handleReelClick = () => {
    setShowReelMessage(true)
    setTimeout(() => setShowReelMessage(false), 2500)
  }

  // Derive active ad copy variations for preview rendering
  const activeCopyVariations = getActiveVariations()

  useEffect(() => {
    if (!campaign?.id) {
      setHasPaymentMethod(false)
      return
    }

    if (typeof window === "undefined") {
      return
    }

    try {
      const summary = metaStorage.getConnectionSummary(campaign.id)
      const connection = metaStorage.getConnection(campaign.id)

      if (summary?.paymentConnected || connection?.ad_account_payment_connected) {
        setHasPaymentMethod(true)
        return
      }

      const adAccountId =
        summary?.adAccount?.id ??
        connection?.selected_ad_account_id ??
        budgetState.selectedAdAccount

      if (!adAccountId) {
        setHasPaymentMethod(false)
        return
      }

      let cancelled = false

      const verifyFunding = async () => {
        try {
          const res = await fetch(
            `/api/meta/payments/capability?campaignId=${encodeURIComponent(campaign.id)}`,
            { cache: "no-store" },
          )

          if (!res.ok) {
            return
          }

          const data: unknown = await res.json()
          const hasFunding = Boolean((data as { hasFunding?: unknown }).hasFunding)

          if (cancelled) return

          if (hasFunding) {
            metaStorage.markPaymentConnected(campaign.id)
            setHasPaymentMethod(true)
          } else {
            setHasPaymentMethod(false)
          }
        } catch (error) {
          if (!cancelled) {
            console.error("[PreviewPanel] Failed to verify payment capability", error)
            setHasPaymentMethod(false)
          }
        }
      }

      void verifyFunding()

      return () => {
        cancelled = true
      }
    } catch (error) {
      console.error("[PreviewPanel] Payment verification error", error)
    }
  }, [campaign?.id, budgetState.selectedAdAccount])

  /**
   * Handles ad publish action
   * 
   * NOTE: This currently opens a simulated publish flow dialog for UX demonstration.
   * TODO: Wire in actual Meta API calls when ready for production:
   *   1. Call /api/meta/ads/launch for leads campaigns
   *   2. Call /api/meta/campaigns/create-traffic-ad + /api/meta/ads/publish for website visits
   *   3. Call /api/meta/campaigns/create-call-ad + /api/meta/ads/publish for calls
   *   4. Add proper error handling and retry logic
   *   5. Verify payment method before actual publish
   *   6. Update campaign status in Supabase after successful publish
   */
  const handlePublish = async () => {
    if (!campaign?.id) return
    if (!allStepsComplete) return
    if (isPublishing) return // Prevent double-click
    
    // Open the publish flow dialog
    setIsPublishing(true)
    setPublishDialogOpen(true)
  }
  
  const handlePublishComplete = async () => {
    if (!campaign?.id) return
    
    try {
      // Import the snapshot builder dynamically
      const { buildAdSnapshot, validateAdSnapshot } = await import('@/lib/services/ad-snapshot-builder')
      
      // Build complete snapshot from wizard contexts
      const snapshot = buildAdSnapshot({
        adPreview: {
          adContent,
          selectedImageIndex,
          selectedCreativeVariation,
        },
        adCopy: adCopyState,
        location: locationState,
        audience: audienceState,
        goal: goalState,
        budget: budgetState,
      })
      
      // Validate snapshot before submitting
      const validation = validateAdSnapshot(snapshot)
      if (!validation.isValid) {
        console.error('Snapshot validation failed:', validation.errors)
        throw new Error(`Cannot publish: ${validation.errors.join(', ')}`)
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Snapshot warnings:', validation.warnings)
      }
      
      // Gather the finalized ad data from snapshot - use canonical copy source
      const selectedCopy = getSelectedCopy()
      
      const selectedImageUrl = selectedImageIndex !== null && adContent?.imageVariations?.[selectedImageIndex]
        ? adContent.imageVariations[selectedImageIndex]
        : adContent?.imageUrl || adContent?.imageVariations?.[0]
      
      // Prepare the ad data for persistence (with snapshot as source of truth)
      const adData = {
        name: `${campaign.name} - Ad ${new Date().toLocaleDateString()}`,
        status: 'active',
        creative_data: {
          imageUrl: selectedImageUrl,
          imageVariations: adContent?.imageVariations,
          baseImageUrl: adContent?.baseImageUrl,
        },
        copy_data: {
          headline: selectedCopy?.headline || adContent?.headline,
          primaryText: selectedCopy?.primaryText || adContent?.body,
          description: selectedCopy?.description || adContent?.body,
          cta: adContent?.cta || 'Learn More',
        },
        meta_ad_id: null, // Will be set when actually published to Meta
        setup_snapshot: snapshot, // NEW: Include complete snapshot
      }
      
      console.log('📸 Publishing ad with snapshot:', {
        hasSnapshot: !!snapshot,
        creative: snapshot.creative.selectedImageIndex,
        copy: {
          headline: snapshot.copy.headline,
          primaryText: snapshot.copy.primaryText?.substring(0, 50) + '...',
          description: snapshot.copy.description?.substring(0, 30) + '...',
          cta: snapshot.copy.cta,
        },
        locations: snapshot.location.locations.length,
        goal: snapshot.goal.type,
      })
      
      console.log('📦 Ad data being sent to API:', {
        name: adData.name,
        status: adData.status,
        copy_data: adData.copy_data,
        hasSnapshot: !!adData.setup_snapshot,
      })
      
      // Persist the ad to Supabase
      const response = await fetch(`/api/campaigns/${campaign.id}/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adData),
      })
      
      if (!response.ok) {
        console.error('Failed to persist ad:', await response.text())
        throw new Error('Failed to save ad')
      }
      
      const { ad } = await response.json()
      console.log('✅ Ad persisted with snapshot:', ad.id)
      
      // Mark as published in context
      setIsPublished(true)
      setIsPublishing(false)
      
      // Close the dialog immediately so navigation isn't blocked
      setPublishDialogOpen(false)
      
      // Navigate to campaign's all-ads grid
      if (typeof window !== 'undefined') {
        // Use sessionStorage to show success indicator if needed
        sessionStorage.setItem('ad_publish_success', JSON.stringify({
          campaignId: campaign.id,
          campaignName: campaign.name,
          isEdit: isPublished, // If already published, this was an edit
          timestamp: Date.now()
        }))
        
        // Small delay to ensure dialog closes, then navigate
        setTimeout(() => {
          window.location.href = `/${campaign.id}`
        }, 100)
      }
    } catch (error) {
      console.error('Error in handlePublishComplete:', error)
      setIsPublishing(false)
      // TODO: Show error toast to user
    }
  }
  
  const handlePublishDialogClose = (open: boolean) => {
    setPublishDialogOpen(open)
    if (!open && !isPublished) {
      // User closed dialog before completion
      setIsPublishing(false)
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
    isMetaConnectionComplete &&
    hasPaymentMethod &&
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
    // Use canonical copy source - single source of truth
    const copyForCard = getSelectedCopy()
    
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
            {copyForCard.primaryText}
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
              {copyForCard.headline}
            </p>
            {/* Description */}
            <p className="text-[#050505] line-clamp-2" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '1.3333' }}>
              {copyForCard.description}
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

  // Step 5: Launch Content (new unified layout with collapsible sections)
  const launchContent = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start">
      {/* Left: Full ad mockup using selected variation */}
      <div className="self-start lg:sticky lg:top-4 lg:-mt-4">
        <Card className="lg:w-[400px] xl:w-[420px]">
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
                variant="outline"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'ads' } }))}
                className="h-8 px-3 justify-center"
              >
                <Palette className="h-4 w-4 mr-2" />
                Edit Ad Creative
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'copy' } }))}
                className="h-8 px-3 justify-center"
              >
                <Type className="h-4 w-4 mr-2" />
                Edit Ad Copy
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Right: Collapsible sections with modals */}
      <div className="flex flex-col gap-6 max-w-3xl mx-auto lg:w-full">
        {/* Combined Publish and Budget Card */}
        <div>
          <PublishBudgetCard
            allStepsComplete={allStepsComplete}
            isPublished={isPublished}
            isPublishing={isPublishing}
            onPublish={handlePublish}
          />
        </div>

        {/* Meta Connect Section */}
        <CollapsibleSection
          title="Connect Facebook & Instagram"
          icon={Link2}
          isComplete={isMetaConnectionComplete}
          summaryContent={metaSummaryContent}
          editStepId="meta-connect"
          onEdit={() => {}}
        />

        {/* Location Section */}
        <CollapsibleSection
          title="Target Locations"
          icon={MapPin}
          isComplete={locationState.status === "completed"}
          summaryContent={locationSummaryContent}
          editStepId="location"
          onEdit={() => setLocationModalOpen(true)}
        />

        {/* Audience Section */}
        <CollapsibleSection
          title="Audience"
          icon={Target}
          isComplete={audienceState.status === "completed"}
          summaryContent={audienceSummaryContent}
          editStepId="audience"
          onEdit={() => setAudienceModalOpen(true)}
        />

        {/* Goal Section */}
        <CollapsibleSection
          title="Goal"
          icon={Flag}
          isComplete={goalState.status === "completed"}
          summaryContent={goalSummaryContent}
          editStepId="goal"
          onEdit={() => setGoalModalOpen(true)}
        />

        {/* Edit Modals */}
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

  // Conditionally filter steps based on whether creating a variant
  const steps = useMemo(() => {
    const allSteps = [
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
      // Only show goal and budget for first ad (not variants)
      ...(!isCreatingVariant ? [
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
          title: "Launch Ad",
          description: "Review details and publish your ad",
          completed: isComplete(),
          content: launchContent,
          icon: Rocket,
        },
      ] : []),
    ]
    
    // Renumber steps after filtering
    return allSteps.map((step, index) => ({
      ...step,
      number: index + 1,
    }))
  }, [isCreatingVariant, selectedImageIndex, adCopyState.status, locationState.status, audienceState.status, isMetaConnectionComplete, goalState.status, isComplete, adsContent, launchContent])

  return (
    <div className="flex flex-1 h-full flex-col relative min-h-0">
      {isCreatingVariant && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <strong>Creating new ad variant</strong> - Goal and budget inherited from campaign
        </div>
      )}
      <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
        <CampaignStepper steps={steps} campaignId={campaign?.id} />
      </div>
      
      {/* Publish Flow Dialog */}
      <PublishFlowDialog
        open={publishDialogOpen}
        onOpenChange={handlePublishDialogClose}
        campaignName={campaign?.name || "your ad"}
        isEditMode={isPublished}
        onComplete={handlePublishComplete}
      />
    </div>
  )
}
