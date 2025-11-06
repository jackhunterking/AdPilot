"use client"

import { useState, useEffect } from "react"
import { Check, ImageIcon, Layers, Video, Sparkles, Edit2, Loader2, MoreVertical, Globe, ThumbsUp, MessageCircle, Share2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAdCopy } from "@/lib/context/ad-copy-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useGeneration } from "@/lib/context/generation-context"
import { newEditSession } from "@/lib/utils/edit-session"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useGoal } from "@/lib/context/goal-context"

export function AdCopySelectionCanvas() {
  const { adCopyState, setSelectedCopyIndex, getActiveVariations, setCustomCopyVariations } = useAdCopy()
  const activeVariations = getActiveVariations()
  const { adContent, selectedCreativeVariation, loadingVariations, selectedImageIndex } = useAdPreview()
  const { isGenerating, setIsGenerating, setGenerationMessage } = useGeneration()
  const { campaign } = useCampaignContext()
  const { goalState } = useGoal()
  const [activeFormat, setActiveFormat] = useState("feed")
  const [showReelMessage, setShowReelMessage] = useState(false)
  // Removed regenerate feature: no regenerating state

  const previewFormats = [
    { id: "feed", label: "Feed", icon: ImageIcon },
    { id: "story", label: "Story", icon: Layers },
    { id: "reel", label: "Reel", icon: Video },
  ]

  const handleReelClick = () => {
    setShowReelMessage(true)
    setTimeout(() => setShowReelMessage(false), 2500)
  }

  const handleSelectCopy = (index: number) => {
    // Toggle selection identical to creative step
    if (adCopyState.selectedCopyIndex === index) {
      setSelectedCopyIndex(null)
      return
    }
    setSelectedCopyIndex(index)
  }

  const handleEditCopy = (index: number) => {
    // Send copy to AI chat for editing
    const copy = activeVariations[index]
    if (!copy) return
    
    const currentFormat = activeFormat
    
    // Always use the selected creative image for ad copy edits
    const variationImageUrl = (selectedImageIndex != null
      ? adContent?.imageVariations?.[selectedImageIndex]
      : (adContent?.imageUrl || adContent?.imageVariations?.[0]))
    
    // Create reference context for the AI chat to render
    const editSession = newEditSession({
      variationIndex: index,
      imageUrl: variationImageUrl,
      campaignId: (adContent as unknown as { campaignId?: string })?.campaignId,
    })

    const referenceContext = {
      type: 'ad_variation_reference',
      action: 'edit',
      variationIndex: index,
      variationTitle: `Variation ${index + 1}`,
      format: currentFormat,
      
      // Include image URL for editing
      imageUrl: variationImageUrl,
      
      // Copy content to edit
      content: {
        primaryText: copy.primaryText,
        headline: copy.headline,
        description: copy.description,
      },
      
      // Visual preview data (match creative)
      gradient: selectedCreativeVariation?.gradient || "from-blue-600 via-blue-500 to-cyan-500",
      editSession,
      preview: {
        format: currentFormat,
        gradient: selectedCreativeVariation?.gradient,
        title: `Variation ${index + 1}`,
        imageUrl: variationImageUrl,
        brandName: 'Your Brand',
        headline: copy.headline,
        body: copy.primaryText,
        dimensions: currentFormat === 'story'
          ? { width: 360, height: 640, aspect: '9:16' }
          : { width: 500, height: 500, aspect: '1:1' }
      },
      
      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        editMode: true,
        canRegenerate: true,
        selectedFormat: currentFormat,
        fields: ['primaryText', 'headline', 'description']
      }
    }
    
    // Dispatch event to show reference and enable edit mode
    window.dispatchEvent(new CustomEvent('openEditInChat', { 
      detail: referenceContext
    }))
  }

  // Listen for adCopyEdited events to update the selected variation
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { variationIndex: number; newCopy: { primaryText: string; headline: string; description: string } } | undefined;
      if (!detail) return;
      const { variationIndex, newCopy } = detail;
      const currentVariations = getActiveVariations();
      const updated = currentVariations.map((v, i) => i === variationIndex ? { ...v, ...newCopy } : v);
      setCustomCopyVariations(updated as unknown as ReturnType<typeof getActiveVariations>);
    };
    window.addEventListener('adCopyEdited', handler as EventListener);
    return () => window.removeEventListener('adCopyEdited', handler as EventListener);
  }, [getActiveVariations, setCustomCopyVariations]);

  // Auto-generate ad copy variations when images are ready and no custom copy exists yet
  useEffect(() => {
    const imageUrls = adContent?.imageVariations
    const hasCustom = Boolean(adCopyState.customCopyVariations && adCopyState.customCopyVariations.length)
    if (!imageUrls || imageUrls.length === 0 || hasCustom) return

    let cancelled = false
    setIsGenerating(true)
    setGenerationMessage("Writing 3 ad copy variations…")
    ;(async () => {
      try {
        const selectedImg = (selectedImageIndex != null && adContent?.imageVariations)
          ? [adContent.imageVariations[selectedImageIndex]]
          : (adContent?.imageUrl ? [adContent.imageUrl] : imageUrls)
        const res = await fetch('/api/ad-copy/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign?.id,
            goalType: goalState?.selectedGoal || null,
            imageUrls: selectedImg,
            businessContext: campaign?.metadata?.initialPrompt,
          }),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        if (!cancelled && data?.variations?.length) {
          // Only take the first 3 variations to ensure consistency
          setCustomCopyVariations(data.variations.slice(0, 3))
        }
      } catch (e) {
        console.error('[AdCopy] generation failed', e)
      } finally {
        if (!cancelled) setIsGenerating(false)
      }
    })()

    return () => { cancelled = true }
  }, [adContent?.imageVariations, adContent?.imageUrl, adCopyState.customCopyVariations, campaign?.id, campaign?.metadata?.initialPrompt, goalState?.selectedGoal, selectedImageIndex, setCustomCopyVariations, setGenerationMessage, setIsGenerating])

  // (removed unused GeneratingOverlay)

  const renderFeedAdCopyCard = (copyIndex: number) => {
    const copy = activeVariations[copyIndex]
    if (!copy) return null
    
    const isSelected = adCopyState.selectedCopyIndex === copyIndex
    const isProcessing = false
    const selectedImg = selectedImageIndex != null
      ? adContent?.imageVariations?.[selectedImageIndex]
      : (adContent?.imageUrl || adContent?.imageVariations?.[0])
    
    return (
      <div
        key={copy.id}
        className={cn(
          "rounded-lg border-2 bg-white overflow-hidden hover:shadow-lg transition-all relative group cursor-pointer",
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-[#CED0D4]'
        )}
        style={{ borderRadius: '8px' }}
        onClick={() => handleSelectCopy(copyIndex)}
      >
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="bg-card/95 rounded-xl px-4 py-3 shadow-2xl border border-border/50 flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Regenerating...</span>
            </div>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && !isProcessing && (
          <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        )}

        {/* Action Buttons Overlay (matches creative) */}
        {!isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex items-center justify-center p-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isSelected ? "default" : "secondary"}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectCopy(copyIndex)
                }}
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
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditCopy(copyIndex)
                }}
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
            {copy.primaryText}
          </p>
        </div>

        {/* Media Section - Square (1:1) aspect ratio - 1080x1080 */}
        {selectedImg ? (
          <div className="relative overflow-hidden" style={{ aspectRatio: '1/1' }}>
            <img
              key={`feed-${copyIndex}-${selectedImg}`}
              src={selectedImg}
              alt={copy.headline}
              className="w-full h-full object-cover"
            />
            {/* Loading overlay with transparent blur */}
            {loadingVariations[copyIndex] && (
              <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                <div className="bg-background/90 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg border border-border/50">
                  <div className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
                  <span className="text-xs font-medium">Creating variation...</span>
                </div>
              </div>
            )}
          </div>
        ) : selectedCreativeVariation ? (
          <div className={`relative overflow-hidden bg-gradient-to-br ${selectedCreativeVariation.gradient}`} style={{ aspectRatio: '1/1' }} />
        ) : (
          <div className="relative overflow-hidden bg-[#1C1E21]" style={{ aspectRatio: '1/1' }} />
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
              {copy.headline}
            </p>
            {/* Description */}
            <p className="text-[#050505] line-clamp-2" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '1.3333' }}>
              {copy.description}
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

  const renderStoryAdCopyCard = (copyIndex: number) => {
    const copy = activeVariations[copyIndex]
    if (!copy) return null
    
    const isSelected = adCopyState.selectedCopyIndex === copyIndex
    const isProcessing = false
    const selectedImg = selectedImageIndex != null
      ? adContent?.imageVariations?.[selectedImageIndex]
      : (adContent?.imageUrl || adContent?.imageVariations?.[0])
    
    return (
      <div
        key={copy.id}
        className={cn(
          "aspect-[9/16] rounded-lg border-2 bg-white overflow-hidden relative hover:shadow-lg transition-all group cursor-pointer",
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-[#CED0D4]'
        )}
        style={{ borderRadius: '8px' }}
        onClick={() => handleSelectCopy(copyIndex)}
      >
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-30 flex items-center justify-center">
            <div className="bg-card/95 rounded-xl px-4 py-3 shadow-2xl border border-border/50 flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Regenerating...</span>
            </div>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && !isProcessing && (
          <div className="absolute top-2 right-2 z-20 bg-blue-500 text-white rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        )}

        {/* Action Button Overlay (matches creative) */}
        {!isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex items-center justify-center p-3">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <Button
                size="sm"
                variant={isSelected ? "default" : "secondary"}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectCopy(copyIndex)
                }}
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
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditCopy(copyIndex)
                }}
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
          {selectedImg ? (
            <div className="relative w-full h-full">
              <img 
                key={`story-${copyIndex}-${selectedImg}`}
                src={selectedImg} 
                alt={copy.headline} 
                className="w-full h-full object-cover" 
              />
              {/* Loading overlay with transparent blur */}
              {loadingVariations[copyIndex] && (
                <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                  <div className="bg-background/90 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg border border-border/50">
                    <div className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
                    <span className="text-xs font-medium">Creating variation...</span>
                  </div>
                </div>
              )}
            </div>
          ) : selectedCreativeVariation ? (
            <div className={`relative w-full h-full bg-gradient-to-br ${selectedCreativeVariation.gradient}`} />
          ) : (
            <div className="relative w-full h-full bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500" />
          )}
        </div>

        {/* Bottom Ad Copy/Engagement Section - Dark Background */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-[#242526]">
          {/* Information Text - Actual Copy Text */}
          <div className="px-3 pt-3 pb-2" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '12px', paddingBottom: '8px' }}>
            <div className="space-y-1">
              {/* Primary Text */}
              <p className="text-white" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.4' }}>
                {copy.primaryText}
              </p>
              {/* Description */}
              <p className="text-white/80" style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.4' }}>
                {copy.description}
              </p>
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

  return (
    <div className="space-y-6">
      {/* Format Tabs */}
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

      {/* Grid of Ad Copy Variations */}
      <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
        {activeFormat === "feed" && activeVariations.slice(0, 3).map((_, index) => renderFeedAdCopyCard(index))}
        {activeFormat === "story" && activeVariations.slice(0, 3).map((_, index) => renderStoryAdCopyCard(index))}
      </div>
    </div>
  )
}


