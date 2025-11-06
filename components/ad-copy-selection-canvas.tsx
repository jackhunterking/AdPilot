"use client"

import { useState, useEffect } from "react"
import { Check, ImageIcon, Layers, Video, Sparkles, Edit2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAdCopy } from "@/lib/context/ad-copy-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useGeneration } from "@/lib/context/generation-context"
import { newEditSession } from "@/lib/utils/edit-session"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useGoal } from "@/lib/context/goal-context"
import { CTASelect } from "@/components/forms/cta-select"

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
          "rounded-lg border-2 bg-card overflow-hidden hover:shadow-lg transition-all relative group cursor-pointer",
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border'
        )}
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

        {/* Ad Header */}
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">Your Brand</p>
            <p className="text-[10px] text-muted-foreground">Sponsored</p>
          </div>
        </div>

        {/* Ad Creative */}
        {selectedImg ? (
          <div className="aspect-square relative overflow-hidden">
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
          <div className={`aspect-square bg-gradient-to-br ${selectedCreativeVariation.gradient} flex items-center justify-center`}>
            <div className="text-center text-white p-4">
              <p className="text-sm font-bold">{selectedCreativeVariation.title}</p>
            </div>
          </div>
        ) : (
          <div className="aspect-square bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center">
            <div className="text-center text-white p-4">
              <p className="text-sm font-bold">Ad Creative</p>
            </div>
          </div>
        )}

        {/* Ad Copy Content */}
        <div className="p-3 space-y-2">
          {/* Reaction Icons */}
          <div className="flex items-center gap-3">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>

          {/* Primary Text */}
          <p className="text-xs line-clamp-3">
            <span className="font-semibold">Your Brand</span>{" "}
            {copy.primaryText}
          </p>

          {/* Headline & Description */}
          <div className="bg-muted rounded-lg p-2.5 space-y-1">
            <p className="text-xs font-bold line-clamp-1">{copy.headline}</p>
            <p className="text-[10px] text-muted-foreground line-clamp-2">{copy.description}</p>
            <Button 
              size="sm" 
              className="w-full mt-1.5 h-7 text-[10px] bg-[#4B73FF] hover:bg-[#3d5fd9]"
              disabled
            >
              Learn More
            </Button>
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
          "aspect-[9/16] rounded-lg border-2 bg-card overflow-hidden relative hover:shadow-lg transition-all group cursor-pointer",
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border'
        )}
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
        {isSelected && (
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

        {/* Background Creative */}
        {selectedImg ? (
          <div className="absolute inset-0">
            <img 
              key={`story-${copyIndex}-${selectedImg}`}
              src={selectedImg} 
              alt={copy.headline} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
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
          <div className={`absolute inset-0 bg-gradient-to-br ${selectedCreativeVariation.gradient}`} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500" />
        )}

        {/* Story Header */}
        <div className="relative z-10 p-3">
          <div className="h-0.5 bg-white/30 rounded-full mb-3">
            <div className="h-full w-1/3 bg-white rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white flex-shrink-0" />
            <p className="text-white text-xs font-semibold truncate">Your Brand</p>
          </div>
        </div>

        {/* Story Copy Content */}
        <div className="absolute bottom-6 left-0 right-0 px-3 z-10 space-y-2">
          {/* Primary Text in white overlay */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <p className="text-white text-xs line-clamp-2 font-medium">
              {copy.primaryText}
            </p>
          </div>
          
          {/* Headline */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <p className="text-white font-bold text-xs line-clamp-1">{copy.headline}</p>
          </div>

          {/* CTA Button */}
          <div className="bg-white/95 backdrop-blur-sm rounded-full py-2 px-4 text-center">
            <p className="text-black font-semibold text-xs truncate">Learn More</p>
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

      {/* CTA Selector */}
      <div className="rounded-lg border border-border bg-card p-4 max-w-6xl mx-auto w-full">
        <CTASelect />
      </div>

      

      {/* Info Section */}
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">
          {isGenerating 
            ? "Writing 3 ad copy variations…"
            : adCopyState.selectedCopyIndex !== null 
              ? `Copy variation ${adCopyState.selectedCopyIndex + 1} selected - Click Next to continue`
              : "Select an ad copy variation to continue"}
        </p>
      </div>
    </div>
  )
}


