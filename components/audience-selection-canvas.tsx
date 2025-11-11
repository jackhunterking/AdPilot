"use client"

import { Check, Lock, Target, Loader2, Sparkles, AlertCircle, X } from "lucide-react"
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
            
            <div className="h-20 w-20 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4 mt-2">
              <Sparkles className="h-10 w-10 text-blue-600" />
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
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors mb-4">
              <div className="relative">
                <Target className="h-10 w-10" />
                <Sparkles className="h-5 w-5 text-blue-600 absolute -top-1 -right-1" />
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

  // Manual targeting: Natural language description input
  if (audienceState.status === "generating" && audienceState.targeting.mode === "manual") {
    const handleGenerateParameters = async () => {
      if (!localDescription.trim()) return
      
      setIsTranslating(true)
      setManualDescription(localDescription)
      
      try {
        // Call API to translate description to targeting parameters
        const response = await fetch('/api/meta/targeting/translate-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: localDescription })
        })
        
        if (!response.ok) throw new Error('Translation failed')
        
        const data = await response.json()
        
        // Set the generated parameters
        if (data.demographics) {
          setDemographics(data.demographics)
        }
        
        if (data.detailedTargeting) {
          // Add interests
          data.detailedTargeting.interests?.forEach((interest: {id: string, name: string}) => {
            addInterest(interest)
          })
          // Add behaviors
          data.detailedTargeting.behaviors?.forEach((behavior: {id: string, name: string}) => {
            addBehavior(behavior)
          })
        }
        
        // Move to setup-in-progress state to show refinement interface
        updateStatus('setup-in-progress')
      } catch (error) {
        console.error('Error translating description:', error)
        // Show error but allow user to try again
      } finally {
        setIsTranslating(false)
      }
    }
    
    const content = (
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold">Describe Your Ideal Customer</h2>
          <p className="text-muted-foreground">
            Tell us about your target audience and our AI will generate targeting parameters
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-medium">
              Audience Description
            </Label>
            <Textarea
              id="description"
              placeholder="Example: Women aged 25-40 interested in fitness and healthy eating&#10;&#10;Example: Small business owners in tech industry&#10;&#10;Example: Parents with young children who like outdoor activities"
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              className="min-h-[150px] resize-none"
            />
          </div>
          
          {/* AI Suggestion Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-blue-700 dark:text-blue-400">AI-Powered Translation</p>
                <p className="text-blue-600 dark:text-blue-300 text-xs">
                  Our AI will convert your description into specific Meta targeting parameters including age, gender, interests, and behaviors.
                </p>
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
          <Button
            size="lg"
            onClick={handleGenerateParameters}
            disabled={!localDescription.trim() || isTranslating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isTranslating ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate Targeting Parameters'
            )}
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="icon-tile-muted">
                <Target className="h-4 w-4" />
              </div>
              <h3 className="font-semibold">Audience</h3>
            </div>
          </div>
          
          {isAIMode ? (
            /* AI Advantage+ Summary */
            <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
              <div className="flex items-center gap-2">
                <div className="icon-tile-muted"><Sparkles className="h-4 w-4 text-brand-blue" /></div>
                <div>
                  <p className="text-sm font-medium">AI Advantage+</p>
                  <p className="text-xs text-muted-foreground">AI will automatically optimize who sees your ad</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 text-status-green text-xs font-medium">
                <Check className="h-4 w-4" /> Enabled
              </div>
            </div>
          ) : (
            /* Manual Targeting Summary */
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
                <div className="flex items-center gap-2">
                  <div className="icon-tile-muted"><Target className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium">Manual Targeting</p>
                    <p className="text-xs text-muted-foreground">
                      {demographics?.gender && demographics.gender !== "all" ? demographics.gender.charAt(0).toUpperCase() + demographics.gender.slice(1) + ", " : ""}
                      Age {demographics?.ageMin}-{demographics?.ageMax}
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-status-green text-xs font-medium">
                  <Check className="h-4 w-4" /> Active
                </div>
              </div>
              
              {/* Show interests/behaviors count */}
              {(detailedTargeting?.interests && detailedTargeting.interests.length > 0) || 
               (detailedTargeting?.behaviors && detailedTargeting.behaviors.length > 0) ? (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30">
                  {detailedTargeting?.interests && detailedTargeting.interests.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {detailedTargeting.interests.length} Interest{detailedTargeting.interests.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {detailedTargeting?.behaviors && detailedTargeting.behaviors.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {detailedTargeting.behaviors.length} Behavior{detailedTargeting.behaviors.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              ) : null}
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

