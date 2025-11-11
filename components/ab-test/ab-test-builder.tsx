/**
 * Feature: A/B Test Builder
 * Purpose: Multi-step wizard for creating and configuring A/B tests
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 * 
 * NOTE: This is a simulated A/B test builder for UX demonstration
 * TODO: Wire in actual Meta API for real A/B testing functionality
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Check, Image, Type, MessageSquare, MousePointer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ABTest, ABTestType, AdVariant } from "@/lib/types/workspace"

export interface ABTestBuilderProps {
  campaign_id: string
  current_variant: AdVariant
  onCancel: () => void
  onComplete: (test: ABTest) => void
}

type Step = 1 | 2 | 3

export function ABTestBuilder({
  campaign_id,
  current_variant,
  onCancel,
  onComplete,
}: ABTestBuilderProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [testType, setTestType] = useState<ABTestType>('image')
  const [duration, setDuration] = useState(7)
  const [trafficSplit, setTrafficSplit] = useState(50)

  const steps = [
    { number: 1, title: 'Choose Test Type', isComplete: currentStep > 1 },
    { number: 2, title: 'Configure Variants', isComplete: currentStep > 2 },
    { number: 3, title: 'Review & Launch', isComplete: false },
  ]

  const testTypes = [
    {
      id: 'image' as const,
      label: 'Images',
      description: 'Test different creative images',
      icon: Image,
    },
    {
      id: 'headline' as const,
      label: 'Headlines',
      description: 'Test different ad headlines',
      icon: Type,
    },
    {
      id: 'ad_copy' as const,
      label: 'Ad Copy',
      description: 'Test different body text',
      icon: MessageSquare,
    },
    {
      id: 'cta' as const,
      label: 'Call-to-Action',
      description: 'Test different CTA buttons',
      icon: MousePointer,
    },
  ]

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const handleLaunch = () => {
    // Create mock A/B test
    const test: ABTest = {
      id: crypto.randomUUID(),
      campaign_id,
      test_type: testType,
      test_config: {
        duration_days: duration,
        traffic_split: trafficSplit,
        auto_declare_winner: true,
        confidence_level: 0.95,
      },
      variant_a_id: current_variant.id,
      variant_b_id: 'variant-b-mock', // TODO: Create actual variant B
      status: 'active',
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    onComplete(test)
  }

  return (
    <div className="flex flex-1 h-full flex-col p-6 overflow-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors",
                    currentStep === step.number &&
                      "border-blue-600 bg-blue-600 text-white",
                    currentStep > step.number &&
                      "border-green-600 bg-green-600 text-white",
                    currentStep < step.number &&
                      "border-muted-foreground/30 bg-muted text-muted-foreground"
                  )}
                >
                  {step.isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4",
                    currentStep > step.number ? "bg-green-600" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Choose Test Type */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What would you like to test?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testTypes.map((type) => {
                const Icon = type.icon
                const isSelected = testType === type.id

                return (
                  <button
                    key={type.id}
                    onClick={() => setTestType(type.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left",
                      isSelected
                        ? "border-blue-600 bg-blue-500/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{type.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </button>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure Variants */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Set up your variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Variant A (Current)</Label>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">{current_variant.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      50% traffic
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Variant B (New)</Label>
                  <div className="p-4 border rounded-lg bg-blue-500/5 border-blue-500/30">
                    <p className="text-sm font-medium">New Variant</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      50% traffic
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                    >
                      Configure Variant B →
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Test Duration (days)</Label>
                  <Select
                    value={duration.toString()}
                    onValueChange={(val) => setDuration(parseInt(val))}
                  >
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="split">Traffic Split</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-12">{trafficSplit}%</span>
                    <Input
                      id="split"
                      type="range"
                      min="30"
                      max="70"
                      value={trafficSplit}
                      onChange={(e) => setTrafficSplit(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm w-12">{100 - trafficSplit}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adjust how traffic is split between variants
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Launch */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Launch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Test Type</span>
                  <span className="font-medium">
                    {testTypes.find((t) => t.id === testType)?.label}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{duration} days</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Traffic Split</span>
                  <span className="font-medium">
                    {trafficSplit}% / {100 - trafficSplit}%
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Auto-select Winner</span>
                  <span className="font-medium">Yes</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-500/5 border border-amber-500/30">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Important</p>
                  <p className="text-sm text-muted-foreground">
                    Your current ad will be paused and replaced with this A/B test.
                    The test will run for {duration} days and automatically select
                    the winning variant.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={currentStep === 1 ? onCancel : handleBack}>
            {currentStep === 1 ? 'Cancel' : '← Back'}
          </Button>
          <div className="flex gap-2">
            {currentStep < 3 ? (
              <Button onClick={handleNext}>Continue →</Button>
            ) : (
              <Button
                onClick={handleLaunch}
                className="bg-gradient-to-r from-[#6C8CFF] via-[#5C7BFF] to-[#52E3FF] text-white hover:brightness-105"
              >
                🚀 Launch Test
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

