/**
 * Feature: Website URL Setup
 * Purpose: Configure website URL destination for website-visits goal campaigns
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { normalizeUrl } from "@/lib/utils/normalize-url"
import { Globe, CheckCircle2, AlertCircle } from "lucide-react"
import { useDestination } from "@/lib/context/destination-context"

interface WebsiteUrlSetupProps {
  initialUrl?: string
}

export function WebsiteUrlSetup({ initialUrl = '' }: WebsiteUrlSetupProps) {
  const { destinationState, setDestination } = useDestination()
  const [url, setUrl] = useState(initialUrl)
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  
  // Load existing destination data
  useEffect(() => {
    if (destinationState.data?.websiteUrl) {
      setUrl(destinationState.data.websiteUrl)
    }
  }, [destinationState.data?.websiteUrl])
  
  const handleSave = () => {
    setIsValidating(true)
    setError(null)
    
    try {
      const normalized = normalizeUrl(url)
      const urlObj = new URL(normalized)
      const displayUrl = urlObj.hostname.replace(/^www\./, '')
      
      setDestination({
        type: 'website_url',
        websiteUrl: normalized,
        displayLink: displayUrl,
      })
      
      setIsValidating(false)
    } catch (e) {
      setError('Please enter a valid URL (e.g., https://example.com)')
      setIsValidating(false)
    }
  }
  
  const isCompleted = destinationState.status === 'completed' && destinationState.data?.type === 'website_url'
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Website URL</CardTitle>
              <CardDescription>
                Enter the website URL where you want to direct traffic
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL *</Label>
            <Input
              id="website-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              placeholder="https://example.com/landing-page"
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            {isCompleted && !error && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Website URL configured</span>
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={!url.trim() || isValidating}
              className="w-full sm:w-auto"
            >
              {isValidating ? 'Validating...' : isCompleted ? 'Update Website URL' : 'Save Website URL'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

