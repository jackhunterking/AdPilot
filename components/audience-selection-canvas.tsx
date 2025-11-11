"use client"

import { Check, Lock, Target, Loader2, Sparkles, AlertCircle, X, User, Heart, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState } from "react"
import { useAudience } from "@/lib/context/audience-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { cn } from "@/lib/utils"

interface AudienceSelectionCanvasProps {
  variant?: "step" | "summary"
}

export function AudienceSelectionCanvas({ variant = "step" }: AudienceSelectionCanvasProps = {}) {
  const { 
    audienceState, 
    resetAudience, 
    setAudienceTargeting,
    updateStatus,
    setManualDescription,
    setDemographics,
    addInterest,
    removeInterest,
    addBehavior,
    removeBehavior
  } = useAudience()
  const { isPublished } = useAdPreview()
  const [isEnabling, setIsEnabling] = useState(false)
  const [localDescription, setLocalDescription] = useState("")
  const [isTranslating, setIsTranslating] = useState(false)
  const isSummary = variant === "summary"

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
          <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-300 shadow-lg hover:shadow-xl">
            {/* Recommended Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-blue-600 text-white px-3 py-1 text-xs font-semibold shadow-md">
                Recommended • 22% Better ROAS
              </Badge>
            </div>
            
            <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4 mt-2">
              <Sparkles className="h-8 w-8 text-blue-600" />
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
                setTimeout(() => {
                  setAudienceTargeting({ mode: 'ai', advantage_plus_enabled: true })
                  setIsEnabling(false)
                }, 500)
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
                setAudienceTargeting({ mode: 'manual' })
                updateStatus('generating')
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

  // Manual targeting: Prompt user to use AI Chat
  if (audienceState.status === "generating" && audienceState.targeting.mode === "manual") {
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
        
        <div className="flex justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={resetAudience}
          >
            Back to Options
          </Button>
        </div>
      </div>
    )
    
    return renderLayout(content, "max-w-3xl")
  }

  // Manual targeting: Parameter refinement interface
  if (audienceState.status === "setup-in-progress" && audienceState.targeting.mode === "manual") {
    const demographics = audienceState.targeting.demographics || {
      ageMin: 18,
      ageMax: 65,
      gender: "all" as const
    }
    
    const detailedTargeting = audienceState.targeting.detailedTargeting || {
      interests: [],
      behaviors: [],
      connections: []
    }
    
    const handleSaveTargeting = () => {
      setAudienceTargeting({
        mode: 'manual',
        demographics,
        detailedTargeting
      })
      updateStatus('completed')
    }
    
    const content = (
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold">Refine Your Targeting</h2>
          <p className="text-muted-foreground">
            Review and adjust the AI-generated targeting parameters
          </p>
        </div>
        
        {/* Demographics Section */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Demographics</h3>
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Suggested
            </Badge>
          </div>
          
          {/* Age Range */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Age Range</Label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{demographics.ageMin}</span>
                  <span className="text-sm text-muted-foreground">{demographics.ageMax}</span>
                </div>
                <Slider
                  min={18}
                  max={65}
                  step={1}
                  value={[demographics.ageMin || 18, demographics.ageMax || 65]}
                  onValueChange={([min, max]) => {
                    if (min !== undefined && max !== undefined) {
                      setDemographics({ ...demographics, ageMin: min, ageMax: max })
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Gender */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Gender</Label>
            <RadioGroup 
              value={demographics.gender} 
              onValueChange={(value: "all" | "male" | "female") => setDemographics({ ...demographics, gender: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="gender-all" />
                <Label htmlFor="gender-all" className="font-normal cursor-pointer">All Genders</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="gender-male" />
                <Label htmlFor="gender-male" className="font-normal cursor-pointer">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="gender-female" />
                <Label htmlFor="gender-female" className="font-normal cursor-pointer">Female</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        {/* Detailed Targeting Section */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Detailed Targeting</h3>
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Suggested
            </Badge>
          </div>
          
          {/* Interests */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Interests</Label>
            {detailedTargeting.interests && detailedTargeting.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detailedTargeting.interests.map((interest) => (
                  <Badge 
                    key={interest.id} 
                    variant="secondary"
                    className="px-3 py-1.5 text-sm flex items-center gap-2"
                  >
                    {interest.name}
                    <button
                      onClick={() => removeInterest(interest.id)}
                      className="hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No interests selected</p>
            )}
            <Button variant="outline" size="sm" className="mt-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Search for more interests
            </Button>
          </div>
          
          {/* Behaviors */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Behaviors</Label>
            {detailedTargeting.behaviors && detailedTargeting.behaviors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detailedTargeting.behaviors.map((behavior) => (
                  <Badge 
                    key={behavior.id} 
                    variant="secondary"
                    className="px-3 py-1.5 text-sm flex items-center gap-2"
                  >
                    {behavior.name}
                    <button
                      onClick={() => removeBehavior(behavior.id)}
                      className="hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No behaviors selected</p>
            )}
            <Button variant="outline" size="sm" className="mt-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Search for more behaviors
            </Button>
          </div>
        </div>
        
        {/* AI Tip Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-blue-700 dark:text-blue-400">AI Tip</p>
              <p className="text-blue-600 dark:text-blue-300 text-xs">
                Your targeting looks good! These parameters will help you reach {(detailedTargeting.interests?.length || 0) + (detailedTargeting.behaviors?.length || 0) > 0 ? 'a specific audience' : 'a broad audience'}. You can always adjust these later.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={resetAudience}
          >
            Start Over
          </Button>
          <Button
            size="lg"
            onClick={handleSaveTargeting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Targeting
          </Button>
        </div>
      </div>
    )
    
    return renderLayout(content, "max-w-4xl")
  }

  // Completed: show compact confirmation matching Launch summary
  if (audienceState.status === "completed") {
    const isAIMode = audienceState.targeting.mode === "ai"
    const demographics = audienceState.targeting.demographics
    const detailedTargeting = audienceState.targeting.detailedTargeting
    
    const content = (
      <div className="space-y-6">
        {/* Published Warning Banner */}
        {isPublished && !isSummary && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-left text-sm space-y-1">
                <p className="font-medium text-orange-700 dark:text-orange-400">Live Campaign - Edit with Caution</p>
                <p className="text-orange-600 dark:text-orange-300 text-xs">
                  This ad is currently published. Changes to audience targeting will update your live campaign.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4">
          {isAIMode ? (
            /* AI Advantage+ Summary - Simplified without wrapper */
            <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">AI Advantage+</p>
                  <p className="text-xs text-muted-foreground">Automatic optimization enabled</p>
                </div>
              </div>
              <Check className="h-4 w-4 text-green-600" />
            </div>
          ) : (
            /* Manual Targeting Summary - with Audience header */
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="icon-tile-muted">
                    <Target className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold">Audience</h3>
                </div>
              </div>
              <div className="space-y-2">
                {/* Demographics */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
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
                  <Activity className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
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
          )}
        </div>

        {/* Reset button for editing */}
        {!isSummary && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={resetAudience}
            >
              Change Targeting
            </Button>
          </div>
        )}
      </div>
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
}

