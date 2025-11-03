"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card } from "@/components/ui/card"
import { MapPin, Users, FileText, ImageIcon, Check } from "lucide-react"

type TestVariable = "location" | "audience" | "ad_copy" | "creative"

interface ABTestCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  originalCampaign: {
    name: string
    targetLocation?: string
    audience?: string
    adCopy?: {
      headline: string
      description: string
      cta: string
    }
    creativeUrl?: string
  }
  onCreateTest: (testVariable: TestVariable, variantData: any) => void
}

export function ABTestCreator({ open, onOpenChange, originalCampaign, onCreateTest }: ABTestCreatorProps) {
  const [step, setStep] = useState<"select" | "configure">("select")
  const [selectedVariable, setSelectedVariable] = useState<TestVariable | null>(null)
  const [variantData, setVariantData] = useState<any>({})

  const testOptions = [
    {
      value: "location" as TestVariable,
      label: "Target Location",
      description: "Test different geographic regions",
      icon: MapPin,
      current: originalCampaign.targetLocation || "United States",
    },
    {
      value: "audience" as TestVariable,
      label: "Audience",
      description: "Test different demographics and interests",
      icon: Users,
      current: originalCampaign.audience || "Broad audience",
    },
    {
      value: "ad_copy" as TestVariable,
      label: "Ad Copy",
      description: "Test different headlines and descriptions",
      icon: FileText,
      current: originalCampaign.adCopy?.headline || "Current headline",
    },
    {
      value: "creative" as TestVariable,
      label: "Ad Creative",
      description: "Test different images or videos",
      icon: ImageIcon,
      current: "Current creative",
    },
  ]

  const handleSelectVariable = (variable: TestVariable) => {
    setSelectedVariable(variable)
    setStep("configure")
  }

  const handleCreateTest = () => {
    if (selectedVariable) {
      onCreateTest(selectedVariable, variantData)
      handleClose()
    }
  }

  const handleClose = () => {
    setStep("select")
    setSelectedVariable(null)
    setVariantData({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "select" ? "Create A/B Test" : "Configure Test Variant"}</DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Select what you want to test for this campaign"
              : `Set up your ${selectedVariable?.replace("_", " ")} variant`}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-3 py-4">
            {testOptions.map((option) => {
              const Icon = option.icon
              return (
                <Card
                  key={option.value}
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectVariable(option.value)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1">{option.label}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                      <div className="text-xs text-muted-foreground">
                        Current: <span className="font-medium">{option.current}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {step === "configure" && selectedVariable === "location" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location">Target Location</Label>
              <Input
                id="location"
                placeholder="e.g., California, New York, Texas"
                value={variantData.location || ""}
                onChange={(e) => setVariantData({ ...variantData, location: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Enter the geographic region you want to target</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius">Radius (optional)</Label>
              <Input
                id="radius"
                type="number"
                placeholder="e.g., 25 miles"
                value={variantData.radius || ""}
                onChange={(e) => setVariantData({ ...variantData, radius: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === "configure" && selectedVariable === "audience" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="age-range">Age Range</Label>
              <div className="flex gap-2">
                <Input
                  id="age-min"
                  type="number"
                  placeholder="Min"
                  value={variantData.ageMin || ""}
                  onChange={(e) => setVariantData({ ...variantData, ageMin: e.target.value })}
                />
                <Input
                  id="age-max"
                  type="number"
                  placeholder="Max"
                  value={variantData.ageMax || ""}
                  onChange={(e) => setVariantData({ ...variantData, ageMax: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interests">Interests</Label>
              <Input
                id="interests"
                placeholder="e.g., Fitness, Technology, Travel"
                value={variantData.interests || ""}
                onChange={(e) => setVariantData({ ...variantData, interests: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="behaviors">Behaviors</Label>
              <Input
                id="behaviors"
                placeholder="e.g., Online shoppers, Frequent travelers"
                value={variantData.behaviors || ""}
                onChange={(e) => setVariantData({ ...variantData, behaviors: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === "configure" && selectedVariable === "ad_copy" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                placeholder="Enter your ad headline"
                value={variantData.headline || ""}
                onChange={(e) => setVariantData({ ...variantData, headline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter your ad description"
                rows={3}
                value={variantData.description || ""}
                onChange={(e) => setVariantData({ ...variantData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta">Call to Action</Label>
              <Input
                id="cta"
                placeholder="e.g., Shop Now, Learn More, Sign Up"
                value={variantData.cta || ""}
                onChange={(e) => setVariantData({ ...variantData, cta: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === "configure" && selectedVariable === "creative" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="creative-url">Creative URL</Label>
              <Input
                id="creative-url"
                placeholder="https://example.com/image.jpg"
                value={variantData.creativeUrl || ""}
                onChange={(e) => setVariantData({ ...variantData, creativeUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Enter the URL of your image or video</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creative-type">Creative Type</Label>
              <RadioGroup
                value={variantData.creativeType || "image"}
                onValueChange={(value) => setVariantData({ ...variantData, creativeType: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="image" />
                  <Label htmlFor="image" className="font-normal">
                    Image
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="video" />
                  <Label htmlFor="video" className="font-normal">
                    Video
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="carousel" id="carousel" />
                  <Label htmlFor="carousel" className="font-normal">
                    Carousel
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          {step === "configure" && (
            <Button variant="outline" onClick={() => setStep("select")}>
              Back
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step === "configure" && (
              <Button onClick={handleCreateTest}>
                <Check className="mr-2 h-4 w-4" />
                Create Test
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
