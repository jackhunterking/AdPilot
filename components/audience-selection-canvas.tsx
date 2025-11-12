"use client"

/**
 * Feature: Audience Selection Canvas
 * Purpose: UI for selecting and configuring audience targeting
 * 
 * Architecture: Powered by XState v5 finite state machine
 * - Single source of truth
 * - Atomic state updates
 * - Zero race conditions
 * - Predictable state transitions
 */

import { Check, Target, Loader2, Sparkles, AlertCircle, Users, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState, memo } from "react"
import { useAudience } from "@/lib/context/audience-machine-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface AudienceSelectionCanvasProps {
  variant?: "step" | "summary"
}

export const AudienceSelectionCanvas = memo(function AudienceSelectionCanvas({ variant = "step" }: AudienceSelectionCanvasProps = {}) {
  const { 
    audienceState, 
    resetAudience, 
    setAudienceTargeting,
    updateStatus,
    switchTargetingMode
  } = useAudience()
  const { isPublished } = useAdPreview()
  const [isEnabling, setIsEnabling] = useState(false)
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const isSummary = variant === "summary"

  // Debug logging to track state transitions (uncomment if needed for debugging)
  // console.log('[Canvas] Audience State:', {
  //   status: audienceState.status,
  //   mode: audienceState.targeting.mode,
  //   isAIMode: audienceState.targeting.mode === 'ai',
  //   hasAdvantage: audienceState.targeting.advantage_plus_enabled,
  //   hasDescription: !!audienceState.targeting.description,
  //   hasDemographics: !!audienceState.targeting.demographics,
  //   hasDetailedTargeting: !!audienceState.targeting.detailedTargeting,
  // })

  const renderLayout = (content: React.ReactNode, maxWidthClass = "max-w-2xl") => {
    if (isSummary) {
      return (
        <div className={cn("mx-auto w-full", maxWidthClass, "space-y-8")}>{content}</div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className={cn("w-full space-y-8", maxWidthClass)}>{content}</div>
      </div>
    )
  }

  // Initial state - no audience set
  if (audienceState.status === "idle") {
    const content = (
      <div className="max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-2 gap-6">
          {/* AI Advantage+ Card (Recommended) */}
          <div className={cn(
            "group relative flex flex-col items-center p-8 rounded-2xl border-2 border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-300 shadow-lg hover:shadow-xl",
            isEnabling && "animate-pulse"
          )}>
            {/* Recommended Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-blue-600 text-white px-3 py-1 text-xs font-semibold shadow-md">
                Recommended • 22% Better ROAS
              </Badge>
            </div>
            
            <div className={cn(
              "h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4 mt-2",
              isEnabling && "relative"
            )}>
              {isEnabling ? (
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              ) : (
                <Sparkles className="h-8 w-8 text-blue-600" />
              )}
            </div>
            
            <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
              <h3 className="text-xl font-semibold">AI Advantage+</h3>
              <p className="text-sm text-muted-foreground">
                Let Meta's AI find your ideal customers automatically
              </p>
              
              {/* Benefits List */}
              <ul className="text-xs text-muted-foreground space-y-1.5 mt-3 text-left">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Automatic optimization</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Broader reach</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Better performance</span>
                </li>
              </ul>
            </div>
            
            <Button
              size="lg"
              onClick={() => {
                if (isEnabling) return
                setIsEnabling(true)
                
                // Update audience state via machine (triggers: idle → enablingAI → aiCompleted)
                setAudienceTargeting({ 
                  mode: 'ai', 
                  advantage_plus_enabled: true 
                })
                // Don't manually set status - let machine handle it
                
                // Show success toast
                toast.success('AI Advantage+ enabled')
                
                // Emit event to trigger AI chat message for visual feedback
                window.dispatchEvent(new CustomEvent('triggerAudienceModeSelection', { 
                  detail: { mode: 'ai' } 
                }))
                
                // Keep loader visible briefly for smooth transition
                setTimeout(() => {
                  setIsEnabling(false)
                }, 800)
              }}
              disabled={isEnabling}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 mt-auto w-full"
            >
              {isEnabling ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enabling...
                </span>
              ) : (
                'Enable AI Advantage+'
              )}
            </Button>
          </div>

          {/* Manual Targeting Card */}
          <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-border hover:bg-accent/20 transition-all duration-300">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors mb-4">
              <div className="relative">
                <Target className="h-8 w-8" />
                <Sparkles className="h-4 w-4 text-blue-600 absolute -top-1 -right-1" />
              </div>
            </div>
            
            <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
              <h3 className="text-xl font-semibold">Manual Targeting</h3>
              <p className="text-sm text-muted-foreground">
                Describe your audience and refine AI-generated parameters
              </p>
              
              {/* Benefits List */}
              <ul className="text-xs text-muted-foreground space-y-1.5 mt-3 text-left">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>Precise control</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>AI-powered suggestions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>Custom audiences</span>
                </li>
              </ul>
            </div>
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                // Update state via machine (triggers: idle → gatheringManualInfo)
                setAudienceTargeting({ mode: 'manual' });
                // Don't manually set status - let machine handle it
                
                // Emit event to trigger AI chat tool call for visual feedback
                window.dispatchEvent(new CustomEvent('triggerAudienceModeSelection', { 
                  detail: { mode: 'manual' } 
                }));
              }}
              className="px-8 mt-auto w-full"
            >
              Set Up Manual Targeting
            </Button>
          </div>
        </div>
      </div>
    )

    return renderLayout(content, "max-w-5xl")
  }

  // Switching state: Show appropriate transition UI
  if (audienceState.status === "switching") {
    const switchingToManual = audienceState.targeting.mode === "manual"
    const switchingToAI = audienceState.targeting.mode === "ai"
    
    // Journey 2: Manual → AI (show AI card briefly before transitioning to completed)
    if (switchingToAI) {
      const content = (
        <div className="max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 gap-6">
            {/* AI Advantage+ Card (Transitioning) */}
            <div className={cn(
              "group relative flex flex-col items-center p-8 rounded-2xl border-2 border-blue-500 bg-blue-500/5 transition-all duration-300 shadow-lg",
              "animate-in fade-in zoom-in duration-500"
            )}>
              {/* Switching Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-3 py-1 text-xs font-semibold shadow-md animate-pulse">
                  Enabling AI Advantage+...
                </Badge>
              </div>
              
              <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 mt-2">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              
              <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
                <h3 className="text-xl font-semibold">AI Advantage+</h3>
                <p className="text-sm text-muted-foreground">
                  Switching to automatic audience optimization
                </p>
                
                {/* Benefits List */}
                <ul className="text-xs text-muted-foreground space-y-1.5 mt-3 text-left">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Automatic optimization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Broader reach</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Better performance</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
      return renderLayout(content, "max-w-5xl")
    }
    
    // Journey 1: AI → Manual (show loading state)
    if (switchingToManual) {
      const content = (
        <div className="max-w-2xl mx-auto w-full space-y-6">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold">Switching to Manual Targeting...</h2>
            <p className="text-muted-foreground">
              Preparing conversational targeting setup
            </p>
          </div>
        </div>
      )
      return renderLayout(content, "max-w-3xl")
    }
  }

  // Manual targeting: AI gathering information through conversation
  if (audienceState.status === "gathering-info" && audienceState.targeting.mode === "manual") {
    const demographics = audienceState.targeting.demographics
    const detailedTargeting = audienceState.targeting.detailedTargeting
    
    const content = (
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold">Building Your Audience Profile</h2>
          <p className="text-muted-foreground">
            Answer the questions in AI Chat to refine your targeting
          </p>
        </div>
        
        {/* AI Chat Conversation Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-3">
              <p className="font-medium text-blue-700 dark:text-blue-400">Conversational Targeting</p>
              <p className="text-blue-600 dark:text-blue-300 text-sm">
                I'll ask you a few questions to understand your ideal customer better. This helps create precise Meta targeting parameters.
              </p>
              <div className="space-y-2 mt-4">
                <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">We'll cover:</p>
                <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1 ml-4 list-disc">
                  <li>Age range and demographics</li>
                  <li>Interests and hobbies</li>
                  <li>Behaviors and life events</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress Indicators - Show what's been gathered */}
        {(demographics || detailedTargeting) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <p className="text-xs font-medium text-muted-foreground">Gathered So Far</p>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            {/* Demographics */}
            {demographics && (demographics.ageMin || demographics.ageMax || (demographics.gender && demographics.gender !== 'all')) && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Demographics</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {demographics.ageMin && demographics.ageMax && (
                      <Badge variant="secondary" className="text-xs">
                        Age {demographics.ageMin}-{demographics.ageMax}
                      </Badge>
                    )}
                    {demographics.gender && demographics.gender !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        {demographics.gender.charAt(0).toUpperCase() + demographics.gender.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Interests */}
            {detailedTargeting?.interests && detailedTargeting.interests.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <Heart className="h-4 w-4 text-pink-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Interests</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {detailedTargeting.interests.map((interest: { id: string; name: string }) => (
                      <Badge key={interest.id} variant="secondary" className="text-xs">
                        {interest.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Behaviors */}
            {detailedTargeting?.behaviors && detailedTargeting.behaviors.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Behaviors</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {detailedTargeting.behaviors.map((behavior: { id: string; name: string }) => (
                      <Badge key={behavior.id} variant="secondary" className="text-xs">
                        {behavior.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={async () => {
              await switchTargetingMode('ai')
            }}
            disabled={isSwitching}
          >
            {isSwitching ? 'Switching...' : 'Switch to AI Advantage+'}
          </Button>
        </div>
      </div>
    )
    
    return renderLayout(content, "max-w-3xl")
  }

  // Manual targeting: Prompt user to use AI Chat (when status is "generating")
  if (audienceState.status === "generating" && audienceState.targeting.mode === "manual") {
    const demographics = audienceState.targeting.demographics
    const detailedTargeting = audienceState.targeting.detailedTargeting
    
    const content = (
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold">Describe Your Ideal Customer</h2>
          <p className="text-muted-foreground">
            Use the AI Chat on the left to describe your target audience
          </p>
        </div>
        
        {/* AI Chat Prompt Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-3">
              <p className="font-medium text-blue-700 dark:text-blue-400">Use AI Chat to Get Started</p>
              <p className="text-blue-600 dark:text-blue-300 text-sm">
                In the chat on the left, describe your ideal customer and I'll generate Meta targeting parameters for you.
              </p>
              <div className="space-y-2 mt-4">
                <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">Example descriptions:</p>
                <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1 ml-4 list-disc">
                  <li>"Women aged 25-40 interested in fitness and healthy eating"</li>
                  <li>"Small business owners in tech industry"</li>
                  <li>"Parents with young children who like outdoor activities"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress Indicators - Show what's been gathered */}
        {(demographics || detailedTargeting) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <p className="text-xs font-medium text-muted-foreground">Gathered So Far</p>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            {/* Demographics */}
            {demographics && (demographics.ageMin || demographics.ageMax || (demographics.gender && demographics.gender !== 'all')) && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Demographics</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {demographics.ageMin && demographics.ageMax && (
                      <Badge variant="secondary" className="text-xs">
                        Age {demographics.ageMin}-{demographics.ageMax}
                      </Badge>
                    )}
                    {demographics.gender && demographics.gender !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        {demographics.gender.charAt(0).toUpperCase() + demographics.gender.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Interests */}
            {detailedTargeting?.interests && detailedTargeting.interests.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <Heart className="h-4 w-4 text-pink-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Interests</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {detailedTargeting.interests.map((interest: { id: string; name: string }) => (
                      <Badge key={interest.id} variant="secondary" className="text-xs">
                        {interest.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Behaviors */}
            {detailedTargeting?.behaviors && detailedTargeting.behaviors.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Behaviors</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {detailedTargeting.behaviors.map((behavior: { id: string; name: string }) => (
                      <Badge key={behavior.id} variant="secondary" className="text-xs">
                        {behavior.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={async () => {
              await switchTargetingMode('ai')
            }}
            disabled={isSwitching}
          >
            {isSwitching ? 'Switching...' : 'Switch to AI Advantage+'}
          </Button>
        </div>
      </div>
    )
    
    return renderLayout(content, "max-w-3xl")
  }

  // Manual targeting: Loading animation before refinement
  if (audienceState.status === "setup-in-progress" && audienceState.targeting.mode === "manual" && showLoadingAnimation) {
    const content = (
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold">Analyzing Your Audience...</h2>
          <p className="text-muted-foreground">
            Setting up your targeting parameters
          </p>
        </div>
      </div>
    )
    
    return renderLayout(content, "max-w-3xl")
  }

  // Completed: show compact confirmation matching Launch summary
  if (audienceState.status === "completed") {
    const isAIMode = audienceState.targeting.mode === "ai"
    const demographics = audienceState.targeting.demographics
    const detailedTargeting = audienceState.targeting.detailedTargeting
    
    const content = (
      <>
        {/* Published Warning Banner */}
        {isPublished && !isSummary && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-left text-sm space-y-1">
                <p className="font-medium text-orange-700 dark:text-orange-400">Live Campaign - Edit with Caution</p>
                <p className="text-orange-600 dark:text-orange-300 text-xs">
                  This ad is currently published. Switching targeting modes will clear your current audience settings and update your live campaign.
                </p>
              </div>
            </div>
          </div>
        )}

        {isAIMode ? (
          /* AI Advantage+ Summary */
          <div className="rounded-lg border border-border bg-card p-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="icon-tile-muted">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">AI Advantage+ Targeting</h3>
                </div>
              </div>
              <div className="space-y-2">
                {/* How It Works */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">How It Works</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Meta's AI automatically finds and shows your ads to people most likely to engage with your business, continuously optimizing for the best results.
                    </p>
                  </div>
                </div>
                
                {/* Key Benefits */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Target className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-2">Key Benefits</p>
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">Automatic optimization - AI learns and improves over time</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">Broader reach to find more potential customers</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">Better performance - 22% better ROAS on average</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">No manual parameter setup needed</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">AI Advantage+ Active</span>
                  </div>
                  <Check className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Manual Targeting Summary */
          <div className="rounded-lg border border-border bg-card p-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="icon-tile-muted">
                    <Target className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold">Manual Targeting</h3>
                </div>
              </div>
              <div className="space-y-2">
                {/* Demographics */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Demographics</p>
                  <p className="text-xs text-muted-foreground">
                    {demographics?.gender && demographics.gender !== "all" ? demographics.gender.charAt(0).toUpperCase() + demographics.gender.slice(1) + ", " : ""}
                    Age {demographics?.ageMin || 18}-{demographics?.ageMax || 65}
                  </p>
                </div>
              </div>
              
              {/* Interests (if any) */}
              {detailedTargeting?.interests && detailedTargeting.interests.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Heart className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Interests</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {detailedTargeting.interests.slice(0, 3).map((interest) => (
                        <Badge key={interest.id} variant="secondary" className="text-xs">
                          {interest.name}
                        </Badge>
                      ))}
                      {detailedTargeting.interests.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{detailedTargeting.interests.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Behaviors (if any) */}
              {detailedTargeting?.behaviors && detailedTargeting.behaviors.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Target className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Behaviors</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {detailedTargeting.behaviors.slice(0, 3).map((behavior) => (
                        <Badge key={behavior.id} variant="secondary" className="text-xs">
                          {behavior.name}
                        </Badge>
                      ))}
                      {detailedTargeting.behaviors.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{detailedTargeting.behaviors.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* Mode switch button */}
        {!isSummary && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              size="lg"
              onClick={async () => {
                // Guard 1: Prevent double-clicks
                if (isSwitching) return
                
                // Guard 2: Check if already in target mode (redundant with context check, but safe)
                const newMode = isAIMode ? 'manual' : 'ai'
                if (audienceState.targeting.mode === newMode) return
                
                setIsSwitching(true)
                
                try {
                  // Direct context call - this is the ONLY state mutation
                  await switchTargetingMode(newMode)
                  
                  // Optional: Dispatch event ONLY for AI chat visual feedback
                  // This does NOT mutate state, only triggers a chat message
                  window.dispatchEvent(new CustomEvent('triggerTargetingModeSwitch', { 
                    detail: { newMode, currentMode: isAIMode ? 'ai' : 'manual' } 
                  }))
                } finally {
                  setIsSwitching(false)
                }
              }}
              disabled={isSwitching}
            >
              {isSwitching 
                ? 'Switching...' 
                : isAIMode ? 'Switch to Manual Targeting' : 'Switch to AI Advantage+'}
            </Button>
          </div>
        )}
      </>
    )

    return renderLayout(content)
  }

  // Error state
  if (audienceState.status === "error") {
    const content = (
      <div className="space-y-6 text-center">
        <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">⚠️</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Something Went Wrong</h2>
          <p className="text-muted-foreground">
            {audienceState.errorMessage || "Couldn't set this up. Want to try again?"}
          </p>
        </div>
        <Button
          size="lg"
          onClick={resetAudience}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          Try Again
        </Button>
      </div>
    )

    return renderLayout(content, "max-w-xl")
  }

  return null
});

