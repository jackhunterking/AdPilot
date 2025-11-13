"use client"

/**
 * Feature: Destination Selection Canvas
 * Purpose: Display destination type options for lead generation (Instant Forms, Other Forms)
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Meta Login: https://developers.facebook.com/docs/facebook-login
 */

import { useState } from "react"
import { FileText, FormInput, Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"

interface DestinationSelectionCanvasProps {
  onInstantFormsSelected: () => void
  onMetaConnectionRequired: () => void
}

export function DestinationSelectionCanvas({
  onInstantFormsSelected,
  onMetaConnectionRequired,
}: DestinationSelectionCanvasProps) {
  const { metaStatus, refreshStatus } = useMetaConnection()
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)

  const handleInstantFormsClick = async () => {
    setIsCheckingConnection(true)
    
    // Refresh status from localStorage to ensure we have latest
    refreshStatus()
    
    // Small delay to allow refresh to complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Check if Meta is connected
    if (metaStatus === 'connected') {
      // User is already connected, proceed directly
      onInstantFormsSelected()
    } else {
      // User needs to connect Meta first
      onMetaConnectionRequired()
    }
    
    setIsCheckingConnection(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold">Choose Your Lead Collection Method</h2>
          <p className="text-muted-foreground text-lg">
            Select how you want to collect leads from your ads
          </p>
        </div>

        {/* Destination Cards */}
        <div className="grid grid-cols-2 gap-8">
          {/* Instant Forms Card */}
          <button
            onClick={handleInstantFormsClick}
            disabled={isCheckingConnection}
            className={cn(
              "group relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all duration-300",
              "hover:border-blue-500 hover:bg-blue-500/5 hover:shadow-lg",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "border-border bg-card"
            )}
          >
            {/* Icon */}
            <div className="h-20 w-20 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-6">
              <Facebook className="h-10 w-10 text-blue-600" />
            </div>

            {/* Content */}
            <div className="text-center space-y-3 flex-1 flex flex-col justify-start mb-6">
              <h3 className="text-xl font-semibold">Instant Forms</h3>
              <p className="text-sm text-muted-foreground px-4">
                Leads collected directly inside Facebook and Instagram
              </p>
            </div>

            {/* Button */}
            <Button
              size="lg"
              disabled={isCheckingConnection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 pointer-events-none"
            >
              {isCheckingConnection ? 'Checking...' : 'Select'}
            </Button>

            {/* Recommended Badge */}
            <Badge className="absolute top-4 right-4 bg-green-600 text-white">
              Recommended
            </Badge>
          </button>

          {/* Other Forms Card - Coming Soon */}
          <div
            className={cn(
              "relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all duration-300",
              "border-border bg-card opacity-60 cursor-not-allowed"
            )}
          >
            {/* Icon */}
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <FormInput className="h-10 w-10 text-muted-foreground" />
            </div>

            {/* Content */}
            <div className="text-center space-y-3 flex-1 flex flex-col justify-start mb-6">
              <h3 className="text-xl font-semibold text-muted-foreground">Other Forms</h3>
              <p className="text-sm text-muted-foreground px-4">
                Additional form collection methods
              </p>
            </div>

            {/* Button */}
            <Button
              size="lg"
              disabled
              variant="outline"
              className="px-8 pointer-events-none"
            >
              Coming Soon
            </Button>

            {/* Coming Soon Badge */}
            <Badge className="absolute top-4 right-4 bg-orange-500 text-white">
              Coming Soon
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

